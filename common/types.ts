// 1. Bowler and Keeper
export const bowlerTypes = [
  "RA seam",
  "LA seam",
  "RA leg spin",
  "RA off spin",
  "LA leg spin",
  "LA off spin",
] as const;
export type BowlerType = (typeof bowlerTypes)[number];

export const wkPositions = ["Up", "Back"] as const;
export type WkPosition = (typeof wkPositions)[number];

// 2. Delivery Positions (the 3x3 grid)
export const deliveryPositions = [
  "High Off Side",
  "High Straight",
  "High Leg Side",
  "Waist Off Side",
  "Waist Straight",
  "Waist Leg Side",
  "Low Off Side",
  "Low Straight",
  "Low Leg Side",
] as const;
export type DeliveryPosition = (typeof deliveryPositions)[number];

// 3. Take Results
export const takeResults = [
  "Clean take",
  "Catch",
  "Stumping",
  "Fumble stop",
  "Miss",
  "Missed catch",
  "Missed stumping",
  "No touch",
] as const;
export type TakeResult = (typeof takeResults)[number];

export const successfulTakeResults = [
  "Clean take",
  "Catch",
  "Stumping",
] as const;
export type SuccessfulTakeResult = (typeof successfulTakeResults)[number];

// 4. Outcome Details (difficulty and reasons)
export const collectionDifficulties = ["Regulation", "Difficult"] as const;
export type CollectionDifficulty = (typeof collectionDifficulties)[number];

export const errorReasons = [
  "Difficult stop",
  "Blocked vision",
  "Deviation",
  "Didn't carry",
  "Technical error",
  "Unknown",
] as const;
export type ErrorReason = (typeof errorReasons)[number];

// 5. Throw-ins
export const throwInResults = [
  "Clean",
  "Fumble stop",
  "Miss",
  "Missed run out",
  "No touch",
] as const;
export type ThrowInResult = (typeof throwInResults)[number];

export const successfulThrowInResults = ["Clean"] as const;
export type SuccessfulThrowInResult = (typeof successfulThrowInResults)[number];

export const extraTypes = ["Wide", "No ball"] as const;
export type ExtraType = (typeof extraTypes)[number];

export const SHEET_HEADERS = [
  "Timestamp",
  "Over",
  "Ball",
  "Bowler",
  "WK Position",
  "Delivery",
  "Take",
  "Collection Difficulty",
  "Error Reason",
  "Throw In",
  "Extra",
] as const;

export type OverCount = {
  over: number;
  ball: number;
};

export type BallEntry = {
  timestamp: Date;
  overCount: OverCount;
  bowlerType: BowlerType;
  wkPosition: WkPosition | undefined;
  deliveryPosition: DeliveryPosition | undefined;
  takeResult: TakeResult;
  collectionDifficulty: CollectionDifficulty | undefined;
  errorReason: ErrorReason | undefined;
  throwInResult: ThrowInResult | undefined;
  extraType: ExtraType | undefined;
};

export type PageType =
  | "bowler"
  | "keeper"
  | "delivery"
  | "take"
  | "collection"
  | "error"
  | "throwIn";

export type SelectionState = {
  [K in PageType]: string;
};

export interface MatchInfo {
  [key: string]: string;
}

export interface MatchStats {
  [key: string]: string;
}

export interface SheetMetadata {
  info: MatchInfo;
  stats: MatchStats;
  statSections: MatchStatsComputed;
}

export type MatchStatItem = {
  label: string;
  value: string;
  numericValue: number;
  suffix?: string;
};

export type MatchStatSection = {
  title: string;
  colorClass: string;
  icon: string;
  stats: MatchStatItem[];
};

export type MatchStatsComputed = MatchStatSection[];

export type MatchAggregateData = {
  sheetName: string;
  date: string;
  matchNumber: number;
  stats: MatchStats;
  balls: BallEntry[];
};

export type MatchRangeOption = "current" | 5 | 10 | 20 | "all";
export type AggregateRangeOption = Exclude<MatchRangeOption, "current">;

export type AggregateAverages = {
  cleanTakesPct: number | null;
  cleanThrowInsPct: number | null;
  errorRate: number | null;
  regulationPct: number | null;
};

export type HeatmapBowlerFilter = "both" | "seam" | "spin";

export type AggregateDeliveryPositionCell = {
  position: string;
  total: number;
  cleanTakes: number;
  cleanPct: number;
};

export type AggregateChartData = {
  trendData: Array<{
    label: string;
    cleanTakesPct: number | null;
    cleanThrowInsPct: number | null;
  }>;
  averages: AggregateAverages;
  errorReasonBreakdown: Array<{ reason: string; count: number }>;
  takesByBowlerType: Array<{
    bowlerType: string;
    cleanTakes: number;
    errors: number;
    total: number;
    cleanPct: number;
  }>;
  collectionDifficultyRatio: { regulation: number; difficult: number };
  deliveryPositionHeatmap: Record<
    HeatmapBowlerFilter,
    AggregateDeliveryPositionCell[]
  >;
  takeResultBreakdown: Array<{ result: string; count: number }>;
};
