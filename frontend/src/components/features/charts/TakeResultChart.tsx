import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
import ChartCard from "./ChartCard";
import type { AggregateChartData } from "../../../../../common/types";

interface TakeResultChartProps {
    data: AggregateChartData["takeResultBreakdown"];
}

const TakeResultChart = ({ data }: TakeResultChartProps) => {
    if (data.length === 0) return null;

    const height = Math.max(data.length * 40 + 20, 120);

    return (
        <ChartCard title="Take Results" className="h-100">
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                >
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                        type="category"
                        dataKey="result"
                        width={110}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar
                        dataKey="count"
                        name="Count"
                        fill="#0d6efd"
                        radius={[0, 4, 4, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};

export default TakeResultChart;
