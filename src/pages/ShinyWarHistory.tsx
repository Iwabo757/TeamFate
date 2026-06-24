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
    }

    setWars(data || []);
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
      <h1>Shiny War History</h1>

      {wars.length === 0 ? (
        <p>No completed shiny wars yet.</p>
      ) : (
        <div className="event-grid">
          {wars.map((war) => (
            <div
              key={war.id}
              className="event-card"
            >
              <div className="event-card-content">
                <h2>{war.title}</h2>

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

                <Link
                  className="submit-btn"
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