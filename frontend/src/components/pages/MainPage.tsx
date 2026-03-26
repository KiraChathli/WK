import { type Dispatch, type SetStateAction } from "react";
import { Button, Col, Container, Row } from "react-bootstrap";
import MultiSelectPage from "./MultiSelectPage";
import type { PageType, SelectionState } from "../../../../common/types";

type Props = {
  selections: SelectionState;
  setSelections: Dispatch<SetStateAction<SelectionState>>;
  onReview: () => void;
  onSkipToThrowIn: () => void;
  onSkipToNextBall: () => void;
  activeIndex: number;
  visiblePages: PageType[];
  setLastUpdatedPage: Dispatch<SetStateAction<PageType | null>>;
};

const MainPage = ({
  selections,
  setSelections,
  onReview,
  onSkipToThrowIn,
  onSkipToNextBall,
  activeIndex,
  visiblePages,
  setLastUpdatedPage,
}: Props) => {
  const currentPageType = visiblePages[activeIndex];
  const isLastStep = activeIndex === visiblePages.length - 1;
  const selectedValue = currentPageType ? selections[currentPageType] ?? "" : "";
  const isCurrentStepValid = selectedValue.length > 0;

  const updateSingleSelection = (pageType: PageType, value: string) =>
    setSelections((prev: SelectionState) => ({ ...prev, [pageType]: value }));

  const handleUpdateSelection = (pageType: PageType, value: string) => {
    updateSingleSelection(pageType, value);

    if (pageType === "take") {
      updateSingleSelection("collection", "");
      updateSingleSelection("error", "");
    }

    if (value.trim().length > 0) {
      setLastUpdatedPage(pageType);
    }
  };

  if (!currentPageType) {
    return null;
  }

  return (
    <Container fluid className="py-3 app-shell">
      <Row className="justify-content-center">
        <Col xs={12} xl={10}>
          <MultiSelectPage
            pageType={currentPageType}
            selectedValue={selectedValue}
            onChange={(value) => handleUpdateSelection(currentPageType, value)}
          />

          {currentPageType === "delivery" && selections.bowler && selections.keeper && (
            <Row className="g-2 mt-2">
              <Col xs={12} md={6}>
                <Button variant="outline-secondary" className="w-100" onClick={onSkipToThrowIn}>
                  Skip to Throw Ins
                </Button>
              </Col>
              <Col xs={12} md={6}>
                <Button variant="outline-danger" className="w-100" onClick={onSkipToNextBall}>
                  Skip to Next Ball
                </Button>
              </Col>
            </Row>
          )}

          {isLastStep && selectedValue && (
            <div className="mt-3 text-center">
              <Button variant="primary" onClick={onReview} disabled={!isCurrentStepValid}>
                Next
              </Button>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default MainPage;
