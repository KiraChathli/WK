
import { useEffect, useState } from "react";
import { initGoogleClient, logBallToSheet, readBallData, signIn, signOut } from "../api/sheets";
import type { BallEntry, OverCount, PageType, SelectionState } from "../../../common/types";
import { selectionStateToBallEntry } from "../utils";

const EMPTY_SELECTIONS: SelectionState = {
  bowler: "",
  delivery: "",
  take: "",
  collection: "",
  error: "",
  throwIn: "",
};

// TODO: handle no-balls
const getNextOverCount = (current: OverCount): OverCount => {
  let { over, ball } = current;
  if (ball >= 6) {
    over += 1;
    ball = 1;
  } else {
    ball += 1;
  }
  return { over, ball };
};

export const useTracker = () => {
  const [selections, setSelections] = useState<SelectionState>(EMPTY_SELECTIONS);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; variant: "success" | "danger" }>({
    show: false,
    message: "",
    variant: "success",
  });

  // Tracking State
  const [lastOverCount, setLastOverCount] = useState<OverCount>({ over: 0, ball: 0 });

  // Navigation State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lastUpdatedPage, setLastUpdatedPage] = useState<PageType | null>(null);

  // Match State
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [matchNumber, setMatchNumber] = useState(1);
  const [isMatchSelected, setIsMatchSelected] = useState(false);

  const matchId = `${matchDate} - Match ${matchNumber}`;

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

  useEffect(() => {
    if (isSignedIn && isMatchSelected) {
      // Fetch data for the selected match
      readBallData(matchId).then((entries) => {
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          // Ensure we have a valid position
          if (lastEntry.overCount) {
            setLastOverCount(lastEntry.overCount);

            // Pre-select bowler if we are continuing an over
            const nextCnt = getNextOverCount(lastEntry.overCount);
            if (nextCnt.ball > 1 && lastEntry.bowlerType) {
              setSelections((prev) => ({ ...prev, bowler: lastEntry.bowlerType }));
              setCurrentStepIndex(1); // Skip bowler selection
            }
          }
        } else {
             // New match or empty sheet, reset counters
             setLastOverCount({ over: 0, ball: 0 });
             setSelections(EMPTY_SELECTIONS);
             setCurrentStepIndex(0);
        }
      }).catch(console.error);
    }
  }, [isSignedIn, isMatchSelected, matchId]);

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
      setIsMatchSelected(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const nextOverCount = getNextOverCount(lastOverCount);
    const newEntry: BallEntry = selectionStateToBallEntry(selections, nextOverCount);

    console.log("Logging ball entry", newEntry);

    try {
      await logBallToSheet(newEntry, matchId);

      // Determine next state
      const futureOverCount = getNextOverCount(nextOverCount);
      const isSameOver = futureOverCount.ball > 1;

      if (isSameOver) {
        // Keep bowler, reset others
        setSelections({ ...EMPTY_SELECTIONS, bowler: selections.bowler });
        setCurrentStepIndex(1); // Skip bowler selection
      } else {
        setSelections({ ...EMPTY_SELECTIONS }); // Reset all
        setCurrentStepIndex(0); // Start from beginning
      }

      setLastOverCount(nextOverCount); // Update local state
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
      isSignedIn,
      toast,
      isSubmitting,
      currentStepIndex,
      visiblePages,
      isSummary,
      currentOverCount: getNextOverCount(lastOverCount),
      // Match State
      isMatchSelected,
      matchDisplayName,
      matchId,
      matchDate,
      matchNumber
    },
    actions: {
      setSelections,
      setLastUpdatedPage,
      goToStep,
      handleSubmit,
      handleLogout,
      signIn,
      hideToast: () => setToast((prev) => ({ ...prev, show: false })),
      setMatchParams,
      setIsMatchSelected
    }
  };
};
