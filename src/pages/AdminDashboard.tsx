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
          to="/admin/Bounty"
          className="admin-bounty"
        >
          Monthly bounty
        </Link>

        <Link
          to="/admin/shinies/add"
          className="admin-card"
        >
          ✨ Add Shiny
        </Link>

        <Link
          to="/admin/shinies"
          className="admin-card"
        >
          📖 Manage Shinies
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