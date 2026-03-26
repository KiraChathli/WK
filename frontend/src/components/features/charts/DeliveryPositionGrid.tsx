import { useMemo, useState } from "react";
import { Badge, ButtonGroup, Col, Modal, Row, ToggleButton } from "react-bootstrap";
import ChartCard from "./ChartCard";
import {
  deliveryPositions,
  successfulTakeResults,
  type AggregateChartData,
  type BallEntry,
  type DeliveryPosition,
  type HeatmapBowlerFilter,
} from "../../../../../common/types";

interface DeliveryPositionGridProps {
  data: AggregateChartData["deliveryPositionHeatmap"];
  balls: BallEntry[];
}

const getHeatColor = (pct: number): string => {
  if (pct >= 90) return "rgba(25, 135, 84, 0.3)";
  if (pct >= 75) return "rgba(25, 135, 84, 0.15)";
  if (pct >= 60) return "rgba(255, 193, 7, 0.25)";
  if (pct >= 40) return "rgba(255, 193, 7, 0.15)";
  return "rgba(220, 53, 69, 0.2)";
};

const shortLabel = (position: string): string =>
  position.replace(" Side", "").replace("Waist", "Mid");

const FILTER_OPTIONS: Array<{ label: string; value: HeatmapBowlerFilter }> = [
  { label: "Both", value: "both" },
  { label: "Seam", value: "seam" },
  { label: "Spin", value: "spin" },
];

const isBowlerMatch = (bowlerType: string, filter: HeatmapBowlerFilter): boolean => {
  if (filter === "both") return true;
  const lower = bowlerType.toLowerCase();
  if (filter === "seam") return lower.includes("seam");
  return lower.includes("spin");
};

const resultVariant = (result: string): string => {
  if (successfulTakeResults.includes(result as any)) return "success";
  if (result === "No touch") return "secondary";
  return "danger";
};

const DeliveryPositionGrid = ({ data, balls }: DeliveryPositionGridProps) => {
  const [filter, setFilter] = useState<HeatmapBowlerFilter>("both");
  const [selectedPosition, setSelectedPosition] = useState<DeliveryPosition | null>(null);

  const filteredData = data[filter];
  if (filteredData.length === 0 && data.both.length === 0) return null;

  const posMap = useMemo(
    () => new Map(filteredData.map((cell) => [cell.position, cell])),
    [filteredData]
  );

  const selectedBalls = useMemo(() => {
    if (!selectedPosition) return [];
    return balls.filter(
      (b) => b.deliveryPosition === selectedPosition && b.takeResult !== "No touch" && isBowlerMatch(b.bowlerType, filter)
    );
  }, [selectedPosition, balls, filter]);

  const rows = [
    deliveryPositions.slice(0, 3),
    deliveryPositions.slice(3, 6),
    deliveryPositions.slice(6, 9),
  ];

  const handleTileClick = (position: DeliveryPosition, total: number) => {
    if (total === 0) return;
    setSelectedPosition(position);
  };

  return (
    <ChartCard title="Delivery Position Heatmap" description="Clean take percentage by where the ball was delivered. Tap a cell to see a detailed ball-by-ball breakdown for that position.">
      <div className="d-flex justify-content-center mb-3">
        <ButtonGroup size="sm">
          {FILTER_OPTIONS.map((option) => (
            <ToggleButton
              key={option.value}
              id={`heatmap-filter-${option.value}`}
              type="radio"
              name="heatmap-filter"
              value={option.value}
              variant={filter === option.value ? "primary" : "outline-primary"}
              checked={filter === option.value}
              onChange={() => setFilter(option.value)}
            >
              {option.label}
            </ToggleButton>
          ))}
        </ButtonGroup>
      </div>

      <div className="mx-auto" style={{ maxWidth: "450px" }}>
        {rows.map((row, rowIdx) => (
          <Row key={rowIdx} className="g-1 mb-1">
            {row.map((position) => {
              const posData = posMap.get(position);
              const pct = posData?.cleanPct ?? 0;
              const total = posData?.total ?? 0;

              return (
                <Col xs={4} key={position}>
                  <div
                    className="rounded p-2 text-center"
                    role={total > 0 ? "button" : undefined}
                    onClick={() => handleTileClick(position, total)}
                    style={{
                      backgroundColor: total > 0 ? getHeatColor(pct) : "#f8f9fa",
                      minHeight: "100px",
                      aspectRatio: "1 / 1",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      cursor: total > 0 ? "pointer" : "default",
                    }}
                  >
                    <div className="fw-bold" style={{ fontSize: "0.7rem" }}>
                      {shortLabel(position)}
                    </div>
                    {total > 0 ? (
                      <>
                        <div className="fw-bold" style={{ fontSize: "1.1rem" }}>
                          {pct}%
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.6rem" }}>
                          {total} balls
                        </div>
                      </>
                    ) : (
                      <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                        -
                      </div>
                    )}
                  </div>
                </Col>
              );
            })}
          </Row>
        ))}
      </div>

      <div className="d-flex justify-content-center gap-3 mt-3 flex-wrap" style={{ fontSize: "0.7rem" }}>
        {[
          { color: "rgba(25, 135, 84, 0.3)", label: "90%+" },
          { color: "rgba(25, 135, 84, 0.15)", label: "75-89%" },
          { color: "rgba(255, 193, 7, 0.25)", label: "60-74%" },
          { color: "rgba(255, 193, 7, 0.15)", label: "40-59%" },
          { color: "rgba(220, 53, 69, 0.2)", label: "<40%" },
        ].map(({ color, label }) => (
          <div key={label} className="d-flex align-items-center gap-1">
            <div
              className="rounded"
              style={{ width: 14, height: 14, backgroundColor: color, flexShrink: 0 }}
            />
            <span className="text-muted">{label}</span>
          </div>
        ))}
      </div>

      <Modal show={selectedPosition !== null} onHide={() => setSelectedPosition(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "1rem" }}>
            {selectedPosition}
            <span className="text-muted fw-normal ms-2" style={{ fontSize: "0.85rem" }}>
              {selectedBalls.length} ball{selectedBalls.length !== 1 ? "s" : ""}
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <table className="table table-sm mb-0 align-middle" style={{ fontSize: "0.8rem" }}>
            <thead className="text-muted text-uppercase" style={{ fontSize: "0.68rem" }}>
              <tr>
                <th className="ps-3">Over</th>
                <th>Bowler</th>
                <th>Result</th>
                <th>Difficulty</th>
                <th className="pe-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {selectedBalls.map((ball, i) => (
                <tr key={i}>
                  <td className="text-nowrap fw-bold ps-3">{ball.overCount.over}.{ball.overCount.ball}</td>
                  <td className="text-nowrap">{ball.bowlerType}</td>
                  <td>
                    <Badge bg={resultVariant(ball.takeResult)} className="fw-normal" style={{ fontSize: "0.72rem" }}>
                      {ball.takeResult}
                    </Badge>
                  </td>
                  <td className="text-muted">{ball.collectionDifficulty ?? "-"}</td>
                  <td className="text-muted pe-3">{ball.errorReason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal.Body>
      </Modal>
    </ChartCard>
  );
};

export default DeliveryPositionGrid;
