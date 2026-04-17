import {
  type AggregateDeliveryPositionCell,
  type BallEntry,
  type MatchAggregateData,
  type MatchSummary,
  type AggregateChartData,
  type AggregateAverages,
  type BowlerType,
  type DeliveryPosition,
  type HeatmapBowlerFilter,
  SHEET_HEADERS,
  type SheetMetadata,
  type WkPosition,
  successfulTakeResults,
  successfulThrowInResults,
  type MatchStatsComputed,
  type MatchStatSection,
} from "./types.ts";
import { SHEET_EMPTY_VALUE, SAMPLE_DATA_PREFIX } from "./consts.ts";

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapedSamplePrefix = escapeRegExp(SAMPLE_DATA_PREFIX);
const LEGACY_MATCH_NAME_REGEX = new RegExp(
  `^(?:${escapedSamplePrefix} )?(\\d{4}-\\d{2}-\\d{2}) - Match (\\d+)$`
);
const LEGACY_MATCH_LABEL_REGEX = new RegExp(
  `^(?:${escapedSamplePrefix} )?(\\d{4})-(\\d{2})-(\\d{2}) - Match (\\d+)$`
);

const pad2 = (value: number): string => String(value).padStart(2, "0");

const localIsoDateFromDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const isValidYmdDate = (year: number, month: number, day: number): boolean => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const toIsoDate = (year: number, month: number, day: number): string | null => {
  if (!isValidYmdDate(year, month, day)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

const parseIsoDate = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
};

const parseLooseDateToIso = (value: string | undefined): string | null => {
  const isoDate = parseIsoDate(value);
  if (isoDate) return isoDate;
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const numericMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (numericMatch) {
    const first = Number(numericMatch[1]);
    const second = Number(numericMatch[2]);
    const year = Number(numericMatch[3]);

    if (first > 12 && second <= 12) {
      return toIsoDate(year, second, first);
    }

    if (second > 12 && first <= 12) {
      return toIsoDate(year, first, second);
    }

    // Ambiguous numeric dates (e.g. 03/04/2025) intentionally return null.
    // The caller can fallback to Match ID / sheet-name parsing.
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return localIsoDateFromDate(parsed);
};

const parsePositiveInt = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const parseLegacyMatchName = (
  value: string | undefined
): { date: string; matchNumber: number; isSample: boolean } | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(LEGACY_MATCH_NAME_REGEX);
  if (!match) return null;

  const date = parseIsoDate(match[1]);
  const matchNumber = parsePositiveInt(match[2]);
  if (!date || matchNumber === null) return null;

  return {
    date,
    matchNumber,
    isSample: trimmed.startsWith(`${SAMPLE_DATA_PREFIX} `),
  };
};

const compareNullableNumbersDesc = (
  a: number | null,
  b: number | null
): number => {
  if (a !== null && b !== null) {
    if (a === b) return 0;
    return b - a;
  }
  if (a !== null) return -1;
  if (b !== null) return 1;
  return 0;
};

const compareNullableIsoDatesDesc = (
  a: string | null,
  b: string | null
): number => {
  if (a && b) {
    if (a === b) return 0;
    return a < b ? 1 : -1;
  }
  if (a) return -1;
  if (b) return 1;
  return 0;
};

export const quoteSheetNameForA1 = (sheetName: string): string =>
  `'${sheetName.replace(/'/g, "''")}'`;

export const buildSheetRange = (sheetName: string, a1Range: string): string =>
  `${quoteSheetNameForA1(sheetName)}!${a1Range}`;

export const parseMatchIdentity = (
  sheetName: string,
  info: Record<string, string> = {}
): MatchSummary => {
  const metadataDate = parseLooseDateToIso(info["Date"]);
  const metadataMatchNumber = parsePositiveInt(info["Match Number"]);
  const matchId = info["Match ID"]?.trim();

  const parsedFromMatchId = parseLegacyMatchName(matchId);
  const parsedFromSheetName = parseLegacyMatchName(sheetName);

  return {
    sheetName,
    date: metadataDate ?? parsedFromMatchId?.date ?? parsedFromSheetName?.date ?? null,
    matchNumber:
      metadataMatchNumber ??
      parsedFromMatchId?.matchNumber ??
      parsedFromSheetName?.matchNumber ??
      null,
    isSample:
      Boolean(parsedFromMatchId?.isSample) ||
      Boolean(parsedFromSheetName?.isSample),
  };
};

/**
 * Converts a 0-based column index to A1 notation letter (e.g., 0 -> A, 25 -> Z, 26 -> AA)
 */
export const getColumnLetter = (index: number): string => {
    let letter = "";
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
};

export const logBallToSheet = async (
  ball: BallEntry,
  googleSheetsApi: any,
  sheetName: string
): Promise<void> =>
  await logMultipleBallsToSheet([ball], googleSheetsApi, sheetName);

export const logMultipleBallsToSheet = async (
  balls: BallEntry[],
  googleSheetsApi: any,
  sheetName: string,
  isLocal: boolean = false
): Promise<void> => {
  const spreadsheetId = getEnvVar("SPREADSHEET_ID");
  const values = balls.map(formatBallRow);

  const appendRequest = {
    spreadsheetId,
    range: buildSheetRange(sheetName, "D2"),
    valueInputOption: "USER_ENTERED",
    ...(!isLocal && { resource: { values } }),
    ...(isLocal && { requestBody: { values } }),
  };

  try {
    await googleSheetsApi.spreadsheets.values.append(appendRequest);
  } catch (err: any) {
    const errorMsg = err.result?.error?.message || err.message || "";
    if (errorMsg.includes("Unable to parse range") || err.status === 400) {
       await createNewSheetWithMetadata(googleSheetsApi, spreadsheetId, sheetName, appendRequest);
    } else {
      throw err;
    }
  }
};

/** Helper to create a new sheet, headers, metadata and formulas */
const createNewSheetWithMetadata = async (
    googleSheetsApi: any,
    spreadsheetId: string,
    sheetName: string,
    appendRequest: any
) => {
    console.log(`Sheet ${sheetName} not found. Creating...`);

    // 1. Create Sheet
    await googleSheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
    });

    // 2. Data Headers (D1)
    await googleSheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: buildSheetRange(sheetName, "D1"),
        valueInputOption: "USER_ENTERED",
        resource: { values: [SHEET_HEADERS] }
    });

    // 3. Metadata (A1)
    const matchNumberMatch = sheetName.match(/Match (\d+)/i);
    const matchNumber = matchNumberMatch ? matchNumberMatch[1] : "1";
    const metadata = [
        ["Match Info", ""],
        ["Date", localIsoDateFromDate(new Date())],
        ["Start Time", new Date().toLocaleTimeString()],
        ["Match ID", sheetName],
        ["Match Number", matchNumber],
        ["", ""],
        ["Stats", ""]
    ];

    await googleSheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: buildSheetRange(sheetName, "A1"),
        valueInputOption: "USER_ENTERED",
        resource: { values: metadata }
    });

    // 4. Statistics Formulas (A8 onwards)
    const formulas = generateStatsFormulas();
    await googleSheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range: buildSheetRange(sheetName, `A${metadata.length + 1}`),
        valueInputOption: "USER_ENTERED",
        resource: { values: formulas }
    });

    // 5. Append initial data
    await googleSheetsApi.spreadsheets.values.append(appendRequest);
};

const generateStatsFormulas = () => {
    const dataStartColIndex = 3; // D
    const takeCol = getColumnLetter(dataStartColIndex + SHEET_HEADERS.indexOf("Take"));
    const throwInCol = getColumnLetter(dataStartColIndex + SHEET_HEADERS.indexOf("Throw In"));
    const bowlerCol = getColumnLetter(dataStartColIndex + SHEET_HEADERS.indexOf("Bowler"));
    const extraCol = getColumnLetter(dataStartColIndex + SHEET_HEADERS.indexOf("Extra"));

    const takeSuccessCount = successfulTakeResults
        .map((r) => `COUNTIF(${takeCol}2:${takeCol}, "${r}")`)
        .join(" + ");

    const throwInSuccessCount = successfulThrowInResults
        .map((r) => `COUNTIF(${throwInCol}2:${throwInCol}, "${r}")`)
        .join(" + ");

    return [
        ["-- OVERALL --", ""],
        ["Clean Takes %", `=IFERROR(ROUND(100 * (${takeSuccessCount}) / (COUNTA(${takeCol}2:${takeCol}) - COUNTIF(${takeCol}2:${takeCol}, "No touch")), 1), "-")`],
        ["Clean Throw Ins %", `=IFERROR(ROUND(100 * (${throwInSuccessCount}) / (COUNTA(${throwInCol}2:${throwInCol}) - COUNTIF(${throwInCol}2:${throwInCol}, "${SHEET_EMPTY_VALUE}") - COUNTIF(${throwInCol}2:${throwInCol}, "No touch")), 1), "-")`],
        ["Drop Rate %", `=IFERROR(ROUND(100 * (COUNTIF(${takeCol}2:${takeCol}, "Missed catch") + COUNTIF(${takeCol}2:${takeCol}, "Missed stumping")) / (COUNTIF(${takeCol}2:${takeCol}, "Catch") + COUNTIF(${takeCol}2:${takeCol}, "Stumping") + COUNTIF(${takeCol}2:${takeCol}, "Missed catch") + COUNTIF(${takeCol}2:${takeCol}, "Missed stumping")), 1), "-")`],
        ["", ""],
        ["-- PACE VS SPIN --", ""],
        ["Pace Takes %", `=IFERROR(ROUND(100 * (COUNTIFS(${bowlerCol}2:${bowlerCol}, "*seam*", ${takeCol}2:${takeCol}, "Clean take") + COUNTIFS(${bowlerCol}2:${bowlerCol}, "*seam*", ${takeCol}2:${takeCol}, "Catch") + COUNTIFS(${bowlerCol}2:${bowlerCol}, "*seam*", ${takeCol}2:${takeCol}, "Stumping")) / (COUNTIFS(${bowlerCol}2:${bowlerCol}, "*seam*", ${takeCol}2:${takeCol}, "<>No touch", ${takeCol}2:${takeCol}, "<>")), 1), "-")`],
        ["Spin Takes %", `=IFERROR(ROUND(100 * (COUNTIFS(${bowlerCol}2:${bowlerCol}, "*spin*", ${takeCol}2:${takeCol}, "Clean take") + COUNTIFS(${bowlerCol}2:${bowlerCol}, "*spin*", ${takeCol}2:${takeCol}, "Catch") + COUNTIFS(${bowlerCol}2:${bowlerCol}, "*spin*", ${takeCol}2:${takeCol}, "Stumping")) / (COUNTIFS(${bowlerCol}2:${bowlerCol}, "*spin*", ${takeCol}2:${takeCol}, "<>No touch", ${takeCol}2:${takeCol}, "<>")), 1), "-")`],
        ["", ""],
        ["-- DISMISSALS --", ""],
        ["Catches", `=COUNTIF(${takeCol}2:${takeCol}, "Catch")`],
        ["Stumpings", `=COUNTIF(${takeCol}2:${takeCol}, "Stumping")`],
        ["Chances Missed", `=COUNTIF(${takeCol}2:${takeCol}, "Missed catch") + COUNTIF(${takeCol}2:${takeCol}, "Missed stumping")`],
        ["", ""],
        ["-- ERRORS --", ""],
        ["Misses", `=COUNTIF(${takeCol}2:${takeCol}, "Miss")`],
        ["Fumbles", `=COUNTIF(${takeCol}2:${takeCol}, "Fumble stop")`],
        ["", ""],
        ["-- EXTRAS --", ""],
        ["Wides", `=COUNTIF(${extraCol}2:${extraCol}, "Wide")`],
        ["No Balls", `=COUNTIF(${extraCol}2:${extraCol}, "No ball")`],
    ];
};

/**
 * Updates a ball entry at a specific row index (0-based) in the sheet.
 * Row index 0 corresponds to sheet row 2.
 */
export const updateBallInSheet = async (
  ball: BallEntry,
  googleSheetsApi: any,
  sheetName: string,
  rowIndex: number
): Promise<void> => {
  const spreadsheetId = getEnvVar("SPREADSHEET_ID");
  const sheetRow = rowIndex + 2; // Data starts at row 2
  const values = [formatBallRow(ball)];
  const endCol = getColumnLetter(3 + SHEET_HEADERS.length - 1);

  await googleSheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: buildSheetRange(sheetName, `D${sheetRow}:${endCol}${sheetRow}`),
    valueInputOption: "USER_ENTERED",
    resource: { values },
  });
};

/**
 * Deletes a ball entry at a specific row index (0-based) from the sheet,
 * then renumbers the remaining balls in the same over.
 * Row index 0 corresponds to sheet row 2.
 */
export const deleteBallFromSheet = async (
  googleSheetsApi: any,
  sheetName: string,
  rowIndex: number
): Promise<void> => {
  const spreadsheetId = getEnvVar("SPREADSHEET_ID");
  const sheetRow = rowIndex + 2; // Data starts at row 2

  // Read all balls to know the deleted ball's over number
  const allBalls = await readBallData(googleSheetsApi, sheetName);
  const deletedBall = allBalls[rowIndex];
  if (!deletedBall) throw new Error(`No ball at index ${rowIndex}`);
  const overNum = deletedBall.overCount.over;

  // Get the sheetId for the batchUpdate call
  const spreadsheet = await googleSheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const sheets = spreadsheet.result
    ? spreadsheet.result.sheets
    : spreadsheet.data.sheets;

  const sheet = sheets.find((s: any) => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);

  const sheetId = sheet.properties.sheetId;

  // Delete the row
  await googleSheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: sheetRow - 1, // 0-based for batchUpdate
              endIndex: sheetRow,
            },
          },
        },
      ],
    },
  });

  // Renumber remaining balls in the same over.
  // After row deletion, indices above the deleted row shift down by 1.
  const ballColumn = getColumnLetter(3 + SHEET_HEADERS.indexOf("Ball"));
  const renumberData: { range: string; values: string[][] }[] = [];
  let nonExtraCount = 0;

  for (let i = 0; i < allBalls.length; i++) {
    if (i === rowIndex) continue; // skip deleted ball
    if (allBalls[i].overCount.over !== overNum) continue;

    const newIndex = i < rowIndex ? i : i - 1;
    const newSheetRow = newIndex + 2;

    nonExtraCount++;
    renumberData.push({
      range: buildSheetRange(sheetName, `${ballColumn}${newSheetRow}`),
      values: [[nonExtraCount.toString()]],
    });

    if (allBalls[i].extraType) {
      nonExtraCount--;
    }
  }

  if (renumberData.length > 0) {
    await googleSheetsApi.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: "USER_ENTERED",
        data: renumberData,
      },
    });
  }
};

export const readBallData = async (
  googleSheetsApi: any,
  sheetName: string
): Promise<BallEntry[]> => {
  const spreadsheetId = getEnvVar("SPREADSHEET_ID");
  try {
    const response = await googleSheetsApi.spreadsheets.values.get({
        spreadsheetId,
        range: buildSheetRange(sheetName, "D2:Z"), // Data starts at D2
    });

    // Handle differences between nodejs googleapis (data.values) and browser gapi (result.values)
    const values = response.result
        ? response.result.values
        : response.data.values;

    if (!values) return [];

    return values.map(parseBallRow);
  } catch (err: any) {
    const errorMsg = err.result?.error?.message || err.message || "";
    if (errorMsg.includes("Unable to parse range") || err.status === 400) {
        // Sheet doesn't exist yet, return empty
        console.log(`Ball data for sheet ${sheetName} not found. Returning empty.`);
        return [];
    }
    throw err;
  }
};

/** Metadata for section headers — maps the sheet marker to display properties */
const SECTION_META: Record<string, { colorClass: string; icon: string }> = {
    "OVERALL":      { colorClass: "primary", icon: "📊" },
    "PACE VS SPIN": { colorClass: "info",    icon: "⚡" },
    "DISMISSALS":   { colorClass: "success", icon: "🧤" },
    "ERRORS":       { colorClass: "danger",  icon: "❌" },
    "EXTRAS":       { colorClass: "warning", icon: "🏏" },
};

export const readMatchInfo = async (
    googleSheetsApi: any,
    sheetName: string
): Promise<SheetMetadata> => {
    const spreadsheetId = getEnvVar("SPREADSHEET_ID");
    const empty: SheetMetadata = { info: {}, stats: {}, statSections: [] };
    try {
        const response = await googleSheetsApi.spreadsheets.values.get({
            spreadsheetId,
            range: buildSheetRange(sheetName, "A:B"),
        });

        const values = response.result
            ? response.result.values
            : response.data.values;

        if (!values) return empty;

        const info: Record<string, string> = {};
        const stats: Record<string, string> = {};
        const statSections: MatchStatsComputed = [];

        let isStatsSection = false;
        let currentSection: MatchStatSection | null = null;

        for (const row of values) {
            const key = row[0];
            const value = row[1] || "";

            if (!key) continue;
            if (key === "Match Info") continue;

            if (key === "Stats") {
                isStatsSection = true;
                continue;
            }

            if (!isStatsSection) {
                info[key] = value;
                continue;
            }

            // Check for section header like "-- OVERALL --"
            const sectionMatch = key.match(/^-- (.+) --$/);
            if (sectionMatch) {
                const sectionName = sectionMatch[1];
                const meta = SECTION_META[sectionName] || { colorClass: "secondary", icon: "📋" };
                currentSection = {
                    title: sectionName.split(' ').map((w: string) =>
                        ['vs', 'and', 'or'].includes(w.toLowerCase())
                            ? w.toLowerCase()
                            : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                    ).join(' '),
                    colorClass: meta.colorClass,
                    icon: meta.icon,
                    stats: [],
                };
                statSections.push(currentSection);
                continue;
            }

            // Regular stat row
            stats[key] = value;

            if (currentSection) {
                const numVal = parseFloat(value);
                const hasPctSuffix = key.endsWith("%");
                currentSection.stats.push({
                    label: key.replace(/ %$/, ""),
                    value: hasPctSuffix ? `${isNaN(numVal) ? "-" : numVal}%` : (value || "-"),
                    numericValue: isNaN(numVal) ? 0 : numVal,
                    suffix: hasPctSuffix ? "%" : undefined,
                });
            }
        }

        return { info, stats, statSections };

    } catch (err: any) {
        const errorMsg = err.result?.error?.message || err.message || "";
        if (errorMsg.includes("Unable to parse range") || err.status === 400) {
            console.log(`Match info for sheet ${sheetName} not found. Returning empty.`);
            return empty;
        }
        console.error(`Error reading match info for sheet ${sheetName}:`, err);
        return empty;
    }
};

/**
 * Converts a data object into a flat array for Google Sheets
 */
export const formatBallRow = (entry: BallEntry): string[] => {
  const toSheetValue = (value: string | undefined) =>
    value && value.trim().length > 0 ? value : SHEET_EMPTY_VALUE;

  return [
    entry.timestamp.toISOString(),
    entry.overCount.over.toString(),
    entry.overCount.ball.toString(),
    entry.bowlerType,
    toSheetValue(entry.wkPosition),
    toSheetValue(entry.deliveryPosition),
    entry.takeResult,
    toSheetValue(entry.collectionDifficulty),
    toSheetValue(entry.errorReason),
    toSheetValue(entry.throwInResult),
    toSheetValue(entry.extraType),
  ];
};

const parseOptionalCell = (value: string | undefined): string | undefined => {
  if (!value || value === SHEET_EMPTY_VALUE) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseWkPosition = (value: string | undefined): WkPosition | undefined => {
  const normalized = parseOptionalCell(value)?.toLowerCase();
  if (normalized === "up") return "Up";
  if (normalized === "back") return "Back";
  return undefined;
};

const normalizeBowlerType = (
  value: string | undefined
): BowlerType | string => {
  const trimmed = parseOptionalCell(value);
  if (!trimmed) return "RA seam";

  const lower = trimmed.toLowerCase();
  if (lower === "ra seam") return "RA seam";
  if (lower === "la seam") return "LA seam";
  if (lower === "ra leg spin") return "RA leg spin";
  if (lower === "ra off spin") return "RA off spin";
  if (lower === "la leg spin") return "LA leg spin";
  if (lower === "la off spin") return "LA off spin";

  // Remaining legacy value still present in older rows.
  if (lower === "la spin") return "LA off spin";

  return trimmed;
};

export const parseBallRow = (row: string[]): BallEntry => {
  const timestampStr = row[0];
  const overStr = row[1];
  const ballStr = row[2];
  const bowlerTypeRaw = row[3];
  const wkPositionRaw = row[4];
  const deliveryPositionRaw = row[5];
  const takeResultRaw = row[6];
  const collectionDifficultyRaw = row[7];
  const errorReasonRaw = row[8];
  const throwInResultRaw = row[9];
  const extraTypeRaw = row[10];

  return {
    timestamp: new Date(timestampStr),
    overCount: {
      over: Number(overStr) || 0,
      ball: Number(ballStr) || 0,
    },
    bowlerType: normalizeBowlerType(bowlerTypeRaw) as any,
    wkPosition: parseWkPosition(wkPositionRaw),
    deliveryPosition: parseOptionalCell(deliveryPositionRaw) as DeliveryPosition | undefined,
    takeResult: (parseOptionalCell(takeResultRaw) || "No touch") as any,
    collectionDifficulty: parseOptionalCell(collectionDifficultyRaw) as any,
    errorReason: parseOptionalCell(errorReasonRaw) as any,
    throwInResult: parseOptionalCell(throwInResultRaw) as any,
    extraType: parseOptionalCell(extraTypeRaw) as any,
  };
};

export const getRandomElement = <T>(arr: readonly T[]): T => {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
};

export const getEnvVar = (key: string): string => {
  const value =
    typeof process !== "undefined" && process.env
      ? process.env[key]
      : import.meta.env[`VITE_${key}`];
  if (typeof value === "undefined" || value === null || value === "") {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value;
};

/**
 * Lists match sheets with metadata-derived identity and stable date sorting.
 * Date/number come from metadata first and fallback to legacy match naming.
 */
export const listMatches = async (
  googleSheetsApi: any
): Promise<MatchSummary[]> => {
  const spreadsheetId = getEnvVar("SPREADSHEET_ID");
  const response = await googleSheetsApi.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const sheets = response.result ? response.result.sheets : response.data.sheets;
  if (!sheets) return [];

  const titles = sheets
    .map((sheet: any) => sheet.properties?.title)
    .filter((title: unknown): title is string => typeof title === "string");

  const parsed = await Promise.all(
    titles.map(async (sheetName: string) => {
      const metadata = await readMatchInfo(googleSheetsApi, sheetName);
      const matchIdentity = parseMatchIdentity(sheetName, metadata.info);
      const hasMatchMetadata = Boolean(
        metadata.info["Match ID"] || metadata.info["Match Number"]
      );
      const isLegacyNameMatch = LEGACY_MATCH_NAME_REGEX.test(sheetName);

      if (!hasMatchMetadata && !isLegacyNameMatch) {
        return null;
      }

      return matchIdentity;
    })
  );

  return parsed
    .filter((match): match is MatchSummary => match !== null)
    .sort((a, b) => {
      const dateComparison = compareNullableIsoDatesDesc(a.date, b.date);
      if (dateComparison !== 0) return dateComparison;

      const matchNumberComparison = compareNullableNumbersDesc(
        a.matchNumber,
        b.matchNumber
      );
      if (matchNumberComparison !== 0) return matchNumberComparison;

      return a.sheetName.localeCompare(b.sheetName);
    });
};

export const listSheetNames = async (
  googleSheetsApi: any
): Promise<string[]> => {
  const matches = await listMatches(googleSheetsApi);
  return matches.map((match) => match.sheetName);
};

/**
 * Converts a sheet name like "2025-02-20 - Match 1" to a short label like "20 Feb #1"
 */
export const formatShortMatchLabel = (sheetName: string): string => {
    const match = sheetName.match(LEGACY_MATCH_LABEL_REGEX);
    if (!match) return sheetName;
    const [, , monthStr, day, num] = match;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const prefix = sheetName.startsWith(SAMPLE_DATA_PREFIX) ? "[S] " : "";
    return `${prefix}${parseInt(day)} ${months[parseInt(monthStr) - 1]} #${num}`;
};

const getBowlerStyle = (bowlerType: string): Exclude<HeatmapBowlerFilter, "both"> | null => {
    const lower = bowlerType.toLowerCase();
    if (lower.includes("seam")) return "seam";
    if (lower.includes("spin")) return "spin";
    return null;
};

const buildDeliveryHeatmap = (balls: BallEntry[]): AggregateDeliveryPositionCell[] => {
    const positionGroups = new Map<string, { total: number; clean: number }>();
    for (const ball of balls) {
        if (!ball.deliveryPosition || ball.takeResult === "No touch") continue;
        if (!positionGroups.has(ball.deliveryPosition)) {
            positionGroups.set(ball.deliveryPosition, { total: 0, clean: 0 });
        }
        const group = positionGroups.get(ball.deliveryPosition)!;
        group.total++;
        if (successfulTakeResults.includes(ball.takeResult as any)) {
            group.clean++;
        }
    }

    return Array.from(positionGroups.entries()).map(([position, { total, clean }]) => ({
        position,
        total,
        cleanTakes: clean,
        cleanPct: total > 0 ? Math.round((clean / total) * 1000) / 10 : 0,
    }));
};

const parseNullableNumber = (value: string | undefined): number | null => {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Computes aggregate chart data from an array of match data.
 * Pure function — no side effects, no API calls.
 */
export const computeAggregateStats = (
    matches: MatchAggregateData[]
): AggregateChartData => {
    // 1. Build per-match trend data
    const trendData = matches.map((m) => ({
        label: m.sheetName,
        cleanTakesPct: parseNullableNumber(m.stats["Clean Takes %"]),
        cleanThrowInsPct: parseNullableNumber(m.stats["Clean Throw Ins %"]),
    }));

    // 2. Flatten all balls across matches
    const allBalls = matches.flatMap((m) => m.balls);

    // 3. Compute averages
    const averages = computeAverages(trendData, allBalls);

    // 4. Error reason breakdown
    const errorCounts = new Map<string, number>();
    for (const ball of allBalls) {
        if (ball.errorReason) {
            errorCounts.set(ball.errorReason, (errorCounts.get(ball.errorReason) || 0) + 1);
        }
    }
    const errorReasonBreakdown = Array.from(errorCounts.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);

    // 5. Takes by bowler type
    const bowlerGroups = new Map<string, { clean: number; errors: number; total: number }>();
    for (const ball of allBalls) {
        if (!bowlerGroups.has(ball.bowlerType)) {
            bowlerGroups.set(ball.bowlerType, { clean: 0, errors: 0, total: 0 });
        }
        const group = bowlerGroups.get(ball.bowlerType)!;
        group.total++;
        if (successfulTakeResults.includes(ball.takeResult as any)) {
            group.clean++;
        } else if (ball.takeResult !== "No touch") {
            group.errors++;
        }
    }
    const takesByBowlerType = Array.from(bowlerGroups.entries())
        .map(([bowlerType, { clean, errors, total }]) => ({
            bowlerType,
            cleanTakes: clean,
            errors,
            total,
            cleanPct: total > 0 ? Math.round((clean / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.total - a.total);

    // 6. Collection difficulty ratio
    let regulation = 0;
    let difficult = 0;
    for (const ball of allBalls) {
        if (ball.collectionDifficulty === "Regulation") regulation++;
        else if (ball.collectionDifficulty === "Difficult") difficult++;
    }
    const collectionDifficultyRatio = { regulation, difficult };

    // 7. Delivery position heatmap (both / seam / spin)
    const seamBalls = allBalls.filter((ball) => getBowlerStyle(ball.bowlerType) === "seam");
    const spinBalls = allBalls.filter((ball) => getBowlerStyle(ball.bowlerType) === "spin");
    const deliveryPositionHeatmap = {
        both: buildDeliveryHeatmap(allBalls),
        seam: buildDeliveryHeatmap(seamBalls),
        spin: buildDeliveryHeatmap(spinBalls),
    };

    // 8. Take result breakdown
    const takeResultCounts = new Map<string, number>();
    for (const ball of allBalls) {
        takeResultCounts.set(ball.takeResult, (takeResultCounts.get(ball.takeResult) || 0) + 1);
    }
    const takeResultBreakdown = Array.from(takeResultCounts.entries())
        .map(([result, count]) => ({ result, count }))
        .sort((a, b) => b.count - a.count);

    return {
        trendData,
        averages,
        errorReasonBreakdown,
        takesByBowlerType,
        collectionDifficultyRatio,
        deliveryPositionHeatmap,
        takeResultBreakdown,
    };
};

/** Computes average metrics across all matches */
const computeAverages = (
    trendData: Array<{ cleanTakesPct: number | null; cleanThrowInsPct: number | null }>,
    allBalls: BallEntry[]
): AggregateAverages => {
    // Average Clean Takes %
    const validTakes = trendData.filter((d) => d.cleanTakesPct !== null).map((d) => d.cleanTakesPct!);
    const cleanTakesPct = validTakes.length > 0
        ? Math.round((validTakes.reduce((a, b) => a + b, 0) / validTakes.length) * 10) / 10
        : null;

    // Average Clean Throw Ins %
    const validThrowIns = trendData.filter((d) => d.cleanThrowInsPct !== null).map((d) => d.cleanThrowInsPct!);
    const cleanThrowInsPct = validThrowIns.length > 0
        ? Math.round((validThrowIns.reduce((a, b) => a + b, 0) / validThrowIns.length) * 10) / 10
        : null;

    // Error rate: balls with errors / total balls (excluding "No touch")
    const touchedBalls = allBalls.filter((b) => b.takeResult !== "No touch");
    const errorBalls = touchedBalls.filter(
        (b) => !successfulTakeResults.includes(b.takeResult as any)
    );
    const errorRate = touchedBalls.length > 0
        ? Math.round((errorBalls.length / touchedBalls.length) * 1000) / 10
        : null;

    // Regulation %: regulation / (regulation + difficult)
    const withDifficulty = allBalls.filter((b) => b.collectionDifficulty);
    const regulationCount = withDifficulty.filter((b) => b.collectionDifficulty === "Regulation").length;
    const regulationPct = withDifficulty.length > 0
        ? Math.round((regulationCount / withDifficulty.length) * 1000) / 10
        : null;

    return { cleanTakesPct, cleanThrowInsPct, errorRate, regulationPct };
};
