import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";
import ChartCard from "./ChartCard";
import type { AggregateChartData } from "../../../../../common/types";

interface DifficultyPieChartProps {
    data: AggregateChartData["collectionDifficultyRatio"];
}

const COLORS = ["#0d6efd", "#ffc107"];

const DifficultyPieChart = ({ data }: DifficultyPieChartProps) => {
    if (data.regulation === 0 && data.difficult === 0) return null;

    const chartData = [
        { name: "Regulation", value: data.regulation },
        { name: "Difficult", value: data.difficult },
    ];

    return (
        <ChartCard title="Collection Difficulty" className="h-100">
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={80}
                        dataKey="value"
                        label={(props: any) =>
                            `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "0.8rem", paddingTop: "20px" }} />
                </PieChart>
            </ResponsiveContainer>
        </ChartCard>
    );
};

export default DifficultyPieChart;
