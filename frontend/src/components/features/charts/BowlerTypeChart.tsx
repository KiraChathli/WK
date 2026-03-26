import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";
import ChartCard from "./ChartCard";
import type { AggregateChartData } from "../../../../../common/types";

interface BowlerTypeChartProps {
    data: AggregateChartData["takesByBowlerType"];
}

const BowlerTypeChart = ({ data }: BowlerTypeChartProps) => {
    if (data.length === 0) return null;

    return (
        <ChartCard title="Takes by Bowler Type" description="Clean takes versus errors for each bowler type. Shows which bowling styles you handle best.">
            <ResponsiveContainer width="100%" height={250}>
                <BarChart
                    data={data}
                    margin={{ top: 5, right: 10, left: -20, bottom: 30 }}
                >
                    <XAxis
                        dataKey="bowlerType"
                        tick={{ fontSize: 10, dy: 12 }}
                        textAnchor="end"
                        angle={-35}
                        interval={0}
                        height={60}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                    <Bar
                        dataKey="cleanTakes"
                        name="Clean"
                        fill="#198754"
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                    />
                    <Bar
                        dataKey="errors"
                        name="Errors"
                        fill="#dc3545"
                        stackId="a"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};

export default BowlerTypeChart;
