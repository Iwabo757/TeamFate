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
    let cancelled = false;

    async function loadPendingSubmissions() {
      const { data, error } = await supabase
        .from("shiny_submissions")
        .select("id, pokemon_id, pokemon:pokemon_id(name), profile:profile_id(nickname, username)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load pending shiny submissions:", error);
      } else if (!cancelled) {
        setPendingSubmissions((data ?? []) as unknown as PendingSubmission[]);
      }

      if (!cancelled) {
        setPendingLoading(false);
      }
    }

    void loadPendingSubmissions();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h1>✨ Shiny Dashboard</h1>

      <div className="admin-grid">
        <Link to="/admin/shinies/add" className="admin-card">
          <div>
            <h2>➕ Add Shiny</h2>
            <p>Add a shiny directly to the Team Faté Shiny Dex.</p>
          </div>
        </Link>

        <Link to="/admin/shinies" className="admin-card">
          <div>
            <h2>✨ Manage Shinies</h2>
            <p>Edit and remove shiny records.</p>
          </div>
        </Link>

        <div>
          <Link to="/admin/shiny-approvals" className="admin-card">
            <div>
              <h2>📥 Submissions</h2>
              <p>Review member shiny submissions and approve them into the dex.</p>
            </div>
          </Link>

          <section aria-label="Pending shiny submissions overview" style={{ marginTop: "12px" }}>
            <p style={{ margin: "0 0 8px" }}>
              <strong>
                {pendingLoading
                  ? "Loading pending submissions…"
                  : `${pendingSubmissions.length} pending ${pendingSubmissions.length === 1 ? "submission" : "submissions"}`}
              </strong>
            </p>

            {!pendingLoading && pendingSubmissions.length === 0 && (
              <p style={{ margin: 0 }}>There are no shiny submissions waiting for review.</p>
            )}

            {!pendingLoading && pendingSubmissions.length > 0 && (
              <div>
                <p style={{ margin: "0 0 8px" }}>Pokémon awaiting review:</p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "10px" }}>
                  {pendingSubmissions.map((submission) => {
                    const pokemonName = submission.pokemon?.name || "Unknown Pokémon";
                    const trainerName = submission.profile?.nickname || submission.profile?.username || "Unknown trainer";

                    return (
                      <div key={submission.id} title={pokemonName + " — " + trainerName} style={{ textAlign: "center", minWidth: "64px" }}>
                        {submission.pokemon_id !== null && (
                          <img
                            src={"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/" + submission.pokemon_id + ".png"}
                            alt={"Shiny " + pokemonName}
                            loading="lazy"
                            style={{ width: "56px", height: "56px", objectFit: "contain", imageRendering: "pixelated" }}
                          />
                        )}
                        <div style={{ fontSize: ".8rem", lineHeight: 1.25 }}>{pokemonName}</div>
                        <div style={{ fontSize: ".72rem", opacity: 0.8, lineHeight: 1.25 }}>{trainerName}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
