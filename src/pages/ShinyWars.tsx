import {
  useEffect,
  useState,
} from "react";

import { supabase }
from "../lib/supabase";

import {
  useParams,
  useNavigate
} from "react-router-dom";

interface ShinyCatch {
  id: string;
  pokemon_id: number;
  member_name: string;
  date_found: string;
  method: string;
  is_secret?: boolean;
  is_alpha?: boolean;

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

function getGifName(
  name: string
) {
  return name
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/ /g, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/:/g, "")
    .replace(/-/g, "");
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

const { warId } = useParams();

const navigate =
  useNavigate();

const [view, setView] =
  useState(
    warId
      ? "past"
      : "current"
  );

const isHistory =
  !!warId;


useEffect(() => {
  loadWar();
}, [warId]);

  async function loadWar() {

let warQuery = supabase
  .from("shiny_wars")
  .select("*");

if (warId) {
  warQuery =
    warQuery.eq(
      "id",
      warId
    );
} else {
  warQuery =
    warQuery.eq(
      "active",
      true
    );
}

const {
  data: warData,
} =
  await warQuery.single();


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

function shinyPoints(
  shiny: ShinyCatch
) {
  let points =
    catchPoints(
      shiny.method
    );

  if (shiny.is_secret) {
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

function switchView(
  newView:
    | "current"
    | "past"
) {
  setView(newView);

  if (
    newView ===
    "current"
  ) {
    navigate(
      "/events/shinywars"
    );
  } else {
    navigate(
      "/events/shinywars/history"
    );
  }
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

  if (
    m.includes(
      "fishing"
    )
  )
    return 6;

  if (
    m.includes(
      "single"
    )
  )
    return 8;

  if (
    m.includes(
      "safari"
    )
  )
    return 10;

  if (
    m.includes(
      "fossil"
    )
  )
    return 12;

  if (
    m.includes("egg")
  )
    return 17;

  if (
    m.includes(
      "wild shalpha"
    )
  )
    return 35;

  if (
    m.includes(
      "shalpha"
    )
  )
    return 20;

  if (
    m.includes(
      "legendary"
    )
  )
    return 40;

  return 1;
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

function winningTeam() {
  if (!war) return null;

  const teamOneScore =
    teamScore(
      war.team_one_name
    );

  const teamTwoScore =
    teamScore(
      war.team_two_name
    );

  if (
    teamOneScore >
    teamTwoScore
  )
    return war.team_one_name;

  if (
    teamTwoScore >
    teamOneScore
  )
    return war.team_two_name;

  return "Tie";
}

function teamMVP(
  teamName: string
) {
  const teamMembers =
    members.filter(
      (m) =>
        m.team === teamName
    );

  if (
    teamMembers.length === 0
  )
    return null;

  let best =
    teamMembers[0];

  let bestScore =
    memberScore(
      best.member_name
    );

  for (const member of teamMembers) {
    const score =
      memberScore(
        member.member_name
      );

    if (score > bestScore) {
      best = member;
      bestScore = score;
    }
  }

  return {
    name: best.member_name,
    points: bestScore,
  };
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
  <>
    {isHistory && war && (
      <div className="history-results-card">
        <h2>🏆 Winner: {winningTeam()}</h2>

        <div className="history-score-row">
          <div>
            ⭐ {war.team_one_name}: {teamScore(war.team_one_name)} pts
          </div>

          <div>
            🔥 {war.team_two_name}: {teamScore(war.team_two_name)} pts
          </div>
        </div>

        <div className="history-mvp-row">
          <div>
            ⭐ MVP: {teamMVP(war.team_one_name)?.name}
            {" ("}
            {teamMVP(war.team_one_name)?.points}
            pts)
          </div>

          <div>
            🔥 MVP: {teamMVP(war.team_two_name)?.name}
            {" ("}
            {teamMVP(war.team_two_name)?.points}
            pts)
          </div>
        </div>
      </div>
    )}

    <div className="page">

<div className="leaderboard-filters">
  <button
    className={`leader-filter ${
      view === "current"
        ? "active"
        : ""
    }`}
    onClick={() =>
      switchView(
        "current"
      )
    }
  >
    Active Wars
  </button>

  <button
    className={`leader-filter ${
      view === "past"
        ? "active"
        : ""
    }`}
    onClick={() =>
      switchView(
        "past"
      )
    }
  >
    War History
  </button>
</div>

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

{isHistory ? (
  <h3>
    War Complete
  </h3>
) : (
  <h3>
    {daysRemaining()}
    d Remaining
  </h3>
)}

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
  src={`https://play.pokemonshowdown.com/sprites/ani-shiny/${getGifName(
    shiny.pokemon?.name || ""
  )}.gif`}
  alt={
    shiny.pokemon?.name
  }
  className="war-pokemon-sprite"
  onError={(e) => {
    e.currentTarget.src =
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`;
  }}
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
  src={`https://play.pokemonshowdown.com/sprites/ani-shiny/${getGifName(
    shiny.pokemon?.name || ""
  )}.gif`}
  alt={
    shiny.pokemon?.name
  }
  className="war-pokemon-sprite"
  onError={(e) => {
    e.currentTarget.src =
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`;
  }}
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
    </>
  );
}