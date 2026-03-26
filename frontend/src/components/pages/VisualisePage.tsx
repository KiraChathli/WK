import { useEffect, useState } from "react";
import { Alert, Card, Col, Container, Row, Spinner } from "react-bootstrap";
import Header from "../layout/Header";
import { readBallData, readMatchInfo } from "../../api/sheets";
import { useAggregateData } from "../../hooks/useAggregateData";
import { computeAggregateStats } from "../../../../common/utils";
import type {
  AggregateChartData,
  BallEntry,
  MatchAggregateData,
  MatchRangeOption,
  MatchStatsComputed,
} from "../../../../common/types";

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

const VisualisePage = ({
  matchId,
  matchDisplayName,
  isSampleMatch = false,
  onEditMatch,
  isSignedIn,
  onLogout,
}: VisualisePageProps) => {
  const [selectedRange, setSelectedRange] = useState<MatchRangeOption>("current");

  const [currentStats, setCurrentStats] = useState<MatchStatsComputed | null>(null);
  const [currentChartData, setCurrentChartData] = useState<AggregateChartData | null>(null);
  const [currentBalls, setCurrentBalls] = useState<BallEntry[]>([]);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);

  const aggregate = useAggregateData(isSignedIn);

  useEffect(() => {
    if (!isSignedIn || !matchId) return;

    setCurrentLoading(true);
    setCurrentError(null);

    Promise.all([readMatchInfo(matchId), readBallData(matchId)])
      .then(([meta, balls]) => {
        const matchNumberMatch = matchId.match(/Match (\d+)/);
        const dateMatch = matchId.match(/(\d{4}-\d{2}-\d{2})/);

        const currentMatch: MatchAggregateData = {
          sheetName: matchId,
          date: dateMatch ? dateMatch[1] : "",
          matchNumber: matchNumberMatch ? parseInt(matchNumberMatch[1], 10) : 1,
          stats: meta.stats,
          balls,
        };

        setCurrentStats(meta.statSections);
        setCurrentChartData(computeAggregateStats([currentMatch]));
        setCurrentBalls(balls);
      })
      .catch((err) => {
        console.error("Error loading current match visualisation:", err);
        setCurrentError("Failed to load current match data.");
        setCurrentStats(null);
        setCurrentChartData(null);
      })
      .finally(() => setCurrentLoading(false));
  }, [isSignedIn, matchId]);

  useEffect(() => {
    if (selectedRange === "current") return;
    aggregate.setSelectedRange(selectedRange);
  }, [selectedRange, aggregate.setSelectedRange]);

  const isCurrentMatchView = selectedRange === "current";
  const loading = isCurrentMatchView ? currentLoading : aggregate.isLoading;
  const error = isCurrentMatchView ? currentError : aggregate.error;
  const chartData = isCurrentMatchView ? currentChartData : aggregate.chartData;

  const balls = isCurrentMatchView ? currentBalls : aggregate.allBalls;
  const hasCurrentStats = Boolean(currentStats && currentStats.length > 0);
  const hasChartData = Boolean(chartData && chartData.takeResultBreakdown.length > 0);
  const hasAnyData = isCurrentMatchView
    ? hasCurrentStats || hasChartData
    : Boolean(chartData && aggregate.matchCount > 0);

  return (
    <>
      <Header
        isSignedIn={isSignedIn}
        isSummary={false}
        visiblePages={[]}
        selections={{ bowler: "", keeper: "", delivery: "", take: "", collection: "", error: "", throwIn: "" }}
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
            <MatchRangeSelector
              value={selectedRange}
              onChange={setSelectedRange}
              totalMatches={aggregate.sheetNames.length}
            />

            {error && (
              <Alert variant="warning" className="mb-3">
                {error}
              </Alert>
            )}

            {loading ? (
              <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : chartData && hasAnyData ? (
              <div className="d-flex flex-column gap-3">
                {isCurrentMatchView && <CurrentMatchStats stats={currentStats} />}
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
                <DeliveryPositionGrid data={chartData.deliveryPositionHeatmap} balls={balls} />
              </div>
            ) : (
              <div className="text-center text-muted py-5">
                <p>No match data available yet.</p>
                <small>Record some balls to see visualisations here.</small>
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

const CurrentMatchStats = ({ stats }: { stats: MatchStatsComputed | null }) => {
  if (!stats || stats.length === 0) {
    return null;
  }

  return (
    <div className="d-flex flex-column gap-3">
      {stats.map((section) => (
        <div key={section.title}>
          <div className="d-flex align-items-center mb-2">
            <span className="me-2">{section.icon}</span>
            <h6 className="mb-0 text-uppercase fw-bold text-muted" style={{ fontSize: "0.72rem", letterSpacing: "0.05em" }}>
              {section.title}
            </h6>
            <div className="flex-grow-1 ms-3 border-bottom border-light" />
          </div>

          <Row className="g-2">
            {section.stats.map((stat) => (
              <Col xs={6} md={4} lg={3} key={stat.label}>
                <Card className={`h-100 shadow-sm border-0 bg-${section.colorClass} bg-opacity-10`}>
                  <Card.Body className="text-center py-2">
                    <div className={`fw-bold text-${section.colorClass}`} style={{ fontSize: "1.35rem", lineHeight: 1.2 }}>
                      {stat.value}
                    </div>
                    <div className="text-muted text-uppercase fw-bold mt-1" style={{ fontSize: "0.62rem" }}>
                      {stat.label}
                    </div>
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

export default VisualisePage;
