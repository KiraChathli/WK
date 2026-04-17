import { useEffect, useState } from "react";
import {
  initGoogleClient,
  listMatches,
  logBallToSheet,
  readBallData,
  signIn,
  signOut,
} from "../api/sheets";
import type { BallEntry, ExtraType, PageType, SelectionState } from "../../../common/types";
import { getLocalIsoDate, selectionStateToBallEntry } from "../utils";
import {
  EMPTY_SELECTIONS,
  buildQuickNoTouchSelections,
  buildSkipToThrowInSelections,
  derivePostSubmitState,
  deriveRefreshStateFromEntries,
  formatMatchDisplay,
  getCurrentOverCount,
  getNextOverCount,
  getVisiblePagesFor,
  parseMatchFromSearch,
  resolveMatchSheetName,
} from "./trackerLogic";

/** Write or clear the ?match= query param without a full navigation */
const dispatchLocationUpdate = () => {
  if (typeof window.PopStateEvent === "function") {
    window.dispatchEvent(new PopStateEvent("popstate"));
    return;
  }

  window.dispatchEvent(new Event("popstate"));
};

const setMatchUrlParam = (date: string, number: number) => {
  const url = new URL(window.location.href);
  url.searchParams.delete("match");
  url.searchParams.set("match", `${date}-${number}`);
  window.history.replaceState({}, "", url.toString());
  dispatchLocationUpdate();
};

const clearMatchUrlParam = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("match");
  window.history.replaceState({}, "", url.toString());
  dispatchLocationUpdate();
};

export const useTracker = () => {
  const urlMatch = parseMatchFromSearch(window.location.search);
  const [hasUnconfirmedInitialUrlMatch, setHasUnconfirmedInitialUrlMatch] = useState(!!urlMatch);

  const [selections, setSelections] = useState<SelectionState>(EMPTY_SELECTIONS);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: "success" | "danger" }>({
    show: false,
    message: "",
    variant: "success",
  });

  // Tracking State
  const [currentOver, setCurrentOver] = useState(0);
  const [currentOverBalls, setCurrentOverBalls] = useState<BallEntry[]>([]);
  const [extraType, setExtraType] = useState<ExtraType | undefined>(undefined);

  // Navigation State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lastUpdatedPage, setLastUpdatedPage] = useState<PageType | null>(null);

  // Match State - initialize from URL param if present
  const [matchDate, setMatchDate] = useState(() => urlMatch?.date ?? getLocalIsoDate());
  const [matchNumber, setMatchNumber] = useState(() => urlMatch?.number ?? 1);
  const [isMatchSelected, setIsMatchSelected] = useState(!!urlMatch);
  const [resolvedMatchId, setResolvedMatchId] = useState<string | null>(null);
  const [isSampleMatch, setIsSampleMatch] = useState(false);

  const baseMatchId = `${matchDate} - Match ${matchNumber}`;
  const matchId = resolvedMatchId || baseMatchId;
  const matchDisplayName = formatMatchDisplay(matchDate, matchNumber, matchId);

  useEffect(() => {
    initGoogleClient(setIsSignedIn);
  }, []);

  // Resolve the actual sheet name (real vs sample) when match is selected
  useEffect(() => {
    if (!isSignedIn || !isMatchSelected) return;

    const realName = baseMatchId;

    listMatches()
      .then((matches) => {
        const resolved = resolveMatchSheetName(matches, matchDate, matchNumber);
        if (resolved) {
          setResolvedMatchId(resolved.sheetName);
          setIsSampleMatch(resolved.isSample);
          setHasUnconfirmedInitialUrlMatch(false);
          return;
        }

        setResolvedMatchId(realName);
        setIsSampleMatch(false);
        if (hasUnconfirmedInitialUrlMatch) {
          setHasUnconfirmedInitialUrlMatch(false);
          setIsMatchSelected(false);
        }
      })
      .catch((err) => {
        console.error("Error resolving sheet name:", err);
        setResolvedMatchId(realName);
        setIsSampleMatch(false);
      });
  }, [
    isSignedIn,
    isMatchSelected,
    baseMatchId,
    matchDate,
    matchNumber,
    hasUnconfirmedInitialUrlMatch,
  ]);

  const refreshBallData = async () => {
    if (!isSignedIn || !isMatchSelected || !resolvedMatchId) return;

    try {
      const entries = await readBallData(resolvedMatchId);
      const refreshedState = deriveRefreshStateFromEntries(entries);
      setCurrentOver(refreshedState.currentOver);
      setCurrentOverBalls(refreshedState.currentOverBalls);
      setSelections(refreshedState.selections);
      setCurrentStepIndex(refreshedState.currentStepIndex);
      if (refreshedState.shouldResetExtraType) {
        setExtraType(undefined);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshBallData();
  }, [isSignedIn, isMatchSelected, resolvedMatchId]);

  const visiblePages = getVisiblePagesFor(selections);
  const isSummary = currentStepIndex === visiblePages.length;

  // Auto-advance after selection is made
  useEffect(() => {
    if (!lastUpdatedPage) return;

    const newVisiblePages = getVisiblePagesFor(selections);
    const currentIndex = newVisiblePages.indexOf(lastUpdatedPage);

    if (currentIndex !== -1 && currentIndex < newVisiblePages.length) {
      setCurrentStepIndex(currentIndex + 1);
    }

    setLastUpdatedPage(null);
  }, [selections, lastUpdatedPage]);

  // Ensure current step index is valid after pages change
  useEffect(() => {
    const newVisiblePages = getVisiblePagesFor(selections);
    if (selections.bowler === "") {
      setCurrentStepIndex(0);
      setLastUpdatedPage(null);
    } else if (selections.keeper === "" && currentStepIndex > 1) {
      setCurrentStepIndex(1);
      setLastUpdatedPage(null);
    } else if (currentStepIndex > newVisiblePages.length) {
      setCurrentStepIndex(Math.max(0, newVisiblePages.length));
    }
  }, [selections.bowler, selections.keeper, selections.take, currentStepIndex]);

  const goToStep = (index: number) => {
    if (index >= 0 && index <= visiblePages.length) {
      setCurrentStepIndex(index);
    }
  };

  const setMatchParams = (date: string, number: number) => {
    setMatchDate(date);
    setMatchNumber(number);
    setHasUnconfirmedInitialUrlMatch(false);
    setResolvedMatchId(null);
    setIsSampleMatch(false);
    setIsMatchSelected(true);
    setMatchUrlParam(date, number);
  };

  const handleSetIsMatchSelected = (selected: boolean) => {
    setIsMatchSelected(selected);
    if (!selected) {
      setHasUnconfirmedInitialUrlMatch(false);
      clearMatchUrlParam();
    }
  };

  const submitEntry = async (
    submissionSelections: SelectionState,
    submissionExtraType?: ExtraType
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const nextOverCount = getNextOverCount(currentOver, currentOverBalls);

    const newEntry: BallEntry = selectionStateToBallEntry(
      submissionSelections,
      nextOverCount,
      submissionExtraType
    );

    try {
      await logBallToSheet(newEntry, matchId);
      const postSubmitState = derivePostSubmitState({
        currentOver,
        currentOverBalls,
        newEntry,
        submissionSelections,
      });
      setCurrentOver(postSubmitState.currentOver);
      setCurrentOverBalls(postSubmitState.currentOverBalls);
      setSelections(postSubmitState.selections);
      setCurrentStepIndex(postSubmitState.currentStepIndex);

      setExtraType(undefined);
      setToast({ show: true, message: "Entry saved successfully!", variant: "success" });
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: "Failed to save entry. Please try again.", variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    await submitEntry(selections, extraType);
  };

  const handleSkipToThrowIn = () => {
    const nextSelections = buildSkipToThrowInSelections(selections);

    setSelections(nextSelections);
    const throwInIndex = getVisiblePagesFor(nextSelections).indexOf("throwIn");
    if (throwInIndex !== -1) {
      setCurrentStepIndex(throwInIndex);
    }
    setLastUpdatedPage(null);
  };

  const handleQuickNoTouchSubmit = async () => {
    const quickSelections = buildQuickNoTouchSelections(selections);
    await submitEntry(quickSelections, undefined);
  };

  const handleLogout = () => {
    signOut();
    setIsSignedIn(false);
  };

  return {
    state: {
      selections,
      extraType,
      currentOverBalls,
      isSignedIn,
      toast,
      isSubmitting,
      currentStepIndex,
      visiblePages,
      isSummary,
      currentOverCount: getCurrentOverCount(currentOver, currentOverBalls),
      isMatchSelected,
      isMatchReady: isMatchSelected && resolvedMatchId !== null,
      matchDisplayName,
      matchId,
      matchDate,
      matchNumber,
      isSampleMatch,
    },
    actions: {
      setSelections,
      setExtraType,
      setLastUpdatedPage,
      goToStep,
      handleSubmit,
      handleSkipToThrowIn,
      handleQuickNoTouchSubmit,
      handleLogout,
      signIn,
      hideToast: () => setToast((prev) => ({ ...prev, show: false })),
      setMatchParams,
      setIsMatchSelected: handleSetIsMatchSelected,
      refreshBallData,
    },
  };
};
