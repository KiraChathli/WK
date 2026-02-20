
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
