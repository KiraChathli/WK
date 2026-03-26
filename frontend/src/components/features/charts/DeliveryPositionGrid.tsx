import { useMemo, useState } from "react";
import { ButtonGroup, Col, Row, ToggleButton } from "react-bootstrap";
import ChartCard from "./ChartCard";
import {
  deliveryPositions,
  type AggregateChartData,
  type HeatmapBowlerFilter,
} from "../../../../../common/types";

interface DeliveryPositionGridProps {
  data: AggregateChartData["deliveryPositionHeatmap"];
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

const DeliveryPositionGrid = ({ data }: DeliveryPositionGridProps) => {
  const [filter, setFilter] = useState<HeatmapBowlerFilter>("both");

  const filteredData = data[filter];
  if (filteredData.length === 0 && data.both.length === 0) return null;

  const posMap = useMemo(
    () => new Map(filteredData.map((cell) => [cell.position, cell])),
    [filteredData]
  );

  const rows = [
    deliveryPositions.slice(0, 3),
    deliveryPositions.slice(3, 6),
    deliveryPositions.slice(6, 9),
  ];

  return (
    <ChartCard title="Delivery Position Heatmap">
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
                    style={{
                      backgroundColor: total > 0 ? getHeatColor(pct) : "#f8f9fa",
                      minHeight: "100px",
                      aspectRatio: "1 / 1",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
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
    </ChartCard>
  );
};

export default DeliveryPositionGrid;
