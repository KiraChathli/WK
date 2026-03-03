import * as dotenv from "dotenv";
import { google } from "googleapis";
import { GOOGLE_API_SCOPE, SAMPLE_DATA_PREFIX } from "../common/consts.ts";
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

// ── Configuration ──────────────────────────────────────────
const NUM_MATCHES = 8; // Total number of match sheets to create
const MATCHES_PER_DAY = 2; // Max matches on any single day
const NUM_OVERS = 20; // Overs per match
const OVER_LENGTH = 6; // Balls per over
const POST_BALL_DELAY = 1; // Minutes between balls
const POST_OVER_DELAY = 5; // Minutes between overs
const START_DATE = new Date("2025-01-15"); // Date of first match
const DAY_GAP_MIN = 2; // Min days between match days
const DAY_GAP_MAX = 7; // Max days between match days

async function populate() {
  const client = await auth.getClient();
  const sheetsApi = google.sheets({ version: "v4", auth: client as any });

  const matchSheets = generateMatchPlan();

  for (const { sheetName, startTime } of matchSheets) {
    const balls = generateMatchBalls(startTime);
    await utils.logMultipleBallsToSheet(balls, sheetsApi, sheetName, true);
    console.log(`Created "${sheetName}" (${balls.length} balls)`);
  }

  console.log(`\nSuccessfully populated ${matchSheets.length} matches.`);
}

/** Build a list of sheet names and start times for each match. */
function generateMatchPlan(): { sheetName: string; startTime: Date }[] {
  const plan: { sheetName: string; startTime: Date }[] = [];
  let currentDate = new Date(START_DATE);
  let matchesCreated = 0;

  while (matchesCreated < NUM_MATCHES) {
    const matchesThisDay = Math.min(
      randomInt(1, MATCHES_PER_DAY),
      NUM_MATCHES - matchesCreated,
    );

    for (let m = 1; m <= matchesThisDay; m++) {
      const dateStr = formatDate(currentDate);
      const sheetName = `${SAMPLE_DATA_PREFIX} ${dateStr} - Match ${m}`;
      const startTime = new Date(currentDate);
      startTime.setHours(9 + (m - 1) * 3, 0, 0, 0);
      plan.push({ sheetName, startTime });
      matchesCreated++;
    }

    const gap = randomInt(DAY_GAP_MIN, DAY_GAP_MAX);
    currentDate.setDate(currentDate.getDate() + gap);
  }

  return plan;
}

/** Generate ball entries for a single match. */
function generateMatchBalls(startTime: Date): BallEntry[] {
  const rows: BallEntry[] = [];
  let timestamp = new Date(startTime);

  for (let over = 0; over < NUM_OVERS; over++) {
    const bowlerType: BowlerType = utils.getRandomElement(bowlerTypes);

    for (let ball = 0; ball < OVER_LENGTH; ball++) {
      const takeResult: TakeResult = utils.getRandomElement(takeResults);
      let collectionDifficulty: CollectionDifficulty | undefined;
      let errorReason: ErrorReason | undefined;

      if (["Clean take", "Catch", "Stumping"].includes(takeResult)) {
        collectionDifficulty = utils.getRandomElement(collectionDifficulties);
      } else if (takeResult !== "No touch") {
        errorReason = utils.getRandomElement(errorReasons);
      }

      timestamp = addMinutes(timestamp, POST_BALL_DELAY);

      rows.push({
        timestamp,
        overCount: { over, ball: ball + 1 },
        bowlerType,
        deliveryPosition: utils.getRandomElement(deliveryPositions) as any,
        takeResult,
        collectionDifficulty,
        errorReason,
        throwInResult: utils.getRandomElement(throwInResults),
      });
    }

    timestamp = addMinutes(timestamp, POST_OVER_DELAY);
  }

  return rows;
}

// ── Helpers ────────────────────────────────────────────────

const addMinutes = (date: Date, minutes: number): Date => {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
};

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

populate();
