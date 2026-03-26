import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_DATA_PREFIX, SHEET_EMPTY_VALUE } from "./consts";
import {
  computeAggregateStats,
  deleteBallFromSheet,
  formatBallRow,
  formatShortMatchLabel,
  getColumnLetter,
  getEnvVar,
  listSheetNames,
  logMultipleBallsToSheet,
  parseBallRow,
  readBallData,
  readMatchInfo,
  updateBallInSheet,
} from "./utils";
import type { BallEntry, MatchAggregateData } from "./types";

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

const createApi = () => {
  const values = {
    append: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
    batchUpdate: vi.fn(),
  };

  return {
    spreadsheets: {
      values,
      get: vi.fn(),
      batchUpdate: vi.fn(),
    },
  };
};

describe("common/utils", () => {
  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  const originalClientId = process.env.CLIENT_ID;

  beforeEach(() => {
    process.env.SPREADSHEET_ID = "spreadsheet-id";
    process.env.CLIENT_ID = "client-id";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.SPREADSHEET_ID = originalSpreadsheetId;
    process.env.CLIENT_ID = originalClientId;
    delete process.env.MISSING_TEST_KEY;
  });

  describe("getColumnLetter", () => {
    it("handles boundary values", () => {
      expect(getColumnLetter(0)).toBe("A");
      expect(getColumnLetter(25)).toBe("Z");
      expect(getColumnLetter(26)).toBe("AA");
      expect(getColumnLetter(51)).toBe("AZ");
      expect(getColumnLetter(52)).toBe("BA");
      expect(getColumnLetter(701)).toBe("ZZ");
      expect(getColumnLetter(702)).toBe("AAA");
    });
  });

  describe("formatBallRow and parseBallRow", () => {
    it("round-trips values including placeholders", () => {
      const ball = makeBall(2, 3, {
        wkPosition: undefined,
        deliveryPosition: undefined,
        collectionDifficulty: undefined,
        errorReason: undefined,
        throwInResult: undefined,
        extraType: "Wide",
      });

      const row = formatBallRow(ball);
      expect(row[4]).toBe(SHEET_EMPTY_VALUE);
      expect(row[5]).toBe(SHEET_EMPTY_VALUE);
      expect(row[7]).toBe(SHEET_EMPTY_VALUE);
      expect(row[10]).toBe("Wide");

      const parsed = parseBallRow(row);
      expect(parsed.timestamp.toISOString()).toBe(ball.timestamp.toISOString());
      expect(parsed.overCount).toEqual({ over: 2, ball: 3 });
      expect(parsed.wkPosition).toBeUndefined();
      expect(parsed.deliveryPosition).toBeUndefined();
      expect(parsed.collectionDifficulty).toBeUndefined();
      expect(parsed.errorReason).toBeUndefined();
      expect(parsed.throwInResult).toBeUndefined();
      expect(parsed.extraType).toBe("Wide");
    });

    it("normalizes legacy bowler value and defaults take result", () => {
      const parsed = parseBallRow([
        "2025-01-01T10:00:00.000Z",
        "0",
        "1",
        "LA spin",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
      ]);

      expect(parsed.bowlerType).toBe("LA off spin");
      expect(parsed.takeResult).toBe("No touch");
      expect(parsed.wkPosition).toBeUndefined();
      expect(parsed.deliveryPosition).toBeUndefined();
    });
  });

  describe("listSheetNames and formatShortMatchLabel", () => {
    it("filters valid match sheets and sorts reverse lexicographically", async () => {
      const api = createApi();
      const allSheets = [
        "notes",
        "2025-03-01 - Match X",
        "2025-02-20 - Match 1",
        `${SAMPLE_DATA_PREFIX} 2025-03-01 - Match 2`,
        `${SAMPLE_DATA_PREFIX} 2024-12-31 - Match 1`,
      ];
      api.spreadsheets.get.mockResolvedValue({
        result: {
          sheets: allSheets.map((title) => ({ properties: { title } })),
        },
      });

      const result = await listSheetNames(api as any);
      const expectedValid = [
        "2025-02-20 - Match 1",
        `${SAMPLE_DATA_PREFIX} 2025-03-01 - Match 2`,
        `${SAMPLE_DATA_PREFIX} 2024-12-31 - Match 1`,
      ];
      expect(result).toEqual([...expectedValid].sort().reverse());
    });

    it("formats short labels and keeps invalid names unchanged", () => {
      expect(formatShortMatchLabel("2025-02-20 - Match 1")).toBe("20 Feb #1");
      expect(
        formatShortMatchLabel(`${SAMPLE_DATA_PREFIX} 2025-02-20 - Match 3`)
      ).toBe("[S] 20 Feb #3");
      expect(formatShortMatchLabel("not-a-match")).toBe("not-a-match");
    });
  });

  describe("getEnvVar", () => {
    it("reads from process.env", () => {
      process.env.MY_TEST_VAR = "abc123";
      expect(getEnvVar("MY_TEST_VAR")).toBe("abc123");
      delete process.env.MY_TEST_VAR;
    });

    it("throws when env var is missing", () => {
      expect(() => getEnvVar("MISSING_TEST_KEY")).toThrow(
        "Environment variable MISSING_TEST_KEY is not set."
      );
    });
  });

  describe("logMultipleBallsToSheet", () => {
    it("uses resource for non-local mode", async () => {
      const api = createApi();
      api.spreadsheets.values.append.mockResolvedValue({});
      const ball = makeBall(0, 1);

      await logMultipleBallsToSheet([ball], api as any, "Sheet 1");

      expect(api.spreadsheets.values.append).toHaveBeenCalledTimes(1);
      expect(api.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: "spreadsheet-id",
          range: "Sheet 1!D2",
          valueInputOption: "USER_ENTERED",
          resource: { values: [formatBallRow(ball)] },
        })
      );
      expect(api.spreadsheets.values.append.mock.calls[0][0].requestBody).toBe(
        undefined
      );
    });

    it("uses requestBody for local mode", async () => {
      const api = createApi();
      api.spreadsheets.values.append.mockResolvedValue({});
      const ball = makeBall(0, 1);

      await logMultipleBallsToSheet([ball], api as any, "Sheet 1", true);

      expect(api.spreadsheets.values.append).toHaveBeenCalledWith(
        expect.objectContaining({
          range: "Sheet 1!D2",
          requestBody: { values: [formatBallRow(ball)] },
        })
      );
      expect(api.spreadsheets.values.append.mock.calls[0][0].resource).toBe(
        undefined
      );
    });

    it("creates a missing sheet and appends metadata/formulas before retry", async () => {
      const api = createApi();
      api.spreadsheets.values.append
        .mockRejectedValueOnce({ status: 400, message: "Unable to parse range" })
        .mockResolvedValue({});
      api.spreadsheets.batchUpdate.mockResolvedValue({});

      const sheetName = "2025-03-01 - Match 7";
      await logMultipleBallsToSheet([makeBall(0, 1)], api as any, sheetName);

      expect(api.spreadsheets.batchUpdate).toHaveBeenCalledTimes(1);
      expect(api.spreadsheets.values.append).toHaveBeenCalledTimes(5);

      const ranges = api.spreadsheets.values.append.mock.calls.map(
        (call: any[]) => call[0].range
      );
      expect(ranges).toEqual([
        `${sheetName}!D2`,
        `${sheetName}!D1`,
        `${sheetName}!A1`,
        `${sheetName}!A8`,
        `${sheetName}!D2`,
      ]);

      const metadata = api.spreadsheets.values.append.mock.calls[2][0].resource
        .values as string[][];
      expect(metadata[3]).toEqual(["Match ID", sheetName]);
      expect(metadata[4]).toEqual(["Match Number", "7"]);

      const formulas = api.spreadsheets.values.append.mock.calls[3][0].resource
        .values as string[][];
      expect(formulas[0][0]).toBe("-- OVERALL --");
      expect(formulas.at(-1)?.[0]).toBe("No Balls");
    });
  });

  describe("updateBallInSheet", () => {
    it("updates the exact sheet row range", async () => {
      const api = createApi();
      api.spreadsheets.values.update.mockResolvedValue({});

      await updateBallInSheet(makeBall(1, 2), api as any, "Sheet 1", 0);

      expect(api.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          range: "Sheet 1!D2:N2",
          valueInputOption: "USER_ENTERED",
        })
      );
    });
  });

  describe("deleteBallFromSheet", () => {
    it("deletes a row and renumbers balls in the same over including extras", async () => {
      const api = createApi();
      const sheetName = "2025-01-01 - Match 1";
      const balls = [
        makeBall(0, 1),
        makeBall(0, 2, { extraType: "Wide" }),
        makeBall(0, 2, { takeResult: "Miss" }),
        makeBall(0, 3, { takeResult: "Catch" }),
        makeBall(1, 1),
      ];

      api.spreadsheets.values.get.mockResolvedValue({
        result: { values: balls.map(formatBallRow) },
      });
      api.spreadsheets.get.mockResolvedValue({
        result: {
          sheets: [{ properties: { title: sheetName, sheetId: 123 } }],
        },
      });
      api.spreadsheets.batchUpdate.mockResolvedValue({});
      api.spreadsheets.values.batchUpdate.mockResolvedValue({});

      await deleteBallFromSheet(api as any, sheetName, 0);

      expect(api.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: 123,
                    dimension: "ROWS",
                    startIndex: 1,
                    endIndex: 2,
                  },
                },
              },
            ],
          },
        })
      );

      expect(api.spreadsheets.values.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: {
            valueInputOption: "USER_ENTERED",
            data: [
              { range: `${sheetName}!F2`, values: [["1"]] },
              { range: `${sheetName}!F3`, values: [["1"]] },
              { range: `${sheetName}!F4`, values: [["2"]] },
            ],
          },
        })
      );
    });
  });

  describe("readBallData", () => {
    it("parses gapi response shape", async () => {
      const api = createApi();
      api.spreadsheets.values.get.mockResolvedValue({
        result: { values: [formatBallRow(makeBall(3, 4))] },
      });

      const data = await readBallData(api as any, "Sheet 1");
      expect(data).toHaveLength(1);
      expect(data[0].overCount).toEqual({ over: 3, ball: 4 });
    });

    it("parses googleapis response shape", async () => {
      const api = createApi();
      api.spreadsheets.values.get.mockResolvedValue({
        data: { values: [formatBallRow(makeBall(1, 1, { bowlerType: "LA seam" }))] },
      });

      const data = await readBallData(api as any, "Sheet 1");
      expect(data[0].bowlerType).toBe("LA seam");
    });

    it("returns empty array for missing-sheet parse errors", async () => {
      const api = createApi();
      api.spreadsheets.values.get.mockRejectedValue({
        status: 400,
        message: "Unable to parse range",
      });

      await expect(readBallData(api as any, "Missing Sheet")).resolves.toEqual([]);
    });
  });

  describe("readMatchInfo", () => {
    it("parses metadata/stats and computes stat sections", async () => {
      const api = createApi();
      api.spreadsheets.values.get.mockResolvedValue({
        result: {
          values: [
            ["Match Info", ""],
            ["Date", "2025-01-01"],
            ["Match Number", "2"],
            ["Stats", ""],
            ["-- OVERALL --", ""],
            ["Clean Takes %", "75"],
            ["Misses", "3"],
            ["-- ERRORS --", ""],
            ["Fumbles", "1"],
          ],
        },
      });

      const info = await readMatchInfo(api as any, "Sheet 1");
      expect(info.info.Date).toBe("2025-01-01");
      expect(info.stats["Clean Takes %"]).toBe("75");
      expect(info.statSections).toHaveLength(2);
      expect(info.statSections[0].title).toBe("Overall");
      expect(info.statSections[0].colorClass).toBe("primary");
      expect(info.statSections[0].stats[0]).toEqual(
        expect.objectContaining({
          label: "Clean Takes",
          value: "75%",
          numericValue: 75,
          suffix: "%",
        })
      );
    });

    it("supports googleapis data shape and handles missing sheet", async () => {
      const api = createApi();
      api.spreadsheets.values.get
        .mockResolvedValueOnce({
          data: {
            values: [
              ["Match Info", ""],
              ["Date", "2025-02-02"],
              ["Stats", ""],
              ["-- OVERALL --", ""],
              ["Clean Throw Ins %", "66.7"],
            ],
          },
        })
        .mockRejectedValueOnce({
          status: 400,
          message: "Unable to parse range",
        });

      const parsed = await readMatchInfo(api as any, "Sheet 1");
      expect(parsed.info.Date).toBe("2025-02-02");
      expect(parsed.stats["Clean Throw Ins %"]).toBe("66.7");

      const empty = await readMatchInfo(api as any, "Missing Sheet");
      expect(empty).toEqual({ info: {}, stats: {}, statSections: [] });
    });
  });

  describe("computeAggregateStats", () => {
    it("computes trends, averages, breakdowns, and heatmaps", () => {
      const matches: MatchAggregateData[] = [
        {
          sheetName: "2025-02-20 - Match 1",
          date: "2025-02-20",
          matchNumber: 1,
          stats: {
            "Clean Takes %": "50",
            "Clean Throw Ins %": "40",
          },
          balls: [
            makeBall(0, 1, { bowlerType: "RA seam", takeResult: "Clean take" }),
            makeBall(0, 2, {
              bowlerType: "RA seam",
              takeResult: "Miss",
              collectionDifficulty: undefined,
              errorReason: "Technical error",
            }),
            makeBall(0, 3, {
              bowlerType: "RA off spin",
              deliveryPosition: "Low Straight",
              takeResult: "No touch",
              collectionDifficulty: undefined,
              throwInResult: "No touch",
            }),
            makeBall(0, 4, {
              bowlerType: "RA off spin",
              deliveryPosition: "Low Straight",
              takeResult: "Catch",
              collectionDifficulty: "Difficult",
            }),
            makeBall(0, 5, {
              bowlerType: "RA off spin",
              deliveryPosition: "Low Straight",
              takeResult: "Missed catch",
              collectionDifficulty: undefined,
              errorReason: "Deviation",
            }),
          ],
        },
        {
          sheetName: "2025-03-01 - Match 2",
          date: "2025-03-01",
          matchNumber: 2,
          stats: {
            "Clean Takes %": "-",
            "Clean Throw Ins %": "60",
          },
          balls: [
            makeBall(0, 1, {
              bowlerType: "LA seam",
              takeResult: "Stumping",
              collectionDifficulty: "Regulation",
            }),
            makeBall(0, 2, {
              bowlerType: "LA seam",
              takeResult: "No touch",
              collectionDifficulty: undefined,
              throwInResult: "No touch",
            }),
            makeBall(0, 3, {
              bowlerType: "LA seam",
              deliveryPosition: "Waist Straight",
              takeResult: "Fumble stop",
              collectionDifficulty: undefined,
              errorReason: "Deviation",
            }),
          ],
        },
      ];

      const result = computeAggregateStats(matches);

      expect(result.trendData).toEqual([
        { label: "20 Feb #1", cleanTakesPct: 50, cleanThrowInsPct: 40 },
        { label: "1 Mar #2", cleanTakesPct: null, cleanThrowInsPct: 60 },
      ]);

      expect(result.averages).toEqual({
        cleanTakesPct: 50,
        cleanThrowInsPct: 50,
        errorRate: 50,
        regulationPct: 66.7,
      });

      expect(result.errorReasonBreakdown).toEqual([
        { reason: "Deviation", count: 2 },
        { reason: "Technical error", count: 1 },
      ]);

      expect(result.collectionDifficultyRatio).toEqual({
        regulation: 2,
        difficult: 1,
      });

      const seamHeatmap = result.deliveryPositionHeatmap.seam;
      const spinHeatmap = result.deliveryPositionHeatmap.spin;
      expect(seamHeatmap).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            position: "High Off Side",
            total: 3,
            cleanTakes: 2,
            cleanPct: 66.7,
          }),
          expect.objectContaining({
            position: "Waist Straight",
            total: 1,
            cleanTakes: 0,
            cleanPct: 0,
          }),
        ])
      );
      expect(spinHeatmap).toEqual([
        expect.objectContaining({
          position: "Low Straight",
          total: 2,
          cleanTakes: 1,
          cleanPct: 50,
        }),
      ]);

      const raOffSpin = result.takesByBowlerType.find(
        (item) => item.bowlerType === "RA off spin"
      );
      expect(raOffSpin).toEqual(
        expect.objectContaining({
          total: 3,
          cleanTakes: 1,
          errors: 1,
          cleanPct: 33.3,
        })
      );

      const noTouch = result.takeResultBreakdown.find(
        (item) => item.result === "No touch"
      );
      expect(noTouch?.count).toBe(2);
    });
  });
});
