import {
  useEffect,
  useState,
} from "react";

import { supabase }
from "../lib/supabase";

interface War {
  id: string;

  title: string;

  description: string;

  team_one_name: string;

  team_two_name: string;

  team_one_image: string;

  team_two_image: string;

  start_date: string;

  end_date: string;
}

interface TeamMember {
  id: string;

  member_name: string;

  team: string;
}

interface ShinyCatch {
  id: string;

  member_name: string;

  pokemon_name: string;

  sprite_url: string;

  date_found: string;
}

export default function ShinyWars() {

  const [war,
    setWar] =
    useState<War | null>(
      null
    );

  const [members,
    setMembers] =
    useState<TeamMember[]>(
      []
    );

  const [catches,
    setCatches] =
    useState<ShinyCatch[]>(
      []
    );

  const [loading,
    setLoading] =
    useState(true);

  useEffect(() => {
    loadWar();
  }, []);

  async function loadWar() {

    const {
      data: warData,
    } = await supabase
      .from("shiny_wars")
      .select("*")
      .eq("active", true)
      .single();

    if (!warData) {
      setLoading(false);
      return;
    }

    setWar(warData);

    const {
      data: teamData,
    } = await supabase
      .from(
        "shiny_war_teams"
      )
      .select("*")
      .eq(
        "war_id",
        warData.id
      );

    setMembers(
      teamData || []
    );

const {
  data: shinyData,
} = await supabase
  .from("shiny_catches")
  .select(`
    *,
    pokemon:pokemon_id(
      name,
      shiny_sprite
    )
  `)
      .gte(
        "date_found",
        warData.start_date
      )
      .lte(
        "date_found",
        warData.end_date
      );

    setCatches(
      shinyData || []
    );

    setLoading(false);
  }

function memberShinies(memberName: string) {
  return catches.filter(
    (c) =>
      c.member_name
        ?.toLowerCase()
        .trim() ===
      memberName
        ?.toLowerCase()
        .trim()
  );
}

  function teamScore(
    teamName: string
  ) {

    const teamMembers =
      members.filter(
        (m) =>
          m.team ===
          teamName
      );

return catches.filter(
  (catchData) =>
    teamMembers.some(
      (member) =>
        member.member_name
          ?.toLowerCase()
          .trim() ===
        catchData.member_name
          ?.toLowerCase()
          .trim()
    )
).length;
  }

  function daysRemaining() {

    if (!war)
      return 0;

    const end =
      new Date(
        war.end_date
      ).getTime();

    const now =
      Date.now();

    return Math.max(
      0,
      Math.ceil(
        (end - now) /
          86400000
      )
    );
  }

  if (loading) {
    return (
      <div className="page">
        Loading...
      </div>
    );
  }

  if (!war) {
    return (
      <div className="page">
        <h1>
          No Active Shiny War
        </h1>
      </div>
    );
  }

  const teamOne =
    members.filter(
      (m) =>
        m.team ===
        war.team_one_name
    );

  const teamTwo =
    members.filter(
      (m) =>
        m.team ===
        war.team_two_name
    );

  return (
    <div className="page">

      <h1>
        {war.title}
      </h1>

      <p className="war-description">
        {war.description}
      </p>

      {/* SCOREBOARD */}

      <div className="war-scoreboard">

<div
  className="war-score-card"
  style={{
    backgroundImage: war.team_one_image
      ? `linear-gradient(
          rgba(0,0,40,.75),
          rgba(0,0,40,.75)
        ),
        url(${war.team_one_image})`
      : undefined,
  }}
>

  <h2>
    ⭐ {war.team_one_name}
  </h2>

  <h1>
    {teamScore(
      war.team_one_name
    )}
  </h1>

  <p>
    Total Shinies
  </p>

</div>

        <div className="war-score-center">

          <h2>
            ⚔️ Shiny War
          </h2>

          <h3>
            {daysRemaining()}
            d Remaining
          </h3>

          <p>
            Ends:
          </p>

          <p>
            {new Date(
              war.end_date
            ).toLocaleString()}
          </p>

        </div>

<div
  className="war-score-card"
  style={{
    backgroundImage: war.team_two_image
      ? `linear-gradient(
          rgba(0,0,40,.75),
          rgba(0,0,40,.75)
        ),
        url(${war.team_two_image})`
      : undefined,
  }}
>

  <h2>
    🔥 {war.team_two_name}
  </h2>

  <h1>
    {teamScore(
      war.team_two_name
    )}
  </h1>

  <p>
    Total Shinies
  </p>

</div>

      </div>

      {/* TEAMS */}

      <div className="war-columns">

        {/* TEAM ONE */}

        <div className="war-column">

          <div className="war-team-header">
            <h2>
              ⭐{" "}
              {
                war.team_one_name
              }
            </h2>

            <p>
              {
                teamScore(
                  war.team_one_name
                )
              }{" "}
              Shinies
            </p>
          </div>

          {teamOne.map(
            (member) => (

              <div
                key={
                  member.id
                }
                className="member-war-card"
              >

                <h3>
                  {
                    member.member_name
                  }
                </h3>

                <p>
                  {
                    memberShinies(
                      member.member_name
                    ).length
                  }{" "}
                  catches
                </p>

<div className="showcase-sprites">

  {memberShinies(
    member.member_name
  ).map(
    (shiny) => (

      <img
        key={shiny.id}
        src={
          shiny.pokemon?.shiny_sprite
        }
        alt={
          shiny.pokemon?.name
        }
        title={
          shiny.pokemon?.name
        }
      />

    )
  )}

</div>

              </div>

            )
          )}

        </div>

        {/* TEAM TWO */}

        <div className="war-column">

          <div className="war-team-header">
            <h2>
              🔥{" "}
              {
                war.team_two_name
              }
            </h2>

            <p>
              {
                teamScore(
                  war.team_two_name
                )
              }{" "}
              Shinies
            </p>
          </div>

          {teamTwo.map(
            (member) => (

              <div
                key={
                  member.id
                }
                className="member-war-card"
              >

                <h3>
                  {
                    member.member_name
                  }
                </h3>

                <p>
                  {
                    memberShinies(
                      member.member_name
                    ).length
                  }{" "}
                  catches
                </p>

                <div className="showcase-sprites">

                  {memberShinies(
                    member.member_name
                  ).map(
                    (
                      shiny
                    ) => (

                      <img
                        key={
                          shiny.id
                        }
                        src={
                          shiny.sprite_url
                        }
                        alt={
                          shiny.pokemon_name
                        }
                        title={
                          shiny.pokemon_name
                        }
                      />

                    )
                  )}

                </div>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  );
}