import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "./Dashboard.css";

function Dashboard({ userDetails }) {
  return (
    <div className="dashboard-container">
      <Sidebar userDetails={userDetails} />
      <div className="dashboard-main">
        <Outlet context={{ userDetails }} />
      </div>
    </div>
  );
}

export default Dashboard;
