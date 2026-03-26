import { useState, useEffect, useRef, useCallback } from "react";
import { listSheetNames, readMatchInfo, readBallData } from "../api/sheets";
import { computeAggregateStats } from "../../../common/utils";
import type {
    AggregateRangeOption,
    MatchAggregateData,
    AggregateChartData,
} from "../../../common/types";

type AggregateDataState = {
    isLoading: boolean;
    error: string | null;
    sheetNames: string[];
    selectedRange: AggregateRangeOption;
    chartData: AggregateChartData | null;
    matchCount: number;
};

const initialState: AggregateDataState = {
    isLoading: false,
    error: null,
    sheetNames: [],
    selectedRange: 5,
    chartData: null,
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

        listSheetNames()
            .then((names) => {
                setState((prev) => ({ ...prev, sheetNames: names }));
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

        const sheetsToFetch =
            state.selectedRange === "all"
                ? state.sheetNames
                : state.sheetNames.slice(0, state.selectedRange);

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
        const uncachedSheets = sheetsToFetch.filter(
            (name) => !cacheRef.current.has(name)
        );

        // If everything is cached, just recompute
        if (uncachedSheets.length === 0) {
            const matchData = sheetsToFetch
                .map((name) => cacheRef.current.get(name)!)
                .reverse(); // Chronological order for charts
            const chartData = computeAggregateStats(matchData);
            setState((prev) => ({
                ...prev,
                isLoading: false,
                chartData,
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

            const matchNumberMatch = sheetName.match(/Match (\d+)/);
            const dateMatch = sheetName.match(/^(\d{4}-\d{2}-\d{2})/);

            const data: MatchAggregateData = {
                sheetName,
                date: dateMatch ? dateMatch[1] : "",
                matchNumber: matchNumberMatch ? parseInt(matchNumberMatch[1]) : 1,
                stats: metaResult.stats,
                balls: ballResult,
            };

            return data;
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
                const matchData = sheetsToFetch
                    .filter((name) => cacheRef.current.has(name))
                    .map((name) => cacheRef.current.get(name)!)
                    .reverse(); // Chronological order for charts

                const chartData = computeAggregateStats(matchData);
                const failedCount = results.filter((r) => r.status === "rejected").length;

                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    chartData,
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
