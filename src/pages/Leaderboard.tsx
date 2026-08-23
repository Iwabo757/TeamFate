import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import PokemonInfoModal from "../components/PokemonInfoModal";

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

type FilterType =
  | "week"
  | "month"
  | "3months"
  | "6months"
  | "1year"
  | "2years"
  | "all";

function getGifName(name: string) {
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

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>([]);

  const [selectedPokemon, setSelectedPokemon] =
    useState<ShinyCatch | null>(null);

  const [allShinies, setAllShinies] =
    useState<ShinyCatch[]>([]);

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
      const { data: profiles, error: profilesError } =
        await supabase
          .from("profiles")
          .select(
            "id,nickname,username,avatar_url"
          );

      if (profilesError) {
        throw profilesError;
      }

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

      const {
        data: pokemonData,
        error: pokemonError,
      } =
        await supabase
          .from("pokemon")
          .select("id,name");

      if (pokemonError) {
        throw pokemonError;
      }

      const pokemonMap: Record<
        number,
        string
      > = {};

      pokemonData?.forEach(
        (pokemon: any) => {
          pokemonMap[
            Number(pokemon.id)
          ] = pokemon.name;
        }
      );

      const {
        data: catches,
        error: catchesError,
      } =
        await supabase
          .from("shiny_catches")
          .select(`
            id,
            pokemon_id,
            profile_id,
            date_found
          `);

      if (catchesError) {
        throw catchesError;
      }

      if (!catches) {
        setLeaderboard([]);
        setAllShinies([]);
        return;
      }

      const formattedAllShinies =
        catches.map(
          (catchData: any) => {
            const trainerInfo =
              profileMap[
                catchData.profile_id
              ] || {
                name: "Unknown",
              };

            return {
              id: catchData.id,
              pokemon_id: Number(
                catchData.pokemon_id
              ),
              pokemon_name:
                pokemonMap[
                  Number(
                    catchData.pokemon_id
                  )
                ] || "Unknown",
              owner:
                trainerInfo.name,
              date_found:
                catchData.date_found,
            };
          }
        );

      setAllShinies(
        formattedAllShinies
      );

      const cutoff =
        getCutoff();

      const filteredShinies =
        formattedAllShinies.filter(
          (shiny) => {
            if (!cutoff) {
              return true;
            }

            return (
              new Date(
                shiny.date_found
              ) >= cutoff
            );
          }
        );

      const groups: Record<
        string,
        LeaderboardEntry
      > = {};

      filteredShinies.forEach(
        (shiny) => {
          const profileEntry =
            Object.entries(
              profileMap
            ).find(
              ([, profile]) =>
                profile.name ===
                shiny.owner
            );

          const avatar =
            profileEntry
              ? profileEntry[1].avatar
              : undefined;

          if (!groups[shiny.owner]) {
            groups[
              shiny.owner
            ] = {
              trainer:
                shiny.owner,
              avatar,
              count: 0,
              shinies: [],
            };
          }

          groups[
            shiny.owner
          ].count++;

          groups[
            shiny.owner
          ].shinies.push(
            shiny
          );
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
    } catch (error) {
      console.error(
        "Failed to load leaderboard:",
        error
      );

      setLeaderboard([]);
      setAllShinies([]);
    } finally {
      setLoading(false);
    }
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

  const matchingShinies =
    selectedPokemon
      ? allShinies.filter(
          (shiny) =>
            shiny.pokemon_id ===
            selectedPokemon.pokemon_id
        )
      : [];

  const owners =
    matchingShinies.reduce<
      Record<string, number>
    >(
      (totals, shiny) => {
        totals[shiny.owner] =
          (totals[shiny.owner] || 0) +
          1;

        return totals;
      },
      {}
    );

  if (loading) {
    return (
      <div className="loading-page">
        Loading Leaderboard...
      </div>
    );
  }

  return (
    <div className="leaderboard-page">

      <div className="dex-header">
        <h1>
          🏆 Shiny Leaderboard
        </h1>

        <p>
          Top shiny hunters ranked
          by selected period.
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
              : `${
                  filterOptions.find(
                    ([value]) =>
                      value === filter
                  )?.[1] || filter
                } Champion`}
          </div>

        </div>
      )}

      {leaderboard.map(
        (entry, index) => (
          <div
            key={entry.trainer}
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
                #{index + 1}{" "}
                {entry.trainer} (
                {entry.count})
              </h2>

            </div>

            <div className="showcase-sprites">

              {entry.shinies.map(
                (shiny) => (
                  <div
                    key={shiny.id}
                    className="showcase-card"
                    onClick={() =>
                      setSelectedPokemon(
                        shiny
                      )
                    }
                  >

                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`}
                      alt={
                        shiny.pokemon_name
                      }
                      className="showcase-sprite"
                      onMouseEnter={(
                        event
                      ) => {
                        event.currentTarget.src =
                          `https://play.pokemonshowdown.com/sprites/ani-shiny/${getGifName(
                            shiny.pokemon_name
                          )}.gif`;
                      }}
                      onMouseLeave={(
                        event
                      ) => {
                        event.currentTarget.src =
                          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`;
                      }}
                      onError={(
                        event
                      ) => {
                        event.currentTarget.src =
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
        <PokemonInfoModal
          pokemon={{
            id:
              selectedPokemon.pokemon_id,
            name:
              selectedPokemon.pokemon_name,
            caught: true,
            owners,
            screenshots: [],
            totalCopies:
              matchingShinies.length,
          }}
          onClose={() =>
            setSelectedPokemon(null)
          }
          defaultTab="Team Fate"
        />
      )}

    </div>
  );
}