
import { Button, Row } from "react-bootstrap";

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView = ({ onLogin }: LoginViewProps) => {
  return (
    <Row className="flex-grow-1 justify-content-center align-items-center m-0">
      <div className="d-flex flex-column align-items-center text-center">
        <h1 className="mb-4">Wicket Keeping Tracker</h1>
        <Button onClick={onLogin}>Login with Google</Button>
      </div>
    </Row>
  );
};

export default LoginView;
