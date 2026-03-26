import type {
  BallEntry,
  OverCount,
  PageType,
  SelectionState,
} from "../../../common/types";

export const EMPTY_SELECTIONS: SelectionState = {
  bowler: "",
  keeper: "",
  delivery: "",
  take: "",
  collection: "",
  error: "",
  throwIn: "",
};

export const countValidBalls = (balls: BallEntry[]): number =>
  balls.filter((ball) => !ball.extraType).length;

export const getNextOverCount = (
  currentOver: number,
  currentOverBalls: BallEntry[]
): OverCount => ({
  over: currentOver,
  ball: countValidBalls(currentOverBalls) + 1,
});

export const getVisiblePagesFor = (
  selectionState: SelectionState
): PageType[] => {
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

export const getResumeStepIndex = (selectionState: SelectionState): number => {
  const visiblePages = getVisiblePagesFor(selectionState);
  if (selectionState.keeper) {
    const deliveryIndex = visiblePages.indexOf("delivery");
    return deliveryIndex === -1 ? 0 : deliveryIndex;
  }

  const keeperIndex = visiblePages.indexOf("keeper");
  return keeperIndex === -1 ? 0 : keeperIndex;
};

const getCarriedSelections = (
  selectionState: SelectionState
): SelectionState => ({
  ...EMPTY_SELECTIONS,
  bowler: selectionState.bowler,
  keeper: selectionState.keeper,
});

export const deriveRefreshStateFromEntries = (entries: BallEntry[]) => {
  if (entries.length === 0) {
    return {
      currentOver: 0,
      currentOverBalls: [] as BallEntry[],
      selections: EMPTY_SELECTIONS,
      currentStepIndex: 0,
      shouldResetExtraType: true,
    };
  }

  const lastEntry = entries[entries.length - 1];
  const lastOverNum = lastEntry.overCount.over;
  const ballsInLastOver = entries.filter(
    (entry) => entry.overCount.over === lastOverNum
  );
  const validBalls = countValidBalls(ballsInLastOver);

  if (validBalls >= 6) {
    return {
      currentOver: lastOverNum + 1,
      currentOverBalls: [] as BallEntry[],
      selections: EMPTY_SELECTIONS,
      currentStepIndex: 0,
      shouldResetExtraType: false,
    };
  }

  const carriedSelections = getCarriedSelections({
    ...EMPTY_SELECTIONS,
    bowler: lastEntry.bowlerType,
    keeper: lastEntry.wkPosition || "",
  });

  return {
    currentOver: lastOverNum,
    currentOverBalls: ballsInLastOver,
    selections: carriedSelections,
    currentStepIndex: getResumeStepIndex(carriedSelections),
    shouldResetExtraType: false,
  };
};

export const derivePostSubmitState = (params: {
  currentOver: number;
  currentOverBalls: BallEntry[];
  newEntry: BallEntry;
  submissionSelections: SelectionState;
}) => {
  const { currentOver, currentOverBalls, newEntry, submissionSelections } =
    params;

  const updatedBalls = [...currentOverBalls, newEntry];
  const validBalls = countValidBalls(updatedBalls);

  if (validBalls >= 6) {
    return {
      currentOver: currentOver + 1,
      currentOverBalls: [] as BallEntry[],
      selections: EMPTY_SELECTIONS,
      currentStepIndex: 0,
    };
  }

  const carriedSelections = getCarriedSelections(submissionSelections);
  return {
    currentOver,
    currentOverBalls: updatedBalls,
    selections: carriedSelections,
    currentStepIndex: getResumeStepIndex(carriedSelections),
  };
};

export const parseMatchFromSearch = (
  search: string
): { date: string; number: number } | null => {
  const params = new URLSearchParams(search);
  const match = params.get("match");
  if (!match) return null;
  const parts = match.match(/^(\d{4}-\d{2}-\d{2})-(\d+)$/);
  if (!parts) return null;
  return { date: parts[1], number: parseInt(parts[2], 10) };
};

export const formatMatchDisplay = (
  dateStr: string,
  matchNum: number,
  fallbackMatchId: string
): string => {
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
    return fallbackMatchId;
  }
};

export const buildQuickNoTouchSelections = (
  selections: SelectionState
): SelectionState => ({
  ...selections,
  take: "No touch",
  collection: "",
  error: "",
  throwIn: "No touch",
});

export const buildSkipToThrowInSelections = (
  selections: SelectionState
): SelectionState => ({
  ...selections,
  take: "No touch",
  collection: "",
  error: "",
  throwIn: "",
});

export const getCurrentOverCount = (
  currentOver: number,
  currentOverBalls: BallEntry[]
): OverCount => ({
  over: currentOver,
  ball: countValidBalls(currentOverBalls) + 1,
});
