import type {
  BallEntry,
  OverCount,
  BowlerType,
  CollectionDifficulty,
  DeliveryPosition,
  ErrorReason,
  PageType,
  SelectionState,
  TakeResult,
  ThrowInResult,
  ExtraType,
} from "../../common/types";

export const PAGE_LABELS: Record<PageType, string> = {
  bowler: "Bowler",
  delivery: "Delivery",
  take: "Take",
  collection: "Difficulty",
  error: "Error",
  throwIn: "Throw In",
};

export const selectionStateToBallEntry = (
  selections: SelectionState,
  overCount: OverCount,
  extraType?: ExtraType
): BallEntry => ({
  timestamp: new Date(),
  overCount,
  bowlerType: selections.bowler as BowlerType,
  deliveryPosition: selections.delivery as DeliveryPosition,
  takeResult: selections.take as TakeResult,
  collectionDifficulty:
    (selections.collection as CollectionDifficulty) || undefined,
  errorReason: (selections.error as ErrorReason) || undefined,
  throwInResult: selections.throwIn as ThrowInResult,
  extraType,
});

export const getEmailLocalStorage = () =>
  localStorage.getItem("google_user_email");

export const setEmailLocalStorage = (email: string) =>
  localStorage.setItem("google_user_email", email);

export const setGoogleAccessToken = (token: string) =>
  localStorage.setItem("google_access_token", token);

export const setGoogleTokenExpiry = (expiry: string) =>
  localStorage.setItem("google_token_expiry", expiry);
