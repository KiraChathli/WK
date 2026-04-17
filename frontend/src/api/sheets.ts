import { gapi } from "gapi-script";
import { GOOGLE_API_DISCOVERY, GOOGLE_API_SCOPE } from "../../../common/consts";
import type { BallEntry, MatchSummary } from "../../../common/types.ts";
import * as utils from "../../../common/utils.ts";
import {
  getEmailLocalStorage,
  setEmailLocalStorage,
  setGoogleAccessToken,
  setGoogleTokenExpiry,
} from "../utils.ts";

const CLIENT_ID = utils.getEnvVar("CLIENT_ID");

let tokenClient: any;

export const initGoogleClient = (
  onStatusChange: (isSignedIn: boolean | null) => void
) => {
  // 1. Initialize GAPI for the Sheets API
  gapi.load("client", async () => {
    await gapi.client.init({
      discoveryDocs: [GOOGLE_API_DISCOVERY],
    });

    // CHECK FOR PERSISTED TOKEN
    const storedToken = localStorage.getItem("google_access_token");
    const expiresAt = localStorage.getItem("google_token_expiry");

    if (storedToken && expiresAt && Date.now() < Number(expiresAt)) {
      gapi.client.setToken({ access_token: storedToken });
      onStatusChange(true);
    } else {
      onStatusChange(false);
    }
  });

  // 2. Initialize GIS for Authentication
  // @ts-ignore
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: GOOGLE_API_SCOPE,
    prompt: "", // Set to empty string to avoid forced consent/selection
    login_hint: getEmailLocalStorage() || undefined, // Pre-selects the account
    callback: async (tokenResponse: any) => {
      if (tokenResponse && tokenResponse.access_token) {
        const accessToken = tokenResponse.access_token;

        const expiry = Date.now() + tokenResponse.expires_in * 1000;
        setGoogleAccessToken(accessToken);
        setGoogleTokenExpiry(expiry.toString());

        try {
          const userInfo = await fetchUserInfo(accessToken);
          setEmailLocalStorage(userInfo.email); // SAVE FOR LOGIN_HINT
        } catch (err) {
          console.error("Could not get user email", err);
        }
        onStatusChange(true);
      }
    },
  });
};

export const signIn = () => {
  tokenClient.requestAccessToken({ prompt: "" });
};
export const signOut = () => {
  localStorage.removeItem("google_access_token");
  localStorage.removeItem("google_token_expiry");
};

export const logBallToSheet = async (entry: BallEntry, sheetName: string) =>
  await utils.logBallToSheet(entry, gapi.client.sheets, sheetName);

export const readBallData = async (sheetName: string): Promise<BallEntry[]> =>
  await utils.readBallData(gapi.client.sheets, sheetName);

export const updateBallInSheet = async (
  entry: BallEntry,
  sheetName: string,
  rowIndex: number
) => await utils.updateBallInSheet(entry, gapi.client.sheets, sheetName, rowIndex);

export const deleteBallFromSheet = async (
  sheetName: string,
  rowIndex: number
) => await utils.deleteBallFromSheet(gapi.client.sheets, sheetName, rowIndex);

export const readMatchInfo = async (sheetName: string) =>
    await utils.readMatchInfo(gapi.client.sheets, sheetName);

export const listSheetNames = async (): Promise<string[]> =>
    await utils.listSheetNames(gapi.client.sheets);

export const listMatches = async (): Promise<MatchSummary[]> =>
    await utils.listMatches(gapi.client.sheets);

export const getColumnLetter = utils.getColumnLetter;

/**
 * Fetches basic profile info (email, name) using the access token
 */
export const fetchUserInfo = async (accessToken: string) => {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  const data = await response.json();
  return data; // contains data.email, data.name, data.picture, etc.
};
