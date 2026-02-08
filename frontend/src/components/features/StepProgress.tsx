import { useEffect, useRef } from "react";
import type { PageType, SelectionState } from "../../../../common/types";
import { ChevronRight } from 'react-bootstrap-icons';
import { PAGE_LABELS } from "../../utils";

type Props = {
  visiblePages: PageType[];
  selections: SelectionState;
  activeIndex: number;
  onStepClick: (index: number) => void;
};

const StepProgress = ({
  visiblePages,
  selections,
  activeIndex,
  onStepClick,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleSteps = visiblePages.slice(0, activeIndex);

  useEffect(() => {
    if (containerRef.current) {
        // Just scroll to the right end since we want the latest history to be visible
        // Or find the last element.
        const lastIndex = visibleSteps.length - 1;
        if (lastIndex >= 0) {
            const activeElement = containerRef.current.querySelector(`[data-index="${lastIndex}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "end", // Keep on far right
                });
            }
        }
    }
  }, [activeIndex, visiblePages.length, visibleSteps.length]);


  if (visibleSteps.length === 0) {
      return null; // Or empty div if we want to update the space but nothing to show
  }

  return (
    <div
      className="w-100 overflow-hidden"
    >
      <div
        ref={containerRef}
        className="d-flex flex-row align-items-center gap-1 overflow-x-auto text-nowrap no-scrollbar p-2"
        style={{ scrollBehavior: "smooth" }}
      >
        {visibleSteps.map((pageType, idx) => {
          const selection = selections[pageType] || "";

          return (
            <div key={pageType} className="d-flex flex-row align-items-center mb-0" data-index={idx}>
                <div
                className="step-item d-flex flex-column justify-content-center px-3 py-1"
                onClick={() => onStepClick(idx)}
                style={{ cursor: "pointer", minWidth: "fit-content" }}
                >
                <span className="fw-bold small text-muted text-uppercase" style={{ fontSize: "0.65rem", lineHeight: 1 }}>
                    {PAGE_LABELS[pageType]}
                </span>
                {selection && (
                    <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: "150px", fontSize: "0.9rem" }}>
                    {selection}
                    </div>
                )}
                </div>
                {idx < visibleSteps.length - 1 && (
                    <div className="d-flex align-items-center justify-content-center px-1">
                        <ChevronRight className="text-secondary opacity-60"/>
                    </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepProgress;
