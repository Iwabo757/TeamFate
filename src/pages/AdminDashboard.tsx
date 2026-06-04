import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="page">
      <h1>Admin Panel</h1>

      <div className="admin-grid">

        <Link
          to="/admin/events"
          className="admin-card"
        >
          📅 Manage Events
        </Link>

        <Link
          to="/admin/bounty-dashboard"
          className="admin-card"
        >
          Manage Bounties
        </Link>

        <Link
          to="/admin/shiny-dashboard"
          className="admin-card"
        >
          📖 Shiny Dashboard
        </Link>

        <Link
          to="/admin/members"
          className="admin-card"
        >
          👥 Manage Members
        </Link>

      </div>
    </div>
  );
}