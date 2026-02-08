
import { Row, Spinner } from "react-bootstrap";

const LoadingView = () => {
  return (
    <Row className="flex-grow-1 justify-content-center align-items-center m-0">
      <Spinner
        className="loading-spinner"
        animation="border"
        variant="primary"
      />
    </Row>
  );
};

export default LoadingView;
