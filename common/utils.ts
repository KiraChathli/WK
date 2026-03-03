import {
  type BallEntry,
  type MatchAggregateData,
  type AggregateChartData,
  type AggregateAverages,
  SHEET_HEADERS,
  type SheetMetadata,
  successfulTakeResults,
  successfulThrowInResults,
} from "./types.ts";
import { SHEET_EMPTY_VALUE, SAMPLE_DATA_PREFIX } from "./consts.ts";

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  const values = balls.map(formatBallRow);
  const spreadsheetId = getEnvVar("SPREADSHEET_ID");

  const appendRequest = {
    spreadsheetId: spreadsheetId,
    range: `${sheetName}!D2`, // Append to Data columns (D onwards)
    valueInputOption: "USER_ENTERED",
    ...(!isLocal && { resource: { values } }),
    ...(isLocal && { requestBody: { values } }),
  };

  try {
    await googleSheetsApi.spreadsheets.values.append(appendRequest);
  } catch (err: any) {
    // If sheet doesn't exist, Create it and retry
    // Error encoded string often contains "Unable to parse range"
    const errorMsg = err.result?.error?.message || err.message || "";
    if (errorMsg.includes("Unable to parse range") || err.status === 400) {
       console.log(`Sheet ${sheetName} not found. Creating...`);

       // Create the new sheet
       await googleSheetsApi.spreadsheets.batchUpdate({
         spreadsheetId,
         resource: {
           requests: [
             {
               addSheet: {
                 properties: {
                   title: sheetName
                 }
               }
             }
           ]
         }
       });

       // Create Header Row at D1
       await googleSheetsApi.spreadsheets.values.append({
         spreadsheetId,
         range: `${sheetName}!D1`,
         valueInputOption: "USER_ENTERED",
         resource: { values: [SHEET_HEADERS] }
       });

       // Create Metadata and Stats in Columns A and B
       const matchNumberMatch = sheetName.match(/Match (\d+)/i);
       const matchNumber = matchNumberMatch ? matchNumberMatch[1] : "1";

       const metadataUpdates = [
           ["Match Info", ""],
           ["Date", new Date().toLocaleDateString()],
           ["Start Time", new Date().toLocaleTimeString()],
           ["Match ID", sheetName], // Sheet name is the ID
           ["Match Number", matchNumber], // Parsed from sheet name
           ["", ""], // Empty row (A6)
           ["Stats", ""] // Header for Stats (A7)
       ];

       await googleSheetsApi.spreadsheets.values.append({
           spreadsheetId,
           range: `${sheetName}!A1`,
           valueInputOption: "USER_ENTERED",
           resource: { values: metadataUpdates }
       });


       // Create Statistics Formulas
       const dataStartColIndex = 3; // D

       const takeHeaderIndex = SHEET_HEADERS.indexOf("Take");
       const throwInHeaderIndex = SHEET_HEADERS.indexOf("Throw In");

       if (takeHeaderIndex !== -1 && throwInHeaderIndex !== -1) {
           const takeCol = getColumnLetter(dataStartColIndex + takeHeaderIndex);
           const throwInCol = getColumnLetter(dataStartColIndex + throwInHeaderIndex);

           // Generate dynamic formulas based on successful results
           const takeSuccessCount = successfulTakeResults
               .map((r) => `COUNTIF(${takeCol}2:${takeCol}, "${r}")`)
               .join(" + ");

           const throwInSuccessCount = successfulThrowInResults
               .map((r) => `COUNTIF(${throwInCol}2:${throwInCol}, "${r}")`)
               .join(" + ");

           const statsUpdates = [
               [ "Clean Takes %", `=ROUND(100 * (${takeSuccessCount}) / (COUNTA(${takeCol}2:${takeCol}) - COUNTIF(${takeCol}2:${takeCol}, "No touch")), 1)` ],
               [ "Clean Throw Ins %", `=ROUND(100 * (${throwInSuccessCount}) / (COUNTA(${throwInCol}2:${throwInCol}) - COUNTIF(${throwInCol}2:${throwInCol}, "${SHEET_EMPTY_VALUE}") - COUNTIF(${throwInCol}2:${throwInCol}, "No touch")), 1)` ]
           ];

           // Insert Stats after Metadata
           await googleSheetsApi.spreadsheets.values.append({
               spreadsheetId,
               range: `${sheetName}!A${metadataUpdates.length + 1}`,
               valueInputOption: "USER_ENTERED",
               resource: { values: statsUpdates }
           });
       }

       // Append the data
       await googleSheetsApi.spreadsheets.values.append(appendRequest);
    } else {
      throw err;
    }
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
        range: `${sheetName}!D2:Z`, // Data starts at D2
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

export const readMatchInfo = async (
    googleSheetsApi: any,
    sheetName: string
): Promise<SheetMetadata> => {
    const spreadsheetId = getEnvVar("SPREADSHEET_ID");
    try {
        const response = await googleSheetsApi.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:B`, // Read Cols A and B
        });

        const values = response.result
            ? response.result.values
            : response.data.values;

        if (!values) return { info: {}, stats: {} };

        const info: Record<string, string> = {};
        const stats: Record<string, string> = {};

        // Parse: Read until empty row or "Stats" header
        let isStatsSection = false;

        for (const row of values) {
            const key = row[0];
            const value = row[1] || "";

            if (!key) continue; // Skip empty keys/rows

            if (key === "Match Info") continue; // Header

            if (key === "Stats") {
                isStatsSection = true;
                continue;
            }

            if (isStatsSection) {
                stats[key] = value;
            } else {
                info[key] = value;
            }
        }

        return { info, stats };

    } catch (err: any) {
        const errorMsg = err.result?.error?.message || err.message || "";
        if (errorMsg.includes("Unable to parse range") || err.status === 400) {
            console.log(`Match info for sheet ${sheetName} not found. Returning empty.`);
            return { info: {}, stats: {} };
        }
        console.error(`Error reading match info for sheet ${sheetName}:`, err);
        return { info: {}, stats: {} };
    }
};

/**
 * Converts a data object into a flat array for Google Sheets
 */
export const formatBallRow = (entry: BallEntry): string[] => {
  return [
    entry.timestamp.toISOString(),
    entry.overCount.over.toString(),
    entry.overCount.ball.toString(),
    entry.bowlerType,
    entry.deliveryPosition,
    entry.takeResult,
    entry.collectionDifficulty || SHEET_EMPTY_VALUE,
    entry.errorReason || SHEET_EMPTY_VALUE,
    entry.throwInResult || SHEET_EMPTY_VALUE,
  ];
};

export const parseBallRow = (row: string[]): BallEntry => {
  const [
    timestampStr,
    overStr,
    ballStr,
    bowlerType,
    deliveryPosition,
    takeResult,
    collectionDifficulty,
    errorReason,
    throwInResult,
  ] = row;

  return {
    timestamp: new Date(timestampStr),
    overCount: {
      over: Number(overStr) || 0,
      ball: Number(ballStr) || 0,
    },
    bowlerType: bowlerType as any,
    deliveryPosition: deliveryPosition as any,
    takeResult: takeResult as any,
    collectionDifficulty: collectionDifficulty === SHEET_EMPTY_VALUE ? undefined : (collectionDifficulty as any),
    errorReason: errorReason === SHEET_EMPTY_VALUE ? undefined : (errorReason as any),
    throwInResult: throwInResult === SHEET_EMPTY_VALUE ? undefined : (throwInResult as any),
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
 * Lists all sheet names in the spreadsheet that match the match naming convention,
 * sorted reverse-chronologically (most recent first).
 */
export const listSheetNames = async (
    googleSheetsApi: any
): Promise<string[]> => {
    const spreadsheetId = getEnvVar("SPREADSHEET_ID");
    const response = await googleSheetsApi.spreadsheets.get({
        spreadsheetId,
        fields: "sheets.properties.title",
    });

    const sheets = response.result
        ? response.result.sheets
        : response.data.sheets;

    if (!sheets) return [];

    const escapedPrefix = escapeRegExp(SAMPLE_DATA_PREFIX);
    const regex = new RegExp(`^(?:${escapedPrefix} )?\\d{4}-\\d{2}-\\d{2} - Match \\d+$`);

    return sheets
        .map((s: any) => s.properties.title)
        .filter((title: string) => regex.test(title))
        .sort()
        .reverse(); // Most recent first
};

/**
 * Converts a sheet name like "2025-02-20 - Match 1" to a short label like "20 Feb #1"
 */
export const formatShortMatchLabel = (sheetName: string): string => {
    const escapedPrefix = escapeRegExp(SAMPLE_DATA_PREFIX);
    const regex = new RegExp(`^(?:${escapedPrefix} )?(\\d{4})-(\\d{2})-(\\d{2}) - Match (\\d+)$`);
    const match = sheetName.match(regex);
    if (!match) return sheetName;
    const [, , monthStr, day, num] = match;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const prefix = sheetName.startsWith(SAMPLE_DATA_PREFIX) ? "[S] " : "";
    return `${prefix}${parseInt(day)} ${months[parseInt(monthStr) - 1]} #${num}`;
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
        label: formatShortMatchLabel(m.sheetName),
        cleanTakesPct: m.stats["Clean Takes %"] ? parseFloat(m.stats["Clean Takes %"]) : null,
        cleanThrowInsPct: m.stats["Clean Throw Ins %"] ? parseFloat(m.stats["Clean Throw Ins %"]) : null,
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

    // 7. Delivery position heatmap
    const positionGroups = new Map<string, { total: number; clean: number }>();
    for (const ball of allBalls) {
        if (!positionGroups.has(ball.deliveryPosition)) {
            positionGroups.set(ball.deliveryPosition, { total: 0, clean: 0 });
        }
        const group = positionGroups.get(ball.deliveryPosition)!;
        group.total++;
        if (successfulTakeResults.includes(ball.takeResult as any)) {
            group.clean++;
        }
    }
    const deliveryPositionHeatmap = Array.from(positionGroups.entries())
        .map(([position, { total, clean }]) => ({
            position,
            total,
            cleanTakes: clean,
            cleanPct: total > 0 ? Math.round((clean / total) * 1000) / 10 : 0,
        }));

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

