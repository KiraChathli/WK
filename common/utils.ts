import {
  type BallEntry,
  SHEET_HEADERS,
  type SheetMetadata,
  successfulTakeResults,
  successfulThrowInResults,
} from "./types.ts";
import { SHEET_EMPTY_VALUE } from "./consts.ts";

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
        console.error("Error reading match info:", err);
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

