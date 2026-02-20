import * as dotenv from "dotenv";
import { google } from "googleapis";
import { GOOGLE_API_SCOPE } from "../common/consts.ts";
import type {
  BallEntry,
  BowlerType,
  CollectionDifficulty,
  ErrorReason,
  TakeResult,
} from "../common/types.ts";
import {
  bowlerTypes,
  collectionDifficulties,
  deliveryPositions,
  errorReasons,
  takeResults,
  throwInResults,
} from "../common/types.ts";
import * as utils from "../common/utils.ts";
dotenv.config();

const auth = new google.auth.GoogleAuth({
  keyFile: "./service-account-key.json", // Downloaded from Google Cloud
  scopes: [GOOGLE_API_SCOPE],
});

const NUM_OVERS = 20;
const OVER_LENGTH = 6;
const POST_BALL_DELAY = 1;
const POST_OVER_DELAY = 5;

async function populate() {
  const client = await auth.getClient();
  const sheetsApi = google.sheets({ version: "v4", auth: client as any });

  const dummyData = generateDummyRows();

  const sheetName = utils.getEnvVar("SPREADSHEET_NAME");
  await utils.logMultipleBallsToSheet(dummyData, sheetsApi, sheetName, true);

  console.log(`Successfully populated sheet with ${NUM_OVERS} overs.`);
}

const generateDummyRows = (): BallEntry[] => {
  let rows: BallEntry[] = [];
  let timestamp = new Date();
  for (let i = 0; i < NUM_OVERS; i++) {
    // Pick a random bowler type
    const bowlerType: BowlerType = utils.getRandomElement(bowlerTypes);

    Array.from({ length: OVER_LENGTH }, (_, ballIndex) => {
      const takeResult: TakeResult = utils.getRandomElement(takeResults);
      let collectionDifficulty: CollectionDifficulty | undefined;
      let errorReason: ErrorReason | undefined;

      if (["Clean take", "Catch", "Stumping"].includes(takeResult)) {
        collectionDifficulty = utils.getRandomElement(collectionDifficulties);
      } else if (takeResult !== "No touch") {
        errorReason = utils.getRandomElement(errorReasons);
      }

      timestamp = addMinutes(timestamp, POST_BALL_DELAY);

      const entry: BallEntry = {
        timestamp,
        overCount: { over: i, ball: ballIndex + 1 },
        bowlerType,
        deliveryPosition: utils.getRandomElement(deliveryPositions) as any,
        takeResult,
        collectionDifficulty,
        errorReason,
        throwInResult: utils.getRandomElement(throwInResults),
      };

      rows.push(entry);
    });

    timestamp = addMinutes(timestamp, POST_OVER_DELAY);
  }
  return rows;
};

const addMinutes = (date: Date, minutes: number): Date => {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
};

populate();
