import { Nav, Navbar } from "react-bootstrap";
import { BarChartFill, ListUl, PencilSquare } from "react-bootstrap-icons";
import { useLocation, useNavigate } from "react-router-dom";

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const navigateTo = (path: string) => navigate(path + location.search);

    return (
        <Navbar fixed="bottom" bg="white" className="border-top shadow-lg justify-content-around pb-3 pt-2">
            <Nav.Link
                onClick={() => navigateTo("/record")}
                className={`d-flex flex-column align-items-center ${location.pathname === "/record" ? "text-primary" : "text-muted"}`}
            >
                <PencilSquare size={24} />
                <span style={{ fontSize: "0.75rem", marginTop: "4px" }}>Record</span>
            </Nav.Link>
            <Nav.Link
                onClick={() => navigateTo("/balls")}
                className={`d-flex flex-column align-items-center ${location.pathname === "/balls" ? "text-primary" : "text-muted"}`}
            >
                <ListUl size={24} />
                <span style={{ fontSize: "0.75rem", marginTop: "4px" }}>Balls</span>
            </Nav.Link>
            <Nav.Link
                onClick={() => navigateTo("/visualise")}
                className={`d-flex flex-column align-items-center ${location.pathname === "/visualise" ? "text-primary" : "text-muted"}`}
            >
                <BarChartFill size={24} />
                <span style={{ fontSize: "0.75rem", marginTop: "4px" }}>Visualise</span>
            </Nav.Link>
        </Navbar>
    );
};

export default BottomNav;
