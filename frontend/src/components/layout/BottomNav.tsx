import { Nav, Navbar } from "react-bootstrap";
import { BarChartFill, PencilSquare } from "react-bootstrap-icons";
import { useLocation, useNavigate } from "react-router-dom";

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <Navbar fixed="bottom" bg="white" className="border-top shadow-lg justify-content-around pb-3 pt-2">
            <Nav.Link
                onClick={() => navigate("/record")}
                className={`d-flex flex-column align-items-center ${location.pathname === "/record" ? "text-primary" : "text-muted"}`}
            >
                <PencilSquare size={24} />
                <span style={{ fontSize: "0.75rem", marginTop: "4px" }}>Record</span>
            </Nav.Link>
            <Nav.Link
                onClick={() => navigate("/visualise")}
                className={`d-flex flex-column align-items-center ${location.pathname === "/visualise" ? "text-primary" : "text-muted"}`}
            >
                <BarChartFill size={24} />
                <span style={{ fontSize: "0.75rem", marginTop: "4px" }}>Visualise</span>
            </Nav.Link>
        </Navbar>
    );
};

export default BottomNav;
