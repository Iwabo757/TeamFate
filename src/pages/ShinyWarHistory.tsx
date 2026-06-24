import {
  useEffect,
  useState,
} from "react";
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
  winner?: string;
  teamOneScore?: number;
  teamTwoScore?: number;
}

function catchPoints(
  method?: string
) {
  const m =
    method
      ?.toLowerCase()
      .trim();

  if (!m) return 1;

  if (
    m.includes("5") &&
    m.includes("horde")
  )
    return 2;

  if (
    m.includes("3") &&
    m.includes("horde")
  )
    return 3;

  if (m.includes("fishing"))
    return 6;

  if (m.includes("single"))
    return 8;

  if (m.includes("safari"))
    return 10;

  if (m.includes("fossil"))
    return 12;

  if (m.includes("egg"))
    return 17;

  if (
    m.includes("wild shalpha")
  )
    return 35;

  if (m.includes("shalpha"))
    return 20;

  if (
    m.includes("legendary")
  )
    return 40;

  return 1;
}

export default function ShinyWarHistory() {
  const [wars, setWars] =
    useState<ShinyWar[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadWars();
  }, []);

async function loadWars() {
  const { data, error } =
    await supabase
      .from("shiny_wars")
      .select("*")
      .eq("active", false)
      .order("end_date", {
        ascending: false,
      });

  if (error) {
    console.error(error);
    setLoading(false);
    return;
  }

  const processedWars =
    await Promise.all(
      (data || []).map(
        async (war) => {
          const {
            data: catches,
          } = await supabase
            .from(
              "shiny_catches"
            )
            .select(`
              method,
              is_secret,
              profile_id
            `)
            .gte(
              "date_found",
              war.start_date
            )
            .lte(
              "date_found",
              war.end_date
            );

          let teamOneScore = 0;
          let teamTwoScore = 0;

          for (const shiny of catches || []) {
            let points =
              catchPoints(
                shiny.method
              );

            if (
              shiny.is_secret
            ) {
              points += 1;
            }

            const {
              data: profile,
            } = await supabase
              .from(
                "profiles"
              )
              .select("team")
              .eq(
                "id",
                shiny.profile_id
              )
              .single();

            const team =
              profile?.team;

            if (
              team ===
              war.team_one_name
            ) {
              teamOneScore +=
                points;
            }

            if (
              team ===
              war.team_two_name
            ) {
              teamTwoScore +=
                points;
            }
          }

          let winner =
            "Tie";

          if (
            teamOneScore >
            teamTwoScore
          ) {
            winner =
              war.team_one_name;
          } else if (
            teamTwoScore >
            teamOneScore
          ) {
            winner =
              war.team_two_name;
          }

          return {
            ...war,
            teamOneScore,
            teamTwoScore,
            winner,
          };
        }
      )
    );

  setWars(processedWars);
  setLoading(false);
}

  if (loading) {
    return (
      <div className="page">
        <h1>
          Loading...
        </h1>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>
        Shiny War History
      </h1>

      {wars.length ===
      0 ? (
        <p>
          No completed shiny
          wars yet.
        </p>
      ) : (
        <div className="event-grid">
          {wars.map(
            (war) => (
              <div
                key={war.id}
                className="event-card"
              >
                <div className="event-card-content">
                  <h2>
                    {
                      war.title
                    }
                  </h2>

                  <p>
                    Started:{" "}
                    {new Date(
                      war.start_date
                    ).toLocaleDateString()}
                  </p>

                  <p>
                    Ended:{" "}
                    {new Date(
                      war.end_date
                    ).toLocaleDateString()}
                  </p>

                  <p className="war-winner">
                    🏆 Winner:{" "}
                    <strong>
                      {
                        war.winner
                      }
                    </strong>
                  </p>

                  <p className="war-score">
                    ⭐{" "}
                    {war.teamOneScore ??
                      0}{" "}
                    — 🔥{" "}
                    {war.teamTwoScore ??
                      0}
                  </p>

                  <Link
                    className="save-btn"
                    to={`/events/shinywars/${war.id}`}
                  >
                    View
                    Results
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}