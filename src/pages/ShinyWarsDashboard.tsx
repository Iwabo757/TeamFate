import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface ShinyWar {
  id: string;
  title: string;
  team_one_name: string;
  team_two_name: string;
  start_date: string;
  end_date: string;
  active: boolean;
}

export default function ShinyWarsDashboard() {
  const [wars, setWars] =
    useState<ShinyWar[]>([]);

  useEffect(() => {
    loadWars();
  }, []);

  async function loadWars() {
    const { data } =
      await supabase
        .from("shiny_wars")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    setWars(data || []);
  }

  async function endWar(
    warId: string
  ) {
    const confirmEnd =
      window.confirm(
        "End this Shiny War?"
      );

    if (!confirmEnd) return;

    await supabase
      .from("shiny_wars")
      .update({
        active: false,
      })
      .eq("id", warId);

    loadWars();
  }

  async function deleteWar(
    warId: string
  ) {
    const confirmDelete =
      window.confirm(
        "Delete this Shiny War?"
      );

    if (!confirmDelete) return;

    await supabase
      .from("shiny_wars")
      .delete()
      .eq("id", warId);

    loadWars();
  }

  return (
    <div className="page">

      <h1>
        ⚔️ Shiny Wars Dashboard
      </h1>

      <div className="admin-grid">

        <Link
          to="/admin/shinywars/create"
          className="admin-card"
        >
          <h2>
            ➕ Create Shiny War
          </h2>

          <p>
            Create a new war
          </p>
        </Link>

      </div>

      <div
        style={{
          marginTop: "30px",
        }}
      >
        {wars.map((war) => (
          <div
            key={war.id}
            className="admin-card"
            style={{
              marginBottom:
                "20px",
            }}
          >
            <h2>
              {war.title}
            </h2>

            <p>
              ⭐{" "}
              {
                war.team_one_name
              }{" "}
              vs 🔥{" "}
              {
                war.team_two_name
              }
            </p>

            <p>
              Start:
              {" "}
              {new Date(
                war.start_date
              ).toLocaleString()}
            </p>

            <p>
              End:
              {" "}
              {new Date(
                war.end_date
              ).toLocaleString()}
            </p>

            <p>
              Status:
              {" "}
              {war.active
                ? "🟢 Active"
                : "🔴 Ended"}
            </p>

            <div
              style={{
                display:
                  "flex",
                gap: "10px",
                marginTop:
                  "15px",
              }}
            >
              <Link
                className="submit-btn"
                to={`/admin/shinywars/edit/${war.id}`}
              >
                Edit
              </Link>

              <Link
                className="submit-btn"
                to={`/admin/shinywars/teams/${war.id}`}
              >
                Teams
              </Link>

              {war.active && (
                <button
                  className="submit-btn"
                  onClick={() =>
                    endWar(
                      war.id
                    )
                  }
                >
                  End War
                </button>
              )}

              <button
                className="delete-btn"
                onClick={() =>
                  deleteWar(
                    war.id
                  )
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}