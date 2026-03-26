import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
} from "recharts";
import ChartCard from "./ChartCard";
import type { AggregateChartData } from "../../../../../common/types";

interface TrendLineChartProps {
    data: AggregateChartData["trendData"];
}

const TrendLineChart = ({ data }: TrendLineChartProps) => {
    if (data.length === 0) return null;

    return (
        <ChartCard title="Performance Trend" description="Clean take and throw-in percentages over time. Track how your keeping consistency changes across matches.">
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                    <Line
                        type="monotone"
                        dataKey="cleanTakesPct"
                        name="Clean Takes %"
                        stroke="#0d6efd"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                    />
                    <Line
                        type="monotone"
                        dataKey="cleanThrowInsPct"
                        name="Clean Throw Ins %"
                        stroke="#198754"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};

export default TrendLineChart;
