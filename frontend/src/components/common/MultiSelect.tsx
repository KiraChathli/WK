import { Button, Col, Row } from "react-bootstrap";

type Props = {
  options: readonly string[];
  selectedValue: string;
  onChange: (value: string) => void;
};

const MultiSelect = ({ options, selectedValue, onChange }: Props) => {
  // Regular button layout for other pages
  return (
    <Row xs={2} sm={3} className="g-2">
      {options.map((option) => {
        const isActive = selectedValue === option;
        return (
          <Col key={option}>
            <Button
              size="sm"
              variant={isActive ? "primary" : "outline-primary"}
              className="w-100 text-start option-button"
              onClick={() => onChange(option)}
            >
              <div className="fw-semibold small">{option}</div>
            </Button>
          </Col>
        );
      })}
    </Row>
  );
};

export default MultiSelect;
