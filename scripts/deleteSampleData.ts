import * as dotenv from "dotenv";
import { google } from "googleapis";
import { GOOGLE_API_SCOPE, SAMPLE_DATA_PREFIX } from "../common/consts.ts";
import { getEnvVar } from "../common/utils.ts";

dotenv.config();

const auth = new google.auth.GoogleAuth({
  keyFile: "./service-account-key.json", // Downloaded from Google Cloud
  scopes: [GOOGLE_API_SCOPE],
});

async function deleteSampleData() {
  const client = await auth.getClient();
  const sheetsApi = google.sheets({ version: "v4", auth: client as any });
  const spreadsheetId = getEnvVar("SPREADSHEET_ID");

  console.log(`Fetching sheets from spreadsheet ${spreadsheetId}...`);

  try {
    const response = await sheetsApi.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties(title,sheetId)",
    });

    const sheets = response.data?.sheets || (response as any).result?.sheets;
    if (!sheets) {
      console.log("No sheets found in the spreadsheet.");
      return;
    }

    const sampleSheets = sheets.filter((s: any) =>
      s.properties.title.startsWith(`${SAMPLE_DATA_PREFIX} `)
    );

    if (sampleSheets.length === 0) {
      console.log("No sample data sheets found to delete.");
      return;
    }

    console.log(`Found ${sampleSheets.length} sample sheets. Deleting...`);

    const requests = sampleSheets.map((s: any) => ({
      deleteSheet: {
        sheetId: s.properties.sheetId,
      },
    }));

    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests,
      },
    } as any);

    console.log(`Successfully deleted ${sampleSheets.length} sample sheets.`);
  } catch (err: any) {
    console.error("Error executing sheet deletion:", err.result?.error?.message || err.message);
  }
}

deleteSampleData();
