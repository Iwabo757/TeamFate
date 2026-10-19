import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ShinyDashboard() {
  const [pendingSubmissions, setPendingSubmissions] = useState(0);

  useEffect(() => {
    async function loadPendingSubmissions() {
      const { count, error } = await supabase
        .from("shiny_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) {
        console.error("Failed to load pending shiny submissions:", error);
        return;
      }

      setPendingSubmissions(count ?? 0);
    }

    void loadPendingSubmissions();
  }, []);

  return (
    <div className="page">
      <h1>✨ Shiny Dashboard</h1>

      <div className="admin-grid">
        <Link to="/admin/shiny-approvals" className="admin-card">
          <div>
            <h2>📥 Pending Submissions: {pendingSubmissions}</h2>
            <p>
              {pendingSubmissions === 0
                ? "There are no shiny submissions waiting for review."
                : `You have ${pendingSubmissions} pending ${pendingSubmissions === 1 ? "submission" : "submissions"}.`}
              {" "}Open to review and approve or reject submissions.
            </p>
          </div>
        </Link>

        <Link to="/admin/shinies/add" className="admin-card">
          <div>
            <h2>➕ Add Shiny</h2>
            <p>
              Add a shiny directly to the
              Team Faté Shiny Dex.
            </p>
          </div>
        </Link>

        <Link to="/admin/shinies" className="admin-card">
          <div>
            <h2>✨ Manage Shinies</h2>
            <p>
              Edit and remove shiny
              records.
            </p>
          </div>
        </Link>

        <Link to="/admin/shiny-approvals" className="admin-card">
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
