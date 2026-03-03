import { Col, Row } from "react-bootstrap";
import ChartCard from "./ChartCard";
import { deliveryPositions } from "../../../../../common/types";
import type { AggregateChartData } from "../../../../../common/types";

interface DeliveryPositionGridProps {
    data: AggregateChartData["deliveryPositionHeatmap"];
}

const getHeatColor = (pct: number): string => {
    if (pct >= 90) return "rgba(25, 135, 84, 0.3)";   // green
    if (pct >= 75) return "rgba(25, 135, 84, 0.15)";   // light green
    if (pct >= 60) return "rgba(255, 193, 7, 0.25)";   // yellow
    if (pct >= 40) return "rgba(255, 193, 7, 0.15)";   // light yellow
    return "rgba(220, 53, 69, 0.2)";                     // red
};

/** Short label for the position, e.g. "High Off Side" → "High Off" */
const shortLabel = (position: string): string => {
    return position
        .replace(" Side", "")
        .replace("Waist", "Mid");
};

const DeliveryPositionGrid = ({ data }: DeliveryPositionGridProps) => {
    if (data.length === 0) return null;

    // Build a map for quick lookup
    const posMap = new Map(data.map((d) => [d.position, d]));

    // Delivery positions are ordered in a 3x3 grid:
    // Row 0: High Off Side, High Straight, High Leg Side
    // Row 1: Waist Off Side, Waist Straight, Waist Leg Side
    // Row 2: Low Off Side, Low Straight, Low Leg Side
    const rows = [
        deliveryPositions.slice(0, 3),
        deliveryPositions.slice(3, 6),
        deliveryPositions.slice(6, 9),
    ];

    return (
        <ChartCard title="Delivery Position Heatmap">
            <div className="mx-auto" style={{ maxWidth: "450px" }}>
                {rows.map((row, rowIdx) => (
                <Row key={rowIdx} className="g-1 mb-1">
                    {row.map((position) => {
                        const posData = posMap.get(position);
                        const pct = posData?.cleanPct ?? 0;
                        const total = posData?.total ?? 0;

                        return (
                            <Col xs={4} key={position}>
                                <div
                                    className="rounded p-2 text-center"
                                    style={{
                                        backgroundColor: total > 0 ? getHeatColor(pct) : "#f8f9fa",
                                        minHeight: "100px",
                                        aspectRatio: "1 / 1",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "center",
                                    }}
                                >
                                    <div className="fw-bold" style={{ fontSize: "0.7rem" }}>
                                        {shortLabel(position)}
                                    </div>
                                    {total > 0 ? (
                                        <>
                                            <div className="fw-bold" style={{ fontSize: "1.1rem" }}>
                                                {pct}%
                                            </div>
                                            <div className="text-muted" style={{ fontSize: "0.6rem" }}>
                                                {total} balls
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                                            —
                                        </div>
                                    )}
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            ))}
            </div>
        </ChartCard>
    );
};

export default DeliveryPositionGrid;
