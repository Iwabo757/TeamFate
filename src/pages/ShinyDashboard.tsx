import { Link } from "react-router-dom";

export default function ShinyDashboard() {
  return (
    <div className="page">
      <h1>✨ Shiny Dashboard</h1>

      <div className="admin-grid">

        <Link
          to="/admin/addshiny"
          className="admin-card"
        >
          <div>
            <h2>➕ Add Shiny</h2>
            <p>
              Add a shiny directly to the
              Team Faté Shiny Dex.
            </p>
          </div>
        </Link>

        <Link
          to="/admin/manageshinies"
          className="admin-card"
        >
          <div>
            <h2>✨ Manage Shinies</h2>
            <p>
              Edit and remove shiny
              records.
            </p>
          </div>
        </Link>

        <Link
          to="/admin/adminshinyapprovals"
          className="admin-card"
        >
          <div>
            <h2>📥 Submissions</h2>
            <p>
              Review member shiny
              submissions and approve
              them into the dex.
            </p>
          </div>
        </Link>

      </div>
    </div>
  );
}