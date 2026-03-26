import { useEffect, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";

const PACE_OPTIONS = [
  { label: "Seam", value: "seam" as const },
  { label: "Spin", value: "spin" as const },
];

const ARM_OPTIONS = [
  { label: "RA", value: "RA" as const },
  { label: "LA", value: "LA" as const },
];

const SPIN_OPTIONS = [
  { label: "Leg", value: "leg" as const },
  { label: "Off", value: "off" as const },
];

type PaceType = "seam" | "spin" | null;
type ArmType = "RA" | "LA" | null;
type SpinType = "leg" | "off" | null;

type BowlerState = {
  pace: PaceType;
  arm: ArmType;
  spinType: SpinType;
};

type Props = {
  selectedValue: string;
  onChange: (value: string) => void;
};

const parseBowlerValue = (value: string): BowlerState => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return { pace: null, arm: null, spinType: null };

  // Remaining legacy value still present in older rows.
  if (normalized === "la spin") {
    return { pace: "spin", arm: "LA", spinType: "off" };
  }

  const seamMatch = normalized.match(/^(ra|la)\s+seam$/);
  if (seamMatch) {
    return {
      pace: "seam",
      arm: seamMatch[1].toUpperCase() as ArmType,
      spinType: null,
    };
  }

  const spinMatch = normalized.match(/^(ra|la)\s+(leg|off)\s+spin$/);
  if (spinMatch) {
    return {
      pace: "spin",
      arm: spinMatch[1].toUpperCase() as ArmType,
      spinType: spinMatch[2] as SpinType,
    };
  }

  return { pace: null, arm: null, spinType: null };
};

const buildBowlerValue = (pace: PaceType, arm: ArmType, spinType: SpinType): string => {
  if (!pace || !arm) return "";
  if (pace === "seam") return `${arm} seam`;
  if (!spinType) return "";
  return `${arm} ${spinType} spin`;
};

const ChoiceButtons = ({
  options,
  selected,
  onSelect,
}: {
  options: ReadonlyArray<{ label: string; value: string }>;
  selected: string | null;
  onSelect: (value: string) => void;
}) => (
  <Row xs={2} className="g-2">
    {options.map((option) => {
      const isActive = selected === option.value;
      return (
        <Col key={option.value}>
          <Button
            size="sm"
            variant={isActive ? "primary" : "outline-primary"}
            className="w-100 option-button"
            onClick={() => onSelect(option.value)}
          >
            <div className="fw-semibold small text-uppercase">{option.label}</div>
          </Button>
        </Col>
      );
    })}
  </Row>
);

const BowlerTypeBuilder = ({ selectedValue, onChange }: Props) => {
  const initialState = parseBowlerValue(selectedValue);
  const [pace, setPace] = useState<PaceType>(initialState.pace);
  const [arm, setArm] = useState<ArmType>(initialState.arm);
  const [spinType, setSpinType] = useState<SpinType>(initialState.spinType);

  useEffect(() => {
    const parsed = parseBowlerValue(selectedValue);
    setPace(parsed.pace);
    setArm(parsed.arm);
    setSpinType(parsed.spinType);
  }, [selectedValue]);

  useEffect(() => {
    const built = buildBowlerValue(pace, arm, spinType);
    if (built && built !== selectedValue) {
      onChange(built);
    }
  }, [pace, arm, spinType, selectedValue, onChange]);

  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <p className="small text-muted text-uppercase fw-semibold mb-2">Pace / Spin</p>
        <ChoiceButtons
          options={PACE_OPTIONS}
          selected={pace}
          onSelect={(value) => {
            const nextPace = value as PaceType;
            setPace(nextPace);
            if (nextPace === "seam") {
              setSpinType(null);
            }
          }}
        />
      </div>

      <div>
        <p className="small text-muted text-uppercase fw-semibold mb-2">Arm</p>
        <ChoiceButtons
          options={ARM_OPTIONS}
          selected={arm}
          onSelect={(value) => setArm(value as ArmType)}
        />
      </div>

      {pace === "spin" && (
        <div>
          <p className="small text-muted text-uppercase fw-semibold mb-2">Spin Type</p>
          <ChoiceButtons
            options={SPIN_OPTIONS}
            selected={spinType}
            onSelect={(value) => setSpinType(value as SpinType)}
          />
        </div>
      )}
    </div>
  );
};

export default BowlerTypeBuilder;
