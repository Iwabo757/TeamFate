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

  team_one_score: number;

  team_two_score: number;

  start_date: string;

  end_date: string;

  active: boolean;
}

export default function ShinyWarHistory() {

  const [wars,
    setWars] =
    useState<ShinyWar[]>(
      []
    );

  useEffect(() => {
    loadWars();
  }, []);

  async function loadWars() {

    const { data } =
      await supabase
        .from("shiny_wars")
        .select("*")
        .eq(
          "active",
          false
        )
        .order(
          "end_date",
          {
            ascending:
              false,
          }
        );

    setWars(data || []);
  }

  function winner(
    war: ShinyWar
  ) {

    if (
      war.team_one_score >
      war.team_two_score
    ) {
      return war.team_one_name;
    }

    if (
      war.team_two_score >
      war.team_one_score
    ) {
      return war.team_two_name;
    }

    return "Tie";
  }

  return (
    <div className="page">

      <h1>
        Shiny War History
      </h1>

      <div className="event-grid">

        {wars.map(
          (war) => (

            <div
              key={war.id}
              className="event-card"
            >

              <div
                className="event-card-content"
              >

                <h2>
                  {
                    war.title
                  }
                </h2>

                <p>
                  Winner:
                  {" "}
                  <strong>
                    {
                      winner(
                        war
                      )
                    }
                  </strong>
                </p>

                <p>
                  ⭐{" "}
                  {
                    war.team_one_name
                  }
                  :
                  {" "}
                  {
                    war.team_one_score
                  }
                </p>

                <p>
                  🔥{" "}
                  {
                    war.team_two_name
                  }
                  :
                  {" "}
                  {
                    war.team_two_score
                  }
                </p>

                <p>
                  Ended:
                  {" "}
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
          )
        )}

      </div>

    </div>
  );
}