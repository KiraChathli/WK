import type {
  AggregateRangeOption,
  BallEntry,
  MatchAggregateData,
  MatchStats,
} from "../../../common/types";

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
  stats: MatchStats,
  balls: BallEntry[]
): MatchAggregateData => {
  const matchNumberMatch = sheetName.match(/Match (\d+)/);
  const dateMatch = sheetName.match(/^(\d{4}-\d{2}-\d{2})/);

  return {
    sheetName,
    date: dateMatch ? dateMatch[1] : "",
    matchNumber: matchNumberMatch ? parseInt(matchNumberMatch[1], 10) : 1,
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
