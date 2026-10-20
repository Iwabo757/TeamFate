import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type ShinySubmission = {
  id: string;
  status: string | null;
  pokemon_id: number | null;
  pokemon?: { name?: string | null } | null;
  profile?: { nickname?: string | null; username?: string | null } | null;
};

export default function ShinyDashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<ShinySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSubmissions() {
      const { data, error } = await supabase
        .from("shiny_submissions")
        .select("id, status, pokemon_id, pokemon:pokemon_id(name), profile:profile_id(nickname, username)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load shiny submissions:", error);
      } else if (!cancelled) {
        setSubmissions((data ?? []) as unknown as ShinySubmission[]);
      }

      if (!cancelled) setLoading(false);
    }

    void loadSubmissions();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingSubmissions = useMemo(
    () => submissions.filter((submission) => submission.status === "pending"),
    [submissions]
  );
  const approvedCount = submissions.filter((submission) => submission.status === "approved").length;
  const rejectedCount = submissions.filter((submission) => submission.status === "rejected").length;

  function handleActionChange(value: string) {
    setAction(value);
    if (value) navigate(value);
  }

  return (
    <div className="page">
      <h1 className="page-title">✨ Shiny Dashboard</h1>
      <p>Manage the Team Faté Shiny Dex and review member submissions.</p>

      <div className="admin-grid" aria-label="Shiny submission overview">
        <div className="admin-card" style={{ textAlign: "center", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "2rem" }}>{loading ? "—" : pendingSubmissions.length}</h2>
          <p style={{ margin: 0 }}>Pending review</p>
        </div>
        <div className="admin-card" style={{ textAlign: "center", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "2rem" }}>{loading ? "—" : approvedCount}</h2>
          <p style={{ margin: 0 }}>Approved</p>
        </div>
        <div className="admin-card" style={{ textAlign: "center", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "2rem" }}>{loading ? "—" : rejectedCount}</h2>
          <p style={{ margin: 0 }}>Rejected</p>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: "20px" }}>
        <label htmlFor="shiny-dashboard-action" style={{ display: "block", marginBottom: "8px" }}>
          Choose an action
        </label>
        <select
          id="shiny-dashboard-action"
          value={action}
          onChange={(event) => handleActionChange(event.target.value)}
          style={{ width: "100%", maxWidth: "420px", padding: "12px", borderRadius: "10px", font: "inherit" }}
        >
          <option value="">Select an action…</option>
          <option value="/admin/shinies/add">➕ Add Shiny</option>
          <option value="/admin/shinies">✨ Manage Shinies</option>
          <option value="/admin/shiny-approvals">📥 Shiny Submissions</option>
        </select>
      </div>

      <div className="admin-card" style={{ marginTop: "20px" }}>
        <h2 style={{ marginTop: 0 }}>Pending shiny submissions</h2>
        {loading && <p>Loading submissions…</p>}
        {!loading && pendingSubmissions.length === 0 && (
          <p style={{ marginBottom: 0 }}>There are no shiny submissions waiting for review.</p>
        )}
        {!loading && pendingSubmissions.length > 0 && (
          <>
            <p>Pokémon awaiting review:</p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "12px" }}>
              {pendingSubmissions.map((submission) => {
                const pokemonName = submission.pokemon?.name || "Unknown Pokémon";
                const trainerName = submission.profile?.nickname || submission.profile?.username || "Unknown trainer";
                return (
                  <div
                    key={submission.id}
                    title={pokemonName + " — " + trainerName}
                    style={{ textAlign: "center", minWidth: "76px" }}
                  >
                    {submission.pokemon_id !== null && (
                      <img
                        src={"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/" + submission.pokemon_id + ".png"}
                        alt={"Shiny " + pokemonName}
                        loading="lazy"
                        style={{ width: "56px", height: "56px", objectFit: "contain", imageRendering: "pixelated" }}
                      />
                    )}
                    <div style={{ fontSize: ".85rem", lineHeight: 1.25 }}>{pokemonName}</div>
                    <div style={{ fontSize: ".75rem", opacity: 0.8, lineHeight: 1.25 }}>{trainerName}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
