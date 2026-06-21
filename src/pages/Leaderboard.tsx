import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ShinyCatch = {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
  owner: string;
  date_found: string;
};

type LeaderboardEntry = {
  trainer: string;
  count: number;
  avatar?: string;
  shinies: ShinyCatch[];
};

function getGifName(
  name: string
) {
  return name
    .toLowerCase()
    .replace(/ /g, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/:/g, "")
    .replace(/-/g, "");
}

export default function Leaderboard() {
  const [loading, setLoading] =
    useState(true);

type FilterType =
  | "week"
  | "month"
  | "3months"
  | "6months"
  | "1year"
  | "2years"
  | "all";

const [filter, setFilter] =
  useState<FilterType>("all");

  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>([]);

  const [selectedPokemon, setSelectedPokemon] =
    useState<ShinyCatch | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  function getCutoff() {
    const now = new Date();

    switch (filter) {
      case "week":
        now.setDate(
          now.getDate() - 7
        );
        return now;

      case "month":
        now.setMonth(
          now.getMonth() - 1
        );
        return now;

      case "3months":
        now.setMonth(
          now.getMonth() - 3
        );
        return now;

      case "6months":
        now.setMonth(
          now.getMonth() - 6
        );
        return now;

      case "1year":
        now.setFullYear(
          now.getFullYear() - 1
        );
        return now;

      case "2years":
        now.setFullYear(
          now.getFullYear() - 2
        );
        return now;

      default:
        return null;
    }
  }

  async function loadLeaderboard() {
    setLoading(true);

    try {
const { data: profiles } =
  await supabase
    .from("profiles")
    .select(
      "id,nickname,username,avatar_url"
    );

const profileMap: Record<
  string,
  {
    name: string;
    avatar?: string;
  }
> = {};

profiles?.forEach(
  (profile: any) => {
    profileMap[
      profile.id
    ] = {
      name:
        profile.nickname ||
        profile.username ||
        "Unknown",

      avatar:
        profile.avatar_url,
    };
  }
);

const { data: pokemonData } =
  await supabase
    .from("pokemon")
    .select("id,name");

const pokemonMap: Record<
  number,
  string
> = {};

pokemonData?.forEach(
  (poke: any) => {
    pokemonMap[
      Number(poke.id)
    ] = poke.name;
  }
);
      const { data: catches } =
        await supabase
          .from("shiny_catches")
          .select(`
            id,
            pokemon_id,
            profile_id,
            date_found
          `);

      if (!catches) return;

      const cutoff =
        getCutoff();

      const filtered =
        catches.filter(
          (catchData: any) => {
            if (!cutoff)
              return true;

            return (
              new Date(
                catchData.date_found
              ) >= cutoff
            );
          }
        );

      const groups: Record<
        string,
        LeaderboardEntry
      > = {};

      filtered.forEach(
        (catchData: any) => {

const trainerInfo =
  profileMap[
    catchData.profile_id
  ] || {
    name: "Unknown",
  };

const trainer =
  trainerInfo.name;

          if (
            !groups[trainer]
          ) {
groups[trainer] = {
  trainer,
  avatar:
    trainerInfo.avatar,
  count: 0,
  shinies: [],
};
          }

          groups[
            trainer
          ].count++;

groups[
  trainer
].shinies.push({
  id: catchData.id,
  pokemon_id:
    catchData.pokemon_id,
  pokemon_name:
    pokemonMap[
      Number(
        catchData.pokemon_id
      )
    ] || "unknown",
  owner: trainer,
  date_found:
    catchData.date_found,
});
        }
      );

      const sorted =
        Object.values(groups)
          .sort(
            (a, b) =>
              b.count -
              a.count
          )
          .slice(0, 5);

      setLeaderboard(
        sorted
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        Loading Leaderboard...
      </div>
    );
  }

const filterOptions: [
  FilterType,
  string
][] = [
  ["week", "Week"],
  ["month", "Month"],
  ["3months", "3 Months"],
  ["6months", "6 Months"],
  ["1year", "1 Year"],
  ["2years", "2 Years"],
  ["all", "All Time"],
];

  const champion =
    leaderboard[0];

  return (
    <div className="leaderboard-page">
      <div className="dex-header">
        <h1>
          🏆 Shiny Leaderboard
        </h1>

        <p>
          Top shiny hunters
          ranked by selected
          period.
        </p>
      </div>

<div className="leaderboard-filters">
  {filterOptions.map(
    ([value, label]) => (
      <button
        key={value}
        onClick={() =>
          setFilter(value)
        }
        className={`leader-filter ${
          filter === value
            ? "active"
            : ""
        }`}
      >
        {label}
      </button>
    )
  )}
</div>

{champion && (
  <div className="leaderboard-champion">
<h2>
  👑 Current Champion
</h2>

{champion.avatar && (
  <img
    src={champion.avatar}
    alt={champion.trainer}
    className="champion-avatar"
  />
)}

<div className="champion-name">
  {champion.trainer}
</div>

<div className="champion-count">
  {champion.count} Shinies
</div>

<div className="champion-period">
  {filter === "all"
    ? "All Time Champion"
    : `${filter} Champion`}
</div>
        </div>
      )}

      {leaderboard.map(
        (
          entry,
          index
        ) => (
          <div
            key={
              entry.trainer
            }
            className="showcase-member"
          >
<div className="leaderboard-user-header">
  {entry.avatar && (
    <img
      src={entry.avatar}
      alt={entry.trainer}
      className="leaderboard-user-avatar"
    />
  )}

  <h2>
    #{index + 1} {entry.trainer} ({entry.count})
  </h2>
</div>

            <div className="showcase-sprites">
              {entry.shinies.map(
                (
                  shiny
                ) => (
                  <div
                    key={
                      shiny.id
                    }
                    className="showcase-card"
                    onClick={() =>
                      setSelectedPokemon(
                        shiny
                      )
                    }
                  >
<img
  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`}
  alt=""
  className="showcase-sprite"
  onMouseEnter={(e) => {
    e.currentTarget.src =
      `https://play.pokemonshowdown.com/sprites/ani-shiny/${getGifName(
        shiny.pokemon_name
      )}.gif`;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.src =
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`;
  }}
  onError={(e) => {
    e.currentTarget.src =
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`;
  }}
/>

                  </div>
                )
              )}
            </div>
          </div>
        )
      )}

      {selectedPokemon && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedPokemon(
              null
            )
          }
        >
          <div
            className="pokemon-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close-btn"
              onClick={() =>
                setSelectedPokemon(
                  null
                )
              }
            >
              ×
            </button>

            <div className="modal-header">
              <h2>
                Pokémon #
                {
                  selectedPokemon.pokemon_id
                }
              </h2>

              <span className="status-badge">
                Shiny
              </span>
            </div>

            <div className="modal-body">
              <div className="modal-left">
<img
  src={`https://play.pokemonshowdown.com/sprites/ani-shiny/${getGifName(
    selectedPokemon.pokemon_name
  )}.gif`}
  alt=""
  className="modal-sprite"
  onError={(e) => {
    e.currentTarget.src =
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${selectedPokemon.pokemon_id}.png`;
  }}
/>
              </div>

              <div className="modal-right">
                <div className="detail-card">
                  <h3>
                    Trainer
                  </h3>

                  <p>
                    {
                      selectedPokemon.owner
                    }
                  </p>
                </div>

                <div className="detail-card">
                  <h3>
                    Date Found
                  </h3>

                  <p>
                    {
                      selectedPokemon.date_found
                    }
                  </p>
                </div>

                <div className="detail-card">
                  <h3>
                    National
                    Dex
                  </h3>

                  <p>
                    #
                    {
                      selectedPokemon.pokemon_id
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}