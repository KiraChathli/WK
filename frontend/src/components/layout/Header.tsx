
import { Button, Navbar } from "react-bootstrap";
import StepProgress from "../features/StepProgress";
import type { OverCount, PageType, SelectionState } from "../../../../common/types";

interface HeaderProps {
    isSignedIn: boolean;
    isSummary: boolean;
    visiblePages: PageType[];
    selections: SelectionState;
    currentStepIndex: number;
    overCount?: OverCount;
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
    matchName,
    onLogout,
    onStepClick,
    onEditMatch,
    showProgress = true
}: HeaderProps) => {
    if (!isSignedIn) return null;

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
                        <small className="text-muted fw-bold">
                            {overCount.over}.{overCount.ball} Overs
                        </small>
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
