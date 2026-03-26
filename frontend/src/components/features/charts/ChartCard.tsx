import { Card } from "react-bootstrap";

interface ChartCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

const ChartCard = ({ title, description, children, className = "" }: ChartCardProps) => (
    <Card className={`shadow-sm border-0 flex-column ${className}`}>
        <Card.Body className="d-flex flex-column">
            <h6
                className="text-muted text-uppercase fw-bold mb-1"
                style={{ fontSize: "0.75rem", letterSpacing: "0.05em", flexShrink: 0 }}
            >
                {title}
            </h6>
            {description && (
                <p className="text-muted mb-3" style={{ fontSize: "0.78rem", lineHeight: 1.3 }}>
                    {description}
                </p>
            )}
            <div className="flex-grow-1 d-flex flex-column justify-content-center">
                {children}
            </div>
        </Card.Body>
    </Card>
);

export default ChartCard;
