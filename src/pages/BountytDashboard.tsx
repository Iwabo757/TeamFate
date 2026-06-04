import { Link } from "react-router-dom";

export default function BountyDashboard() {
  return (
    <div className="page">
      <h1>Event Dashboard</h1>

      <div className="admin-grid">
        <Link
          to="/admin/bounties/create"
          className="admin-card"
        >
          Create Bounties
        </Link>

        <Link
          to="/admin/current-bounties"
          className="admin-card"
        >
          Current Bounties
        </Link>

        <Link
          to="/admin/past-bounties"
          className="admin-card"
        >
          Past Bounties
        </Link>
      </div>
    </div>
  );
}