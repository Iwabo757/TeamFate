import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type PendingSubmission = {
  id: string;
  pokemon_id: number | null;
  pokemon?: { name?: string | null } | null;
  profile?: { nickname?: string | null; username?: string | null } | null;
};

export default function ShinyDashboard() {
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPendingSubmissions() {
      const { data, error } = await supabase
        .from("shiny_submissions")
        .select(`
          id,
          pokemon_id,
          pokemon:pokemon_id(name),
          profile:profile_id(nickname, username)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load pending shiny submissions:", error);
        if (active) setPendingLoading(false);
        return;
      }

      if (active) {
        setPendingSubmissions((data ?? []) as unknown as PendingSubmission[]);
        setPendingLoading(false);
      }
    }

    void loadPendingSubmissions();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <h1>✨ Shiny Dashboard</h1>

      <div className="admin-grid">
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

        <div>
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

          <section
            aria-label="Pending shiny submissions overview"
            style={{ marginTop: "12px" }}
          >
            <p style={{ margin: "0 0 8px" }}>
              <strong>
                {pendingLoading
                  ? "Loading pending submissions…"
                  : `${pendingSubmissions.length} pending ${pendingSubmissions.length === 1 ? "submission" : "submissions"}`}
              </strong>
            </p>