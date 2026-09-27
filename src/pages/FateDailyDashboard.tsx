import { Link } from "react-router-dom";

export default function FateDailyDashboard() {
  return (
    <div className="page">
      <h1>🔥 Faté Daily</h1>
      <p>
        Manage the daily challenges, schedule assignments, and verify member proof.
      </p>

      <div className="admin-grid">
        <Link to="/admin/fate-daily/manager" className="admin-card">
          🔥 Faté Daily Manager
        </Link>

        <Link to="/admin/fate-daily/verification" className="admin-card">
          📸 Faté Daily Verification
        </Link>
      </div>
    </div>
  );
}
