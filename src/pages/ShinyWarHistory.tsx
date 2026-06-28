import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

import { useNavigate } from "react-router-dom";

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

interface TeamMember {
  id: string;
  member_name: string;
  team: string;
}

function catchPoints(
  method?: string
) {
  const m =
    method?.toLowerCase().trim();

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

const navigate =
  useNavigate();

const [view, setView] =
  useState("past");

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
              data: teamData,
            } = await supabase
              .from(
                "shiny_war_teams"
              )
              .select("*")
              .eq(
                "war_id",
                war.id
              );

            const teamMembers =
              (teamData ||
                []) as TeamMember[];

            const {
              data: catches,
            } = await supabase
              .from(
                "shiny_catches"
              )
              .select(`
                member_name,
                method,
                is_secret,
                date_found
              `);

            const startDate =
              new Date(
                war.start_date
              );
            startDate.setHours(
              0,
              0,
              0,
              0
            );

            const endDate =
              new Date(
                war.end_date
              );
            endDate.setHours(
              23,
              59,
              59,
              999
            );

            const warCatches =
              (catches || []).filter(
                (shiny) => {
                  const shinyDate =
                    new Date(
                      shiny.date_found
                    );

                  return (
                    shinyDate >=
                      startDate &&
                    shinyDate <=
                      endDate
                  );
                }
              );

            let teamOneScore = 0;
            let teamTwoScore = 0;

            for (const shiny of warCatches) {
              let points =
                catchPoints(
                  shiny.method
                );

              if (
                shiny.is_secret
              ) {
                points += 1;
              }

              const member =
                teamMembers.find(
                  (m) =>
                    m.member_name
                      ?.toLowerCase()
                      .trim() ===
                    shiny.member_name
                      ?.toLowerCase()
                      .trim()
                );

              if (!member)
                continue;

              if (
                member.team ===
                war.team_one_name
              ) {
                teamOneScore +=
                  points;
              }

              if (
                member.team ===
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
              winner,
              teamOneScore,
              teamTwoScore,
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
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="page">
<div className="leaderboard-filters">
  <button
    className={`leader-filter ${
      view === "current"
        ? "active"
        : ""
    }`}
    onClick={() => {
      setView("current");
      navigate(
        "/events/shinywars"
      );
    }}
  >
    Active War
  </button>

  <button
    className={`leader-filter ${
      view === "past"
        ? "active"
        : ""
    }`}
  >
    War History
  </button>
</div>
      <h1>
        Shiny War History
      </h1>

      {wars.length === 0 ? (
        <p>
          No completed shiny
          wars yet.
        </p>
      ) : (
        <div className="event-grid">
          {wars.map((war) => (
            <div
              key={war.id}
              className="event-card"
            >
              <div className="event-card-content">
                <h2>
                  {war.title}
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
                    {war.winner}
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
                  View Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}