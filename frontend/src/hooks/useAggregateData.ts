import { useState, useEffect, useRef, useCallback } from "react";
import { listMatches, readMatchInfo, readBallData } from "../api/sheets";
import { computeAggregateStats } from "../../../common/utils";
import type {
    AggregateRangeOption,
    BallEntry,
    MatchAggregateData,
    AggregateChartData,
} from "../../../common/types";
import {
    buildMatchAggregateData,
    countRejectedSettledResults,
    getAllBallsFromMatches,
    getChronologicalMatchData,
    getSheetsForSelectedRange,
    getUncachedSheets,
} from "./aggregateLogic";

type AggregateDataState = {
    isLoading: boolean;
    error: string | null;
    sheetNames: string[];
    selectedRange: AggregateRangeOption;
    chartData: AggregateChartData | null;
    allBalls: BallEntry[];
    matchCount: number;
};

const initialState: AggregateDataState = {
    isLoading: false,
    error: null,
    sheetNames: [],
    selectedRange: 5,
    chartData: null,
    allBalls: [],
    matchCount: 0,
};

export const useAggregateData = (isSignedIn: boolean) => {
    const [state, setState] = useState<AggregateDataState>(initialState);
    const cacheRef = useRef<Map<string, MatchAggregateData>>(new Map());
    const isFetchingRef = useRef(false);

    // Step 1: Fetch all sheet names when signed in
    useEffect(() => {
        if (!isSignedIn) return;

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        listMatches()
            .then((matches) => {
                setState((prev) => ({
                    ...prev,
                    sheetNames: matches.map((match) => match.sheetName),
                }));
            })
            .catch((err) => {
                console.error("Error listing sheets:", err);
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: "Failed to load match list.",
                }));
            });
    }, [isSignedIn]);

    // Step 2: Fetch data for the selected range of sheets
    useEffect(() => {
        if (state.sheetNames.length === 0) return;
        if (isFetchingRef.current) return;

        const sheetsToFetch = getSheetsForSelectedRange(
            state.sheetNames,
            state.selectedRange
        );

        if (sheetsToFetch.length === 0) {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                chartData: null,
                matchCount: 0,
            }));
            return;
        }

        // Determine which sheets need fetching (not in cache)
        const uncachedSheets = getUncachedSheets(sheetsToFetch, cacheRef.current);

        // If everything is cached, just recompute
        if (uncachedSheets.length === 0) {
            const matchData = getChronologicalMatchData(
                sheetsToFetch,
                cacheRef.current
            );
            const chartData = computeAggregateStats(matchData);
            setState((prev) => ({
                ...prev,
                isLoading: false,
                chartData,
                allBalls: getAllBallsFromMatches(matchData),
                matchCount: matchData.length,
            }));
            return;
        }

        isFetchingRef.current = true;
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Fetch uncached sheets in parallel
        const fetchPromises = uncachedSheets.map(async (sheetName) => {
            const [metaResult, ballResult] = await Promise.all([
                readMatchInfo(sheetName),
                readBallData(sheetName),
            ]);

            return buildMatchAggregateData(
                sheetName,
                metaResult.info,
                metaResult.stats,
                ballResult
            );
        });

        Promise.allSettled(fetchPromises)
            .then((results) => {
                // Cache successful results
                for (const result of results) {
                    if (result.status === "fulfilled") {
                        cacheRef.current.set(result.value.sheetName, result.value);
                    }
                }

                // Build array from all requested sheets (cached + newly fetched)
                const matchData = getChronologicalMatchData(
                    sheetsToFetch,
                    cacheRef.current
                );

                const chartData = computeAggregateStats(matchData);
                const failedCount = countRejectedSettledResults(results);

                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    chartData,
                    allBalls: getAllBallsFromMatches(matchData),
                    matchCount: matchData.length,
                    error: failedCount > 0
                        ? `${failedCount} match(es) could not be loaded.`
                        : null,
                }));
            })
            .catch((err) => {
                console.error("Error fetching aggregate data:", err);
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: "Failed to load match data.",
                }));
            })
            .finally(() => {
                isFetchingRef.current = false;
            });
    }, [state.sheetNames, state.selectedRange]);

    const setSelectedRange = useCallback((range: AggregateRangeOption) => {
        setState((prev) => ({ ...prev, selectedRange: range }));
    }, []);

    return {
        ...state,
        setSelectedRange,
    };
};
