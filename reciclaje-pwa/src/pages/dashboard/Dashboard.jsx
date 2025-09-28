import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "./Dashboard.css";

function Dashboard({ userDetails, onLogout }) {
  return (
    <div className="dashboard-container">
      <Sidebar userDetails={userDetails} onLogout={onLogout} />
      <div className="dashboard-main">
        <Outlet context={{ userDetails, onLogout }} />
      </div>
    </div>
  );
}

export default Dashboard;
