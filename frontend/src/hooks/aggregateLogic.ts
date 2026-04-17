import type {
  AggregateRangeOption,
  BallEntry,
  MatchAggregateData,
  MatchInfo,
  MatchStats,
} from "../../../common/types";
import { parseMatchIdentity } from "../../../common/utils";

export const getSheetsForSelectedRange = (
  sheetNames: string[],
  selectedRange: AggregateRangeOption
): string[] =>
  selectedRange === "all" ? sheetNames : sheetNames.slice(0, selectedRange);

export const getUncachedSheets = (
  sheetsToFetch: string[],
  cache: Map<string, MatchAggregateData>
): string[] => sheetsToFetch.filter((name) => !cache.has(name));

export const buildMatchAggregateData = (
  sheetName: string,
  info: MatchInfo,
  stats: MatchStats,
  balls: BallEntry[]
): MatchAggregateData => {
  const matchIdentity = parseMatchIdentity(sheetName, info);

  return {
    sheetName,
    date: matchIdentity.date ?? "",
    matchNumber: matchIdentity.matchNumber ?? 1,
    stats,
    balls,
  };
};

export const getChronologicalMatchData = (
  sheetsToFetch: string[],
  cache: Map<string, MatchAggregateData>
): MatchAggregateData[] =>
  sheetsToFetch
    .filter((name) => cache.has(name))
    .map((name) => cache.get(name)!)
    .reverse();

export const countRejectedSettledResults = (
  results: PromiseSettledResult<unknown>[]
): number => results.filter((result) => result.status === "rejected").length;

export const getAllBallsFromMatches = (
  matches: MatchAggregateData[]
): BallEntry[] => matches.flatMap((match) => match.balls);
