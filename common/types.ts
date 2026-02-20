
// 1. Bowler Types
export const bowlerTypes = [
  "LA seam up",
  "LA seam back",
  "RA seam up",
  "RA seam back",
  "Leg spin",
  "Off spin",
  "LA spin",
] as const;
export type BowlerType = (typeof bowlerTypes)[number];

// 2. Delivery Positions (The 3x3 Grid)
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


// 4. Outcome Details (Difficulty & Reasons)
export const collectionDifficulties = ["Regulation", "Difficult"] as const;
export type CollectionDifficulty = (typeof collectionDifficulties)[number];

export const errorReasons = [
  "Came up early",
  "Weight backwards",
  "Snatched at ball",
  "Blocked vision",
  "Just missed it",
  "Large deviation",
  "Unknown",
] as const;
export type ErrorReason = (typeof errorReasons)[number];



// 5. Throw-ins
export const throwInResults = [
  "Clean",
  "Fumble stop",
  "Miss",
  "No touch",
] as const;
export type ThrowInResult = (typeof throwInResults)[number];

export const successfulThrowInResults = [
  "Clean",
] as const;
export type SuccessfulThrowInResult = (typeof successfulThrowInResults)[number];

export const SHEET_HEADERS = [
    "Timestamp",
    "Over",
    "Ball",
    "Bowler",
    "Delivery",
    "Take",
    "Collection Difficulty",
    "Error Reason",
    "Throw In"
] as const;

export type OverCount = {
  over: number;
  ball: number;
};

export type BallEntry = {
  timestamp: Date;
  overCount: OverCount;
  bowlerType: BowlerType;
  deliveryPosition: DeliveryPosition;
  takeResult: TakeResult;
  collectionDifficulty: CollectionDifficulty | undefined;
  errorReason: ErrorReason | undefined;
  throwInResult: ThrowInResult | undefined;
};

export type PageType =
  | "bowler"
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
}

// Aggregate Visualisation Types

/** A single match's stats + ball data bundled for aggregate analysis */
export type MatchAggregateData = {
    sheetName: string;       // e.g., "2025-02-20 - Match 1"
    date: string;            // e.g., "2025-02-20"
    matchNumber: number;
    stats: MatchStats;
    balls: BallEntry[];
};

/** Range options for the match selector dropdown */
export type MatchRangeOption = 5 | 10 | 20 | "all";

/** Pre-computed averages across the selected range */
export type AggregateAverages = {
    cleanTakesPct: number | null;
    cleanThrowInsPct: number | null;
    errorRate: number | null;
    regulationPct: number | null;
};

/** Pre-computed aggregate stats for chart consumption */
export type AggregateChartData = {
    // Per-match trend data (for line charts)
    trendData: Array<{
        label: string;
        cleanTakesPct: number | null;
        cleanThrowInsPct: number | null;
    }>;

    // Calculated averages across the range
    averages: AggregateAverages;

    // Cross-match breakdowns
    errorReasonBreakdown: Array<{ reason: string; count: number }>;
    takesByBowlerType: Array<{
        bowlerType: string;
        cleanTakes: number;
        errors: number;
        total: number;
        cleanPct: number;
    }>;
    collectionDifficultyRatio: { regulation: number; difficult: number };
    deliveryPositionHeatmap: Array<{
        position: string;
        total: number;
        cleanTakes: number;
        cleanPct: number;
    }>;
    takeResultBreakdown: Array<{ result: string; count: number }>;
};
