import { Card, Col, Row } from "react-bootstrap";
import type { AggregateAverages } from "../../../../../common/types";

interface AverageCardsProps {
    averages: AggregateAverages;
}

const statCards: Array<{
    key: keyof AggregateAverages;
    label: string;
    colorClass: string;
    suffix: string;
}> = [
    { key: "cleanTakesPct", label: "Avg Clean Takes", colorClass: "primary", suffix: "%" },
    { key: "cleanThrowInsPct", label: "Avg Clean Throw Ins", colorClass: "success", suffix: "%" },
    { key: "errorRate", label: "Avg Error Rate", colorClass: "danger", suffix: "%" },
    { key: "regulationPct", label: "Avg Regulation", colorClass: "info", suffix: "%" },
];

const AverageCards = ({ averages }: AverageCardsProps) => (
    <Row className="g-2 mb-3">
        {statCards.map(({ key, label, colorClass, suffix }) => (
            <Col xs={6} md={3} key={key}>
                <Card className={`h-100 shadow-sm border-0 bg-${colorClass} bg-opacity-10`}>
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center py-3">
                        <h3 className={`fw-bold text-${colorClass} mb-0`} style={{ fontSize: "1.75rem" }}>
                            {averages[key] !== null ? `${averages[key]}${suffix}` : "-"}
                        </h3>
                        <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.65rem" }}>
                            {label}
                        </small>
                    </Card.Body>
                </Card>
            </Col>
        ))}
    </Row>
);

export default AverageCards;
