
import { useEffect, useState } from "react";
import { initGoogleClient, listSheetNames, logBallToSheet, readBallData, signIn, signOut } from "../api/sheets";
import type { BallEntry, PageType, SelectionState, ExtraType } from "../../../common/types";
import { SAMPLE_DATA_PREFIX } from "../../../common/consts";
import { selectionStateToBallEntry } from "../utils";

const EMPTY_SELECTIONS: SelectionState = {
  bowler: "",
  delivery: "",
  take: "",
  collection: "",
  error: "",
  throwIn: "",
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
const setMatchUrlParam = (date: string, number: number) => {
  const url = new URL(window.location.href);
  url.searchParams.set("match", `${date}-${number}`);
  window.history.replaceState({}, "", url.toString());
};

const clearMatchUrlParam = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("match");
  window.history.replaceState({}, "", url.toString());
};

export const useTracker = () => {
  const urlMatch = getMatchFromUrl();

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

  // Match State — initialise from URL param if present
  const [matchDate, setMatchDate] = useState(() => urlMatch?.date ?? new Date().toISOString().split("T")[0]);
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
      const month = date.toLocaleString('default', { month: 'short' });

      const getOrdinalSuffix = (day: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = day % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
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
        } else if (names.includes(sampleName)) {
          setResolvedMatchId(sampleName);
          setIsSampleMatch(true);
        } else {
          // Neither exists — new match (will be created as real)
          setResolvedMatchId(realName);
          setIsSampleMatch(false);
        }
      })
      .catch((err) => {
        console.error("Error resolving sheet name:", err);
        setResolvedMatchId(realName);
        setIsSampleMatch(false);
      });
  }, [isSignedIn, isMatchSelected, baseMatchId]);

  const refreshBallData = async () => {
    if (!isSignedIn || !isMatchSelected || !resolvedMatchId) return;
    try {
      const entries = await readBallData(resolvedMatchId);
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.overCount) {
          const lastOverNum = lastEntry.overCount.over;
          const ballsInLastOver = entries.filter(e => e.overCount.over === lastOverNum);
          const validBalls = ballsInLastOver.filter(b => !b.extraType).length;

          if (validBalls >= 6) {
            setCurrentOver(lastOverNum + 1);
            setCurrentOverBalls([]);
            setSelections(EMPTY_SELECTIONS);
            setCurrentStepIndex(0);
          } else {
            setCurrentOver(lastOverNum);
            setCurrentOverBalls(ballsInLastOver);
            setSelections((prev) => ({ ...prev, bowler: lastEntry.bowlerType }));
            setCurrentStepIndex(1);
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

  // Determine which pages to show based on take result
  const getVisiblePages = (): PageType[] => {
    const takeSelection = selections.take;
    const pages: PageType[] = ["bowler", "delivery", "take"];

    if (
      takeSelection === "Clean take" ||
      takeSelection === "Catch" ||
      takeSelection === "Stumping"
    ) {
      pages.push("collection");
    } else if (takeSelection && takeSelection != "No touch") {
      pages.push("error");
    }
    pages.push("throwIn");

    return pages;
  };

  const visiblePages = getVisiblePages();
  const isSummary = currentStepIndex === visiblePages.length;

  // Auto-advance after selection is made
  useEffect(() => {
    if (!lastUpdatedPage) return;

    const newVisiblePages = getVisiblePages();
    const currentIndex = newVisiblePages.indexOf(lastUpdatedPage);

    if (currentIndex !== -1 && currentIndex < newVisiblePages.length) {
      // Advance to next page (or summary)
      setCurrentStepIndex(currentIndex + 1);
    }

    setLastUpdatedPage(null);
  }, [selections, lastUpdatedPage]);

  // Ensure current step index is valid after pages change
  useEffect(() => {
    const newVisiblePages = getVisiblePages();
    if (selections.bowler === "") {
      setCurrentStepIndex(0);
      setLastUpdatedPage(null);
    } else if (currentStepIndex > newVisiblePages.length) {
       // Cap at length (Summary page)
      setCurrentStepIndex(Math.max(0, newVisiblePages.length));
    }
  }, [selections.bowler, selections.take, visiblePages.length]);

  const goToStep = (index: number) => {
    if (index >= 0 && index <= visiblePages.length) {
      setCurrentStepIndex(index);
    }
  };

  const setMatchParams = (date: string, number: number) => {
      setMatchDate(date);
      setMatchNumber(number);
      setResolvedMatchId(null); // Reset so resolution re-runs
      setIsSampleMatch(false);
      setIsMatchSelected(true);
      setMatchUrlParam(date, number);
  };

  const handleSetIsMatchSelected = (selected: boolean) => {
      setIsMatchSelected(selected);
      if (!selected) clearMatchUrlParam();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const nextOverCount = { over: currentOver, ball: currentOverBalls.filter(b => !b.extraType).length + 1 };
    const newEntry: BallEntry = selectionStateToBallEntry(selections, nextOverCount, extraType);

    console.log("Logging ball entry", newEntry);

    try {
      await logBallToSheet(newEntry, matchId);

      const updatedBalls = [...currentOverBalls, newEntry];
      const validBalls = updatedBalls.filter(b => !b.extraType).length;

      if (validBalls >= 6) {
        // Start next over
        setCurrentOver(currentOver + 1);
        setCurrentOverBalls([]);
        setSelections({ ...EMPTY_SELECTIONS });
        setCurrentStepIndex(0);
        setExtraType(undefined);
      } else {
        // Continue over
        setCurrentOverBalls(updatedBalls);
        setSelections({ ...EMPTY_SELECTIONS, bowler: selections.bowler });
        setCurrentStepIndex(1);
        setExtraType(undefined);
      }

      setToast({ show: true, message: "Entry saved successfully!", variant: "success" });
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: "Failed to save entry. Please try again.", variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
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
      currentOverCount: { over: currentOver, ball: currentOverBalls.filter(b => !b.extraType).length + 1 },
      // Match State
      isMatchSelected,
      isMatchReady: isMatchSelected && resolvedMatchId !== null,
      matchDisplayName,
      matchId,
      matchDate,
      matchNumber,
      isSampleMatch
    },
    actions: {
      setSelections,
      setExtraType,
      setLastUpdatedPage,
      goToStep,
      handleSubmit,
      handleLogout,
      signIn,
      hideToast: () => setToast((prev) => ({ ...prev, show: false })),
      setMatchParams,
      setIsMatchSelected: handleSetIsMatchSelected,
      refreshBallData
    }
  };
};
