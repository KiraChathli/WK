import { Alert, Col, Container, Card, Nav, Row, Spinner } from "react-bootstrap";
import Header from "../layout/Header";
import type { MatchStatsComputed } from "../../../../common/types";
import { useEffect, useState } from "react";
import { readMatchInfo } from "../../api/sheets";
import { useAggregateData } from "../../hooks/useAggregateData";
// Chart components
import MatchRangeSelector from "../features/charts/MatchRangeSelector";
import AverageCards from "../features/charts/AverageCards";
import TrendLineChart from "../features/charts/TrendLineChart";
import ErrorReasonChart from "../features/charts/ErrorReasonChart";
import BowlerTypeChart from "../features/charts/BowlerTypeChart";
import DifficultyPieChart from "../features/charts/DifficultyPieChart";
import DeliveryPositionGrid from "../features/charts/DeliveryPositionGrid";
import TakeResultChart from "../features/charts/TakeResultChart";

interface VisualisePageProps {
    matchId: string;
    matchDisplayName: string;
    isSampleMatch?: boolean;
    onEditMatch: () => void;
    isSignedIn: boolean;
    onLogout: () => void;
}

type VisualiseTab = "match" | "trends";

const VisualisePage = ({
    matchId,
    matchDisplayName,
    isSampleMatch = false,
    onEditMatch,
    isSignedIn,
    onLogout,
}: VisualisePageProps) => {
    const [activeTab, setActiveTab] = useState<VisualiseTab>("match");

    // Single match stats (for "Match" tab)
    const [computedStats, setComputedStats] = useState<MatchStatsComputed | null>(null);
    const [matchLoading, setMatchLoading] = useState(false);

    // Aggregate data (for "Trends" tab)
    const aggregate = useAggregateData(isSignedIn);

    useEffect(() => {
        if (isSignedIn && matchId) {
            setMatchLoading(true);
            readMatchInfo(matchId)
                .then((data) => setComputedStats(data.statSections))
                .catch(console.error)
                .finally(() => setMatchLoading(false));
        }
    }, [isSignedIn, matchId]);

    return (
        <>
            <Header
                isSignedIn={isSignedIn}
                isSummary={false}
                visiblePages={[]}
                selections={{ bowler: "", delivery: "", take: "", collection: "", error: "", throwIn: "" }}
                currentStepIndex={0}
                onLogout={onLogout}
                onStepClick={() => {}}
                matchName={matchDisplayName}
                isSampleMatch={isSampleMatch}
                onEditMatch={onEditMatch}
                showProgress={false}
                overCount={undefined}
            />
            <Container fluid className="px-3 flex-grow-1 overflow-y-auto pb-5">
                <Row className="justify-content-center">
                    <Col xs={12} xl={10} className="py-3">
                        {/* Tab Navigation */}
                        <Nav
                            variant="pills"
                            activeKey={activeTab}
                            onSelect={(key) => setActiveTab(key as VisualiseTab)}
                            className="mb-3"
                        >
                            <Nav.Item>
                                <Nav.Link eventKey="match">Match</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="trends">Trends</Nav.Link>
                            </Nav.Item>
                        </Nav>

                        {/* Tab Content */}
                        {activeTab === "match" && (
                            <MatchTab stats={computedStats} loading={matchLoading} />
                        )}
                        {activeTab === "trends" && (
                            <TrendsTab aggregate={aggregate} />
                        )}
                    </Col>
                </Row>
            </Container>
        </>
    );
};

/** Match tab — current match stat cards grouped by section */
const MatchTab = ({
    stats,
    loading,
}: {
    stats: MatchStatsComputed | null;
    loading: boolean;
}) => {
    if (loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (!stats || stats.length === 0) {
        return (
            <div className="text-center text-muted py-5">
                <p>No data recorded for this match yet.</p>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column gap-4">
            {stats.map((section) => (
                <div key={section.title}>
                    <div className="d-flex align-items-center mb-3">
                        <span className="fs-4 me-2">{section.icon}</span>
                        <h4 className="mb-0 text-uppercase fw-bold text-muted small tracking-wider">
                            {section.title}
                        </h4>
                        <div className="flex-grow-1 ms-3 border-bottom border-light"></div>
                    </div>
                    <Row className="g-3">
                        {section.stats.map((stat) => (
                            <Col xs={6} md={section.stats.length === 3 ? 4 : 3} key={stat.label}>
                                <Card className={`h-100 shadow-sm border-0 bg-${section.colorClass} bg-opacity-10`}>
                                    <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center py-4">
                                        <h2 className={`display-5 fw-bold text-${section.colorClass} mb-0`}>
                                            {stat.value}
                                        </h2>
                                        <small className="text-muted text-uppercase fw-bold x-small mt-2">
                                            {stat.label}
                                        </small>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            ))}
        </div>
    );
};

/** Trends tab — aggregate charts */
const TrendsTab = ({
    aggregate,
}: {
    aggregate: ReturnType<typeof useAggregateData>;
}) => {
    const {
        isLoading,
        error,
        chartData,
        sheetNames,
        selectedRange,
        setSelectedRange,
        matchCount,
    } = aggregate;

    return (
        <>
            <MatchRangeSelector
                value={selectedRange}
                onChange={setSelectedRange}
                totalMatches={sheetNames.length}
            />

            {error && (
                <Alert variant="warning" className="mb-3">
                    {error}
                </Alert>
            )}

            {isLoading ? (
                <div className="d-flex justify-content-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : chartData && matchCount > 0 ? (
                <div className="d-flex flex-column gap-3">
                    <AverageCards averages={chartData.averages} />
                    <TrendLineChart data={chartData.trendData} />
                    <ErrorReasonChart data={chartData.errorReasonBreakdown} />
                    <BowlerTypeChart data={chartData.takesByBowlerType} />
                    <Row className="g-3">
                        <Col xs={12} md={6}>
                            <DifficultyPieChart data={chartData.collectionDifficultyRatio} />
                        </Col>
                        <Col xs={12} md={6}>
                            <TakeResultChart data={chartData.takeResultBreakdown} />
                        </Col>
                    </Row>
                    <DeliveryPositionGrid data={chartData.deliveryPositionHeatmap} />
                </div>
            ) : !isLoading ? (
                <div className="text-center text-muted py-5">
                    <p>No match data available yet.</p>
                    <small>Record some matches to see your trends here.</small>
                </div>
            ) : null}
        </>
    );
};

export default VisualisePage;
