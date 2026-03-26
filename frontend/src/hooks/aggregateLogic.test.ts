import { describe, expect, it } from "vitest";
import type { BallEntry, MatchAggregateData } from "../../../common/types";
import {
  buildMatchAggregateData,
  countRejectedSettledResults,
  getAllBallsFromMatches,
  getChronologicalMatchData,
  getSheetsForSelectedRange,
  getUncachedSheets,
} from "./aggregateLogic";

const makeBall = (): BallEntry => ({
  timestamp: new Date("2025-01-01T00:00:00.000Z"),
  overCount: { over: 0, ball: 1 },
  bowlerType: "RA seam",
  wkPosition: "Up",
  deliveryPosition: "High Off Side",
  takeResult: "Clean take",
  collectionDifficulty: "Regulation",
  errorReason: undefined,
  throwInResult: "Clean",
  extraType: undefined,
});

describe("aggregateLogic", () => {
  it("selects sheets for fixed ranges and all", () => {
    const names = ["a", "b", "c", "d", "e", "f"];
    expect(getSheetsForSelectedRange(names, 5)).toEqual(["a", "b", "c", "d", "e"]);
    expect(getSheetsForSelectedRange(names, "all")).toEqual(names);
  });

  it("finds uncached sheets", () => {
    const cache = new Map<string, MatchAggregateData>();
    cache.set("a", {
      sheetName: "a",
      date: "2025-01-01",
      matchNumber: 1,
      stats: {},
      balls: [],
    });

    expect(getUncachedSheets(["a", "b", "c"], cache)).toEqual(["b", "c"]);
  });

  it("builds match aggregate data from sheet naming conventions", () => {
    const built = buildMatchAggregateData(
      "2025-03-01 - Match 12",
      { "Clean Takes %": "80" },
      [makeBall()]
    );
    expect(built).toEqual({
      sheetName: "2025-03-01 - Match 12",
      date: "2025-03-01",
      matchNumber: 12,
      stats: { "Clean Takes %": "80" },
      balls: [makeBall()],
    });

    const fallback = buildMatchAggregateData("Unexpected Name", {}, []);
    expect(fallback.date).toBe("");
    expect(fallback.matchNumber).toBe(1);
  });

  it("returns chronological cached match data in requested order", () => {
    const cache = new Map<string, MatchAggregateData>([
      [
        "latest",
        {
          sheetName: "latest",
          date: "2025-03-02",
          matchNumber: 2,
          stats: {},
          balls: [makeBall()],
        },
      ],
      [
        "older",
        {
          sheetName: "older",
          date: "2025-03-01",
          matchNumber: 1,
          stats: {},
          balls: [makeBall()],
        },
      ],
    ]);

    const result = getChronologicalMatchData(["latest", "older", "missing"], cache);
    expect(result.map((m) => m.sheetName)).toEqual(["older", "latest"]);
  });

  it("counts rejected settled results", () => {
    const settled: PromiseSettledResult<number>[] = [
      { status: "fulfilled", value: 1 },
      { status: "rejected", reason: new Error("x") },
      { status: "rejected", reason: new Error("y") },
    ];
    expect(countRejectedSettledResults(settled)).toBe(2);
  });

  it("flattens balls from all matches", () => {
    const matches: MatchAggregateData[] = [
      {
        sheetName: "m1",
        date: "2025-01-01",
        matchNumber: 1,
        stats: {},
        balls: [makeBall(), makeBall()],
      },
      {
        sheetName: "m2",
        date: "2025-01-02",
        matchNumber: 2,
        stats: {},
        balls: [makeBall()],
      },
    ];

    expect(getAllBallsFromMatches(matches)).toHaveLength(3);
  });
});
