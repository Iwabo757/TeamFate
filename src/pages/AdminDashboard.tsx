import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="page">
      <h1>Admin Panel</h1>

      <div className="admin-grid">

        <Link
          to="/admin/homepage"
          className="admin-card"
        >
          📅 Edit Welcome Message
        </Link>

        <Link
          to="/admin/events"
          className="admin-card"
        >
          📅 Event Dashboard
        </Link>

        <Link
          to="/admin/bounty-dashboard"
          className="admin-card"
        >
          🎯 Bounty Dashboard
        </Link>

        <Link
          to="/admin/shinywars"
          className="admin-card"
        >
          ⚔️ Shiny Wars Dashboard
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

        <Link
          to="/admin/raid-dashboard"
          className="admin-card"
        >
          Raids and Guides Dashboard
        </Link>
      </div>
    </div>
  );
}