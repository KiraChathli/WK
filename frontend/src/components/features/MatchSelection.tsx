import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";

interface MatchSelectionProps {
  initialDate?: string; // YYYY-MM-DD
  initialMatchNumber?: number;
  onConfirm: (date: string, matchNumber: number) => void;
  onCancel?: () => void;
}

const MatchSelection = ({
  initialDate,
  initialMatchNumber,
  onConfirm,
  onCancel
}: MatchSelectionProps) => {
  const getToday = () => new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(initialDate || getToday());
  const [matchNumber, setMatchNumber] = useState(initialMatchNumber || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(date, matchNumber);
  };

  return (
    <Modal show={true} centered backdrop="static" keyboard={false}>
      <Modal.Header>
        <Modal.Title>Select Match</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Match Number <span className="text-muted fs-6">(For this date)</span></Form.Label>
              <Form.Select
                  value={matchNumber}
                  onChange={(e) => setMatchNumber(Number(e.target.value))}
              >
                  {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                          Match {num}
                      </option>
                  ))}
              </Form.Select>
            </Form.Group>
        </Modal.Body>
        <Modal.Footer>
              {onCancel && (
                  <Button variant="secondary" onClick={onCancel}>
                      Cancel
                  </Button>
              )}
              <Button variant="primary" type="submit">
                  {onCancel ? "Update" : "Confirm"}
              </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default MatchSelection;
