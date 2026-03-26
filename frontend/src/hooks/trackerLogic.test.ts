import { describe, expect, it } from "vitest";
import type { BallEntry, SelectionState } from "../../../common/types";
import {
  EMPTY_SELECTIONS,
  buildQuickNoTouchSelections,
  buildSkipToThrowInSelections,
  countValidBalls,
  derivePostSubmitState,
  deriveRefreshStateFromEntries,
  formatMatchDisplay,
  getCurrentOverCount,
  getNextOverCount,
  getResumeStepIndex,
  getVisiblePagesFor,
  parseMatchFromSearch,
} from "./trackerLogic";

const makeBall = (
  over: number,
  ball: number,
  overrides: Partial<BallEntry> = {}
): BallEntry => ({
  timestamp: new Date("2025-01-01T10:00:00.000Z"),
  overCount: { over, ball },
  bowlerType: "RA seam",
  wkPosition: "Up",
  deliveryPosition: "High Off Side",
  takeResult: "Clean take",
  collectionDifficulty: "Regulation",
  errorReason: undefined,
  throwInResult: "Clean",
  extraType: undefined,
  ...overrides,
});

describe("trackerLogic", () => {
  describe("page visibility and resume behavior", () => {
    it("includes collection page for successful takes", () => {
      const pages = getVisiblePagesFor({
        ...EMPTY_SELECTIONS,
        take: "Catch",
      });
      expect(pages).toEqual([
        "bowler",
        "keeper",
        "delivery",
        "take",
        "collection",
        "throwIn",
      ]);
    });

    it("includes error page for failed takes and skips for no-touch", () => {
      const failed = getVisiblePagesFor({
        ...EMPTY_SELECTIONS,
        take: "Missed catch",
      });
      const noTouch = getVisiblePagesFor({
        ...EMPTY_SELECTIONS,
        take: "No touch",
      });

      expect(failed).toEqual([
        "bowler",
        "keeper",
        "delivery",
        "take",
        "error",
        "throwIn",
      ]);
      expect(noTouch).toEqual([
        "bowler",
        "keeper",
        "delivery",
        "take",
        "throwIn",
      ]);
    });

    it("resumes at delivery if keeper is set, otherwise keeper", () => {
      expect(
        getResumeStepIndex({ ...EMPTY_SELECTIONS, bowler: "RA seam", keeper: "Up" })
      ).toBe(2);
      expect(getResumeStepIndex({ ...EMPTY_SELECTIONS, bowler: "RA seam" })).toBe(
        1
      );
    });
  });

  describe("url parsing", () => {
    it("parses valid match query and rejects invalid values", () => {
      expect(parseMatchFromSearch("?match=2025-03-01-2")).toEqual({
        date: "2025-03-01",
        number: 2,
      });
      expect(parseMatchFromSearch("?match=bad-value")).toBeNull();
      expect(parseMatchFromSearch("?other=2025-03-01-2")).toBeNull();
    });
  });

  describe("over and ball progression", () => {
    it("counts valid balls and ignores extras for over count", () => {
      const balls = [
        makeBall(0, 1),
        makeBall(0, 2, { extraType: "Wide" }),
        makeBall(0, 2),
      ];
      expect(countValidBalls(balls)).toBe(2);
      expect(getNextOverCount(0, balls)).toEqual({ over: 0, ball: 3 });
      expect(getCurrentOverCount(0, balls)).toEqual({ over: 0, ball: 3 });
    });

    it("rolls to next over after 6 legal balls on submit", () => {
      const currentOverBalls = [
        makeBall(0, 1),
        makeBall(0, 2),
        makeBall(0, 3),
        makeBall(0, 4),
        makeBall(0, 5),
      ];
      const selection: SelectionState = {
        ...EMPTY_SELECTIONS,
        bowler: "RA seam",
        keeper: "Up",
      };

      const result = derivePostSubmitState({
        currentOver: 0,
        currentOverBalls,
        newEntry: makeBall(0, 6),
        submissionSelections: selection,
      });

      expect(result).toEqual({
        currentOver: 1,
        currentOverBalls: [],
        selections: EMPTY_SELECTIONS,
        currentStepIndex: 0,
      });
    });

    it("stays in current over when submitting an extra", () => {
      const currentOverBalls = [
        makeBall(0, 1),
        makeBall(0, 2),
        makeBall(0, 3),
        makeBall(0, 4),
        makeBall(0, 5),
      ];
      const result = derivePostSubmitState({
        currentOver: 0,
        currentOverBalls,
        newEntry: makeBall(0, 6, { extraType: "No ball" }),
        submissionSelections: {
          ...EMPTY_SELECTIONS,
          bowler: "RA seam",
          keeper: "Back",
        },
      });

      expect(result.currentOver).toBe(0);
      expect(result.currentOverBalls).toHaveLength(6);
      expect(result.selections.bowler).toBe("RA seam");
      expect(result.selections.keeper).toBe("Back");
      expect(result.currentStepIndex).toBe(2);
    });

    it("derives refresh state from existing entries and reset case", () => {
      const empty = deriveRefreshStateFromEntries([]);
      expect(empty).toEqual({
        currentOver: 0,
        currentOverBalls: [],
        selections: EMPTY_SELECTIONS,
        currentStepIndex: 0,
        shouldResetExtraType: true,
      });

      const entries = [
        makeBall(1, 1, { bowlerType: "LA seam", wkPosition: "Back" }),
        makeBall(1, 2, { bowlerType: "LA seam", wkPosition: "Back" }),
      ];
      const active = deriveRefreshStateFromEntries(entries);
      expect(active.currentOver).toBe(1);
      expect(active.currentOverBalls).toHaveLength(2);
      expect(active.selections.bowler).toBe("LA seam");
      expect(active.selections.keeper).toBe("Back");
      expect(active.currentStepIndex).toBe(2);
      expect(active.shouldResetExtraType).toBe(false);

      const completedOverEntries = [
        makeBall(3, 1),
        makeBall(3, 2),
        makeBall(3, 3),
        makeBall(3, 4),
        makeBall(3, 5),
        makeBall(3, 6),
      ];
      const completed = deriveRefreshStateFromEntries(completedOverEntries);
      expect(completed.currentOver).toBe(4);
      expect(completed.currentOverBalls).toEqual([]);
      expect(completed.currentStepIndex).toBe(0);
    });
  });

  describe("selection helpers", () => {
    it("builds no-touch quick and throw-in skip selections", () => {
      const base: SelectionState = {
        ...EMPTY_SELECTIONS,
        bowler: "RA seam",
        keeper: "Up",
        take: "Catch",
        collection: "Regulation",
      };
      expect(buildSkipToThrowInSelections(base)).toEqual({
        ...base,
        take: "No touch",
        collection: "",
        error: "",
        throwIn: "",
      });
      expect(buildQuickNoTouchSelections(base)).toEqual({
        ...base,
        take: "No touch",
        collection: "",
        error: "",
        throwIn: "No touch",
      });
    });

    it("formats match display names", () => {
      expect(formatMatchDisplay("2025-02-20T12:00:00", 3, "fallback")).toBe(
        "20th Feb - Match 3"
      );
    });
  });
});
