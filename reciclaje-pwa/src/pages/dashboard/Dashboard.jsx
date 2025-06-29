import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <Outlet />
      </div>
    </div>
  );
}

export default Dashboard;
