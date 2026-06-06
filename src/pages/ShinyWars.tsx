import {
  useEffect,
  useState,
} from "react";

import { supabase }
from "../lib/supabase";

interface ShinyCatch {
  id: string;
  member_name: string;
  pokemon_name: string;
  sprite_url: string;
  date_found: string;
  method: string;
  secret_shiny?: boolean;
  pokemon_id: string;

  pokemon?: {
    name: string;
    sprite_url: string;
  };
}

interface TeamMember {
  id: string;

  member_name: string;

  team: string;
}

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

const { data: shinyData } = await supabase
  .from("shiny_catches")
  .select(`
    *,
    pokemon:pokemon_id(
      id,
      name,
      sprite_url
    )
  `);


console.log("SHINY DATA", shinyData);

const startDate = new Date(warData.start_date);
startDate.setHours(0,0,0,0);

const endDate = new Date(warData.end_date);
endDate.setHours(23,59,59,999);

console.log("WAR START", warData.start_date);
console.log("WAR END", warData.end_date);
console.log("SHINY DATES",
  shinyData?.map(s => s.date_found)
);

const filteredShinies = (shinyData || []).filter(
  (shiny) => {
    const shinyDate = new Date(shiny.date_found);

    return (
      shinyDate >= startDate &&
      shinyDate <= endDate
    );
  }
);
const normalizedShinies =
  filteredShinies.map((s: any) => ({
    ...s,
    member_name:
      s.member_name ||
      s.trainer
  }));

console.log(normalizedShinies);

setCatches(normalizedShinies);

console.log("WAR CATCHES", normalizedShinies);
console.log("TEAM MEMBERS", teamData);
console.log(shinyData);
setLoading(false);

}

function shinyPoints(shiny: ShinyCatch) {
  let points = catchPoints(shiny.method);

  if (shiny.secret_shiny) {
    points += 1;
  }

  return points;
}

function memberShinies(memberName: string) {
  const results = catches.filter(
    (c) =>
      c.member_name?.toLowerCase().trim() ===
      memberName?.toLowerCase().trim()
  );

  console.log(
    "COMPARE",
    memberName,
    catches.map(c => c.member_name),
    results
  );

  return results;
}

function catchPoints(
  method?: string
) {
  const m =
    method
      ?.toLowerCase()
      .trim();

  switch (m) {
    case "5x horde":
    case "×5 horde":
      return 2;

    case "3x horde":
    case "×3 horde":
      return 3;

    case "horde":
      return 2;

    case "fishing":
      return 6;

    case "single":
      return 8;

    case "fossil":
      return 12;

    case "egg":
      return 17;

    case "shalpha":
      return 20;

    case "wild shalpha":
      return 35;

    case "legendary":
      return 40;

    default:
      return 1;
  }
}

function teamScore(teamName: string) {
  const teamMembers = members.filter(
    (m) => m.team === teamName
  );

  return catches
    .filter((catchData) =>
      teamMembers.some(
        (member) =>
          member.member_name
            ?.toLowerCase()
            .trim() ===
          catchData.member_name
            ?.toLowerCase()
            .trim()
      )
    )
    .reduce(
      (total, shiny) =>
        total + shinyPoints(shiny),
      0
    );
}

function memberScore(
  memberName: string
) {
  return memberShinies(
    memberName
  ).reduce(
    (
      total,
      shiny
    ) =>
      total +
      shinyPoints(
        shiny
      ),
    0
  );
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
    Total Points
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
  Total Points
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
  }
  pts
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
    memberScore(
      member.member_name
    )
  }
  {" "}
  pts
</p>

<p>
  {
    memberShinies(
      member.member_name
    ).length
  }
  {" "}
  shinies
</p>

<div className="showcase-sprites">


{memberShinies(member.member_name).map((shiny) => {
  console.log("SPRITE", shiny);

  return (
<img
  key={shiny.id}
  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny.pokemon_id}.png`}
  alt={String(shiny.pokemon_id)}
/>
  );
})}

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
  pts
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
    memberScore(
      member.member_name
    )
  }{" "}
  pts
</p>

<p>
  {
    memberShinies(
      member.member_name
    ).length
  }{" "}
  shinies
</p>

                <div className="showcase-sprites">

                  {memberShinies(
                    member.member_name
                  ).map(
                    (
                      shiny
                    ) => (
<img
  key={shiny.id}
  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${shiny.pokemon_id}.png`}
  alt={String(shiny.pokemon_id)}
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