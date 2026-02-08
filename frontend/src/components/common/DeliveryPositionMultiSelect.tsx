import { Button, Col, Row } from "react-bootstrap";

type Props = {
  selectedValue: string;
  onChange: (value: string) => void;
};

const DELIVERY_POSITIONS = [
  ["High Off Side", "High Straight", "High Leg Side"],
  ["Waist Off Side", "Waist Straight", "Waist Leg Side"],
  ["Low Off Side", "Low Straight", "Low Leg Side"],
];

const DeliveryPositionMultiSelect = ({ selectedValue, onChange }: Props) => {
  return (
    <div className="delivery-grid">
      {DELIVERY_POSITIONS.map((row, rowIdx) => (
        <Row key={rowIdx} className="g-1 mb-1">
          {row.map((position) => {
            const isActive = selectedValue === position;
            return (
              <Col key={position} xs={4}>
                <Button
                  size="sm"
                  variant={isActive ? "primary" : "outline-primary"}
                  className="w-100 delivery-button"
                  onClick={() => onChange(position)}
                  style={{ aspectRatio: "1", minHeight: "60px" }}
                >
                  <div className="fw-semibold small">{position}</div>
                </Button>
              </Col>
            );
          })}
        </Row>
      ))}
    </div>
  );
};

export default DeliveryPositionMultiSelect;
