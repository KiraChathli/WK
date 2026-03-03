
import { Button, Navbar } from "react-bootstrap";
import StepProgress from "../features/StepProgress";
import type { OverCount, PageType, SelectionState, BallEntry } from "../../../../common/types";

interface HeaderProps {
    isSignedIn: boolean;
    isSummary: boolean;
    visiblePages: PageType[];
    selections: SelectionState;
    currentStepIndex: number;
    overCount?: OverCount;
    currentOverBalls?: BallEntry[];
    matchName: string;
    onLogout: () => void;
    onStepClick: (index: number) => void;
    onEditMatch: () => void;
    showProgress?: boolean;
}

const Header = ({
    isSignedIn,
    isSummary,
    visiblePages,
    selections,
    currentStepIndex,
    overCount,
    currentOverBalls,
    matchName,
    onLogout,
    onStepClick,
    onEditMatch,
    showProgress = true
}: HeaderProps) => {
    if (!isSignedIn) return null;

    const validBallsCount = (currentOverBalls || []).filter((b) => !b.extraType).length;
    const remainingBallsCount = Math.max(0, 6 - validBallsCount);

    return (
        <div className="sticky-top bg-white border-bottom shadow-sm z-3">
            <Navbar bg="light" variant="light" className="px-3">
                <Navbar.Brand className="fw-bold text-primary">WK</Navbar.Brand>

                <div className="d-flex flex-column align-items-start mx-auto">
                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold">{matchName}</span>
                         <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={onEditMatch}>
                            Change
                         </Button>
                    </div>
                    {overCount && (
                        <div className="d-flex align-items-center gap-3">
                            <small className="text-muted fw-bold">
                                {overCount.over}.{overCount.ball} Overs
                            </small>
                            <div className="d-flex align-items-center gap-1">
                                {currentOverBalls?.map((ball, i) => {
                                    if (ball.extraType) {
                                        return (
                                            <div
                                                key={i}
                                                className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center fw-bold"
                                                style={{ width: "16px", height: "16px", fontSize: "10px" }}
                                            >
                                                {ball.extraType === "Wide" ? "W" : "N"}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div
                                            key={i}
                                            className="rounded-circle bg-primary"
                                            style={{ width: "16px", height: "16px" }}
                                        />
                                    );
                                })}
                                {Array.from({ length: remainingBallsCount }).map((_, i) => (
                                    <div
                                        key={`rem-${i}`}
                                        className="rounded-circle border border-primary border-2"
                                        style={{ width: "16px", height: "16px" }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <Navbar.Toggle />
                <Navbar.Collapse className="justify-content-end">
                    <Button variant="outline-danger" size="sm" onClick={onLogout}>
                        Logout
                    </Button>
                </Navbar.Collapse>
            </Navbar>
            {!isSummary && showProgress && (
                <StepProgress
                    visiblePages={visiblePages}
                    selections={selections}
                    activeIndex={currentStepIndex}
                    onStepClick={onStepClick}
                />
            )}
        </div>
    );
};

export default Header;
