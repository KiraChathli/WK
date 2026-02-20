import { Card } from "react-bootstrap";

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
}

const ChartCard = ({ title, children }: ChartCardProps) => (
    <Card className="shadow-sm border-0">
        <Card.Body>
            <h6
                className="text-muted text-uppercase fw-bold mb-3"
                style={{ fontSize: "0.75rem", letterSpacing: "0.05em" }}
            >
                {title}
            </h6>
            {children}
        </Card.Body>
    </Card>
);

export default ChartCard;
