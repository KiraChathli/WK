import { Button, Card, Col, Container, Row } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import type { PageType, SelectionState } from "../../../../common/types";
import { PAGE_LABELS } from "../../utils";

type Props = {
  selections: SelectionState;
  visiblePages: PageType[];
  onEdit: (index: number) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
};

const SummaryPage = ({ selections, visiblePages, onEdit, onSubmit, isSubmitting = false }: Props) => {
  return (
    <Container fluid className="py-3 app-shell">
      <Row className="justify-content-center">
        <Col xs={12} xl={6}>
          <h4 className="mb-4 text-center">Summary</h4>
          <div className="d-flex flex-column gap-2 mb-4">
            {visiblePages.map((pageType, idx) => (
              <Card key={pageType} className="shadow-sm border-0">
                <Card.Body className="d-flex align-items-center justify-content-between py-2 px-3">
                  <div>
                    <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>
                      {PAGE_LABELS[pageType]}
                    </div>
                    <div className="fw-semibold text-dark">
                      {selections[pageType]}
                    </div>
                  </div>
                  <Button
                    variant="link"
                    className="text-primary p-0"
                    onClick={() => onEdit(idx)}
                  >
                    <PencilSquare size={18} />
                  </Button>
                </Card.Body>
              </Card>
            ))}
          </div>
          <div className="text-center">
            <Button variant="success" size="lg" onClick={onSubmit} className="w-100" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Entry"}
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default SummaryPage;
