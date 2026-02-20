import { Card, Col, Container, Row } from "react-bootstrap";
import Header from "../layout/Header";
import type { PageType, SelectionState, MatchStats } from "../../../../common/types";
import { useEffect, useState } from "react";
import { readMatchInfo } from "../../api/sheets";

interface VisualisePageProps {
    matchId: string;
    onEditMatch: () => void;

    // Header props passthrough or mock for non-interactive parts
    isSignedIn: boolean;
    visiblePages: PageType[];
    selections: SelectionState;
    currentStepIndex: number;
    onLogout: () => void;
}

const VisualisePage = ({
    matchId,
    onEditMatch,
    isSignedIn,
    visiblePages,
    selections,
    currentStepIndex,
    onLogout
}: VisualisePageProps) => {
    const [stats, setStats] = useState<MatchStats | null>(null);

    useEffect(() => {
        if (isSignedIn && matchId) {
            readMatchInfo(matchId).then(data => {
                setStats(data.stats);
            });
        }
    }, [isSignedIn, matchId]);

    return (
        <>
            <Header
                isSignedIn={isSignedIn}
                isSummary={false}
                visiblePages={visiblePages}
                selections={selections}
                currentStepIndex={currentStepIndex}
                onLogout={onLogout}
                onStepClick={() => {}}
                matchName={matchId}
                onEditMatch={onEditMatch}
                showProgress={false}
                overCount={undefined}
            />
            <Container fluid className="px-3 flex-grow-1 overflow-y-auto pb-5">
                <Row className="justify-content-center h-100">
                    <Col xs={12} xl={10} className="py-3">
                         {/* Placeholder Stats Section */}
                         <Row className="g-3">
                            <Col xs={6}>
                                <Card className="h-100 shadow-sm border-0 bg-primary bg-opacity-10">
                                    <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center py-4">
                                         <h2 className="display-4 fw-bold text-primary mb-0">{stats ? stats["Clean Takes %"] || "-" : "-"}%</h2>
                                         <small className="text-muted text-uppercase fw-bold">Clean Takes</small>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col xs={6}>
                                <Card className="h-100 shadow-sm border-0 bg-success bg-opacity-10">
                                     <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center py-4">
                                         <h2 className="display-4 fw-bold text-success mb-0">{stats ? stats["Clean Throw Ins %"] || "-" : "-"}%</h2>
                                         <small className="text-muted text-uppercase fw-bold">Clean Throw Ins</small>
                                    </Card.Body>
                                </Card>
                            </Col>
                         </Row>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default VisualisePage;
