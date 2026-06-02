import { Link } from "react-router-dom";

export default function ShinyDashboard() {
  return (
    <div className="page">
      <h1>✨ Shiny Dashboard</h1>

      <div className="dashboard-grid">

        <Link
          to="/admin/add-shiny"
          className="dashboard-card"
        >
          <h2>➕ Add Shiny</h2>
          <p>
            Add a shiny directly.
          </p>
        </Link>

        <Link
          to="/admin/manage-shinies"
          className="dashboard-card"
        >
          <h2>✨ Manage Shinies</h2>
          <p>
            Edit and delete shinies.
          </p>
        </Link>

        <Link
          to="/admin/shiny-approvals"
          className="dashboard-card"
        >
          <h2>📥 Submissions</h2>
          <p>
            Review member submissions.
          </p>
        </Link>

      </div>
    </div>
  );
}