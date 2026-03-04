import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Col, Container, Row, Toast, ToastContainer } from "react-bootstrap";
import Header from "./components/layout/Header";
import BottomNav from "./components/layout/BottomNav";
import LoadingView from "./components/pages/LoadingView";
import LoginView from "./components/pages/LoginView";
import MainPage from "./components/pages/MainPage";
import SummaryPage from "./components/pages/SummaryPage";
import VisualisePage from "./components/pages/VisualisePage";
import BallsTab from "./components/features/BallsTab";
import MatchSelection from "./components/features/MatchSelection";
import { useTracker } from "./hooks/useTracker";
import { BASE_URL } from "../../common/consts";

const App = () => {
  const { state, actions } = useTracker();
  const {
    selections,
    isSignedIn,
    toast,
    isSubmitting,
    currentStepIndex,
    visiblePages,
    isSummary,
    isMatchSelected,
    isMatchReady,
    matchDisplayName,
    matchId,
    matchDate,
    matchNumber,
    currentOverBalls,
    extraType,
    isSampleMatch,
  } = state;
  const {
    setSelections,
    setLastUpdatedPage,
    goToStep,
    handleSubmit,
    handleLogout,
    signIn,
    hideToast,
    setMatchParams,
    setIsMatchSelected,
    setExtraType,
    refreshBallData,
  } = actions;

  return (
    <BrowserRouter basename={BASE_URL}>
      <Container fluid className="vh-100 px-0 d-flex flex-column app-shell">
        {isSignedIn === null ? (
          <LoadingView />
        ) : isSignedIn === false ? (
          <LoginView onLogin={signIn} />
        ) : !isMatchSelected ? (
          <div className="flex-grow-1 d-flex">
             <MatchSelection
                onConfirm={setMatchParams}
                initialDate={matchDate}
                initialMatchNumber={matchNumber}
             />
          </div>
        ) : !isMatchReady ? (
          <LoadingView />
        ) : (
          <>
            <div className="flex-grow-1 d-flex flex-column overflow-hidden">
                <Routes>
                    <Route path="/record" element={
                        <>
                          <Header
                            isSignedIn={isSignedIn}
                            isSummary={isSummary}
                            visiblePages={visiblePages}
                            selections={selections}
                            currentStepIndex={currentStepIndex}
                            onLogout={handleLogout}
                            onStepClick={goToStep}
                            overCount={state.currentOverCount}
                            currentOverBalls={currentOverBalls}
                            matchName={matchDisplayName}
                            isSampleMatch={isSampleMatch}
                            onEditMatch={() => setIsMatchSelected(false)}
                          />
                          <Container fluid className="px-3 flex-grow-1 overflow-y-auto pb-5">
                             <Row className="justify-content-center h-100">
                                <Col xs={12} xl={10} className="py-3">
                                    {isSummary ? (
                                        <SummaryPage
                                            selections={selections}
                                            visiblePages={visiblePages}
                                            onEdit={goToStep}
                                            onSubmit={handleSubmit}
                                            isSubmitting={isSubmitting}
                                            extraType={extraType}
                                            onSetExtraType={setExtraType}
                                        />
                                    ) : (
                                        <MainPage
                                            selections={selections}
                                            setSelections={setSelections}
                                            onReview={() => goToStep(visiblePages.length)}
                                            activeIndex={currentStepIndex}
                                            visiblePages={visiblePages}
                                            setLastUpdatedPage={setLastUpdatedPage}
                                        />
                                    )}
                                </Col>
                            </Row>
                          </Container>
                        </>
                    } />
                    <Route path="/balls" element={
                        <>
                          <Header
                            isSignedIn={isSignedIn}
                            isSummary={false}
                            visiblePages={[]}
                            selections={{ bowler: "", delivery: "", take: "", collection: "", error: "", throwIn: "" }}
                            currentStepIndex={0}
                            onLogout={handleLogout}
                            onStepClick={() => {}}
                            matchName={matchDisplayName}
                            isSampleMatch={isSampleMatch}
                            onEditMatch={() => setIsMatchSelected(false)}
                            showProgress={false}
                            overCount={undefined}
                          />
                          <Container fluid className="px-3 flex-grow-1 overflow-y-auto pb-5">
                            <Row className="justify-content-center">
                              <Col xs={12} xl={10} className="py-3">
                                <BallsTab
                                  matchId={matchId}
                                  isSignedIn={isSignedIn ?? false}
                                  onBallsChanged={refreshBallData}
                                />
                              </Col>
                            </Row>
                          </Container>
                        </>
                    } />
                    <Route path="/visualise" element={
                        <VisualisePage
                            matchId={matchId}
                            matchDisplayName={matchDisplayName}
                            isSampleMatch={isSampleMatch}
                            onEditMatch={() => setIsMatchSelected(false)}
                            isSignedIn={isSignedIn ?? false}
                            onLogout={handleLogout}
                        />
                    } />
                    <Route path="*" element={<Navigate to="/record" replace />} />
                </Routes>
            </div>

            <BottomNav />

            <ToastContainer position="bottom-end" className="p-3 mb-5" style={{ zIndex: 1100 }}>
               <Toast onClose={hideToast} show={toast.show} delay={3000} autohide bg={toast.variant}>
                  <Toast.Header>
                     <strong className="me-auto">WK Tracker</strong>
                     <small>Just now</small>
                  </Toast.Header>
                  <Toast.Body className="text-white">{toast.message}</Toast.Body>
               </Toast>
            </ToastContainer>
          </>
        )}
      </Container>
    </BrowserRouter>
  );
};

export default App;
