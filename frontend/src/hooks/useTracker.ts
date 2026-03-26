import { useEffect, useState } from "react";
import {
  initGoogleClient,
  listSheetNames,
  logBallToSheet,
  readBallData,
  signIn,
  signOut,
} from "../api/sheets";
import type { BallEntry, ExtraType, PageType, SelectionState } from "../../../common/types";
import { SAMPLE_DATA_PREFIX } from "../../../common/consts";
import { getLocalIsoDate, selectionStateToBallEntry } from "../utils";

const EMPTY_SELECTIONS: SelectionState = {
  bowler: "",
  keeper: "",
  delivery: "",
  take: "",
  collection: "",
  error: "",
  throwIn: "",
};

const getVisiblePagesFor = (selectionState: SelectionState): PageType[] => {
  const pages: PageType[] = ["bowler", "keeper", "delivery", "take"];

  if (
    selectionState.take === "Clean take" ||
    selectionState.take === "Catch" ||
    selectionState.take === "Stumping"
  ) {
    pages.push("collection");
  } else if (selectionState.take && selectionState.take !== "No touch") {
    pages.push("error");
  }

  pages.push("throwIn");
  return pages;
};

const getResumeStepIndex = (selectionState: SelectionState): number => {
  const visiblePages = getVisiblePagesFor(selectionState);
  if (selectionState.keeper) {
    const deliveryIndex = visiblePages.indexOf("delivery");
    return deliveryIndex === -1 ? 0 : deliveryIndex;
  }

  const keeperIndex = visiblePages.indexOf("keeper");
  return keeperIndex === -1 ? 0 : keeperIndex;
};

/** Parse ?match=YYYY-MM-DD-N from the URL */
const getMatchFromUrl = (): { date: string; number: number } | null => {
  const params = new URLSearchParams(window.location.search);
  const match = params.get("match");
  if (!match) return null;
  const parts = match.match(/^(\d{4}-\d{2}-\d{2})-(\d+)$/);
  if (!parts) return null;
  return { date: parts[1], number: parseInt(parts[2], 10) };
};

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
  const urlMatch = getMatchFromUrl();
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

  const formatMatchDisplay = (dateStr: string, matchNum: number) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.toLocaleString("default", { month: "short" });

      const getOrdinalSuffix = (dayNum: number) => {
        const suffixes = ["th", "st", "nd", "rd"];
        const value = dayNum % 100;
        return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
      };

      return `${day}${getOrdinalSuffix(day)} ${month} - Match ${matchNum}`;
    } catch {
      return matchId;
    }
  };

  const matchDisplayName = formatMatchDisplay(matchDate, matchNumber);

  useEffect(() => {
    initGoogleClient(setIsSignedIn);
  }, []);

  // Resolve the actual sheet name (real vs sample) when match is selected
  useEffect(() => {
    if (!isSignedIn || !isMatchSelected) return;

    const realName = baseMatchId;
    const sampleName = `${SAMPLE_DATA_PREFIX} ${baseMatchId}`;

    listSheetNames()
      .then((names) => {
        if (names.includes(realName)) {
          setResolvedMatchId(realName);
          setIsSampleMatch(false);
          setHasUnconfirmedInitialUrlMatch(false);
          return;
        }

        if (names.includes(sampleName)) {
          setResolvedMatchId(sampleName);
          setIsSampleMatch(true);
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
  }, [isSignedIn, isMatchSelected, baseMatchId, hasUnconfirmedInitialUrlMatch]);

  const refreshBallData = async () => {
    if (!isSignedIn || !isMatchSelected || !resolvedMatchId) return;

    try {
      const entries = await readBallData(resolvedMatchId);
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.overCount) {
          const lastOverNum = lastEntry.overCount.over;
          const ballsInLastOver = entries.filter((entry) => entry.overCount.over === lastOverNum);
          const validBalls = ballsInLastOver.filter((ball) => !ball.extraType).length;

          if (validBalls >= 6) {
            setCurrentOver(lastOverNum + 1);
            setCurrentOverBalls([]);
            setSelections(EMPTY_SELECTIONS);
            setCurrentStepIndex(0);
          } else {
            setCurrentOver(lastOverNum);
            setCurrentOverBalls(ballsInLastOver);

            const carriedSelections: SelectionState = {
              ...EMPTY_SELECTIONS,
              bowler: lastEntry.bowlerType,
              keeper: lastEntry.wkPosition || "",
            };

            setSelections(carriedSelections);
            setCurrentStepIndex(getResumeStepIndex(carriedSelections));
          }
        }
      } else {
        setCurrentOver(0);
        setCurrentOverBalls([]);
        setSelections(EMPTY_SELECTIONS);
        setCurrentStepIndex(0);
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

    const nextOverCount = {
      over: currentOver,
      ball: currentOverBalls.filter((ball) => !ball.extraType).length + 1,
    };

    const newEntry: BallEntry = selectionStateToBallEntry(
      submissionSelections,
      nextOverCount,
      submissionExtraType
    );

    try {
      await logBallToSheet(newEntry, matchId);

      const updatedBalls = [...currentOverBalls, newEntry];
      const validBalls = updatedBalls.filter((ball) => !ball.extraType).length;

      if (validBalls >= 6) {
        setCurrentOver(currentOver + 1);
        setCurrentOverBalls([]);
        setSelections({ ...EMPTY_SELECTIONS });
        setCurrentStepIndex(0);
      } else {
        setCurrentOverBalls(updatedBalls);
        const carriedSelections: SelectionState = {
          ...EMPTY_SELECTIONS,
          bowler: submissionSelections.bowler,
          keeper: submissionSelections.keeper,
        };
        setSelections(carriedSelections);
        setCurrentStepIndex(getResumeStepIndex(carriedSelections));
      }

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
    const nextSelections: SelectionState = {
      ...selections,
      take: "No touch",
      collection: "",
      error: "",
      throwIn: "",
    };

    setSelections(nextSelections);
    const throwInIndex = getVisiblePagesFor(nextSelections).indexOf("throwIn");
    if (throwInIndex !== -1) {
      setCurrentStepIndex(throwInIndex);
    }
    setLastUpdatedPage(null);
  };

  const handleQuickNoTouchSubmit = async () => {
    const quickSelections: SelectionState = {
      ...selections,
      take: "No touch",
      collection: "",
      error: "",
      throwIn: "No touch",
    };

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
      currentOverCount: {
        over: currentOver,
        ball: currentOverBalls.filter((ball) => !ball.extraType).length + 1,
      },
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
