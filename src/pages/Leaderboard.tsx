import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import PokemonInfoModal from "../components/PokemonInfoModal";

type ShinyCatch = {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
  owner: string;
  date_found: string | null;
  screenshot_url: string | null;
};

type LeaderboardEntry = {
  trainer: string;
  count: number;
  avatar?: string | null;
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
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]/g, "");
}

export default function Leaderboard() {
  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [leaderboard, setLeaderboard] =
    useState<
      LeaderboardEntry[]
    >([]);

  const [allShinies, setAllShinies] =
    useState<ShinyCatch[]>(
      []
    );

  const [
    selectedPokemon,
    setSelectedPokemon,
  ] = useState<
    ShinyCatch | null
  >(null);

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  function getCutoff() {
    if (filter === "all") {
      return null;
    }

    const now = new Date();

    switch (filter) {
      case "week":
        now.setDate(
          now.getDate() - 7
        );
        break;

      case "month":
        now.setMonth(
          now.getMonth() - 1
        );
        break;

      case "3months":
        now.setMonth(
          now.getMonth() - 3
        );
        break;

      case "6months":
        now.setMonth(
          now.getMonth() - 6
        );
        break;

      case "1year":
        now.setFullYear(
          now.getFullYear() - 1
        );
        break;

      case "2years":
        now.setFullYear(
          now.getFullYear() - 2
        );
        break;
    }

    return now;
  }

  async function loadLeaderboard() {
    setLoading(true);

    try {
      const [
        profilesResponse,
        pokemonResponse,
        catchesResponse,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            `
              id,
              nickname,
              username,
              avatar_url
            `
          ),

        supabase
          .from("pokemon")
          .select(
            "id, name"
          ),

        supabase
          .from("shiny_catches")
          .select(
            `
              id,
              pokemon_id,
              profile_id,
              date_found,
              screenshot_url
            `
          ),
      ]);

      if (profilesResponse.error) {
        throw profilesResponse.error;
      }

      if (pokemonResponse.error) {
        throw pokemonResponse.error;
      }

      if (catchesResponse.error) {
        throw catchesResponse.error;
      }

      const profileMap: Record<
        string,
        {
          name: string;
          avatar: string | null;
        }
      > = {};

      profilesResponse.data?.forEach(
        (profile) => {
          profileMap[
            profile.id
          ] = {
            name:
              profile.nickname ||
              profile.username ||
              "Unknown",

            avatar:
              profile.avatar_url ||
              null,
          };
        }
      );

      const pokemonMap: Record<
        number,
        string
      > = {};

      pokemonResponse.data?.forEach(
        (pokemon) => {
          pokemonMap[
            Number(pokemon.id)
          ] = pokemon.name;
        }
      );

      const formattedShinies:
        ShinyCatch[] =
        catchesResponse.data?.map(
          (shiny) => {
            const profile =
              profileMap[
                shiny.profile_id
              ];

            return {
              id: shiny.id,
              pokemon_id:
                Number(
                  shiny.pokemon_id
                ),
              pokemon_name:
                pokemonMap[
                  Number(
                    shiny.pokemon_id
                  )
                ] || "Unknown",
              owner:
                profile?.name ||
                "Unknown",
              date_found:
                shiny.date_found ||
                null,
              screenshot_url:
                shiny.screenshot_url ||
                null,
            };
          }
        ) || [];

      /*
       * Keep every shiny loaded.
       * This is important because when a
       * Pokémon is clicked, its Team Fate
       * tab should show every owner and
       * every uploaded screenshot.
       */
      setAllShinies(
        formattedShinies
      );

      const cutoff =
        getCutoff();

      const filteredShinies =
        formattedShinies.filter(
          (shiny) => {
            if (!cutoff) {
              return true;
            }

            if (!shiny.date_found) {
              return false;
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
            profileEntry?.[1]
              .avatar || null;

          if (
            !groups[shiny.owner]
          ) {
            groups[
              shiny.owner
            ] = {
              trainer:
                shiny.owner,
              count: 0,
              avatar,
              shinies: [],
            };
          }

          groups[
            shiny.owner
          ].count += 1;

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
          );

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

  const filterOptions: {
    value: FilterType;
    label: string;
  }[] = [
    {
      value: "week",
      label: "Week",
    },
    {
      value: "month",
      label: "Month",
    },
    {
      value: "3months",
      label: "3 Months",
    },
    {
      value: "6months",
      label: "6 Months",
    },
    {
      value: "1year",
      label: "1 Year",
    },
    {
      value: "2years",
      label: "2 Years",
    },
    {
      value: "all",
      label: "All Time",
    },
  ];

  const champion =
    leaderboard[0];

  const matchingShinies =
    useMemo(() => {
      if (!selectedPokemon) {
        return [];
      }

      return allShinies.filter(
        (shiny) =>
          shiny.pokemon_id ===
          selectedPokemon.pokemon_id
      );
    }, [
      allShinies,
      selectedPokemon,
    ]);

  const owners =
    useMemo(() => {
      return matchingShinies.reduce<
        Record<string, number>
      >(
        (
          totals,
          shiny
        ) => {
          totals[
            shiny.owner
          ] =
            (
              totals[
                shiny.owner
              ] || 0
            ) + 1;

          return totals;
        },
        {}
      );
    }, [
      matchingShinies,
    ]);

  const screenshots =
    useMemo(() => {
      const uniqueScreenshots =
        new Set(
          matchingShinies
            .map(
              (shiny) =>
                shiny.screenshot_url
            )
            .filter(
              (
                screenshot
              ): screenshot is string =>
                Boolean(
                  screenshot
                )
            )
        );

      return Array.from(
        uniqueScreenshots
      );
    }, [
      matchingShinies,
    ]);

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
          Top shiny hunters
          ranked by selected
          period.
        </p>
      </div>

      <div className="leaderboard-filters">
        {filterOptions.map(
          (option) => (
            <button
              key={
                option.value
              }
              type="button"
              onClick={() =>
                setFilter(
                  option.value
                )
              }
              className={`leader-filter ${
                filter ===
                option.value
                  ? "active"
                  : ""
              }`}
            >
              {option.label}
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
              src={
                champion.avatar
              }
              alt={
                champion.trainer
              }
              className="champion-avatar"
            />
          )}

          <div className="champion-name">
            {champion.trainer}
          </div>

          <div className="champion-count">
            {champion.count}{" "}
            Shinies
          </div>

          <div className="champion-period">
            {
              filter === "all"
                ? "All Time Champion"
                : `${
                    filterOptions.find(
                      (
                        option
                      ) =>
                        option.value ===
                        filter
                    )?.label ||
                    filter
                  } Champion`
            }
          </div>
        </div>
      )}

      <div className="leaderboard-list">
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
                    src={
                      entry.avatar
                    }
                    alt={
                      entry.trainer
                    }
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
                    <button
                      key={
                        shiny.id
                      }
                      type="button"
                      className="showcase-card"
                      onClick={() =>
                        setSelectedPokemon(
                          shiny
                        )
                      }
                      title={
                        shiny.pokemon_name
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
                    </button>
                  )
                )}
              </div>
            </div>
          )
        )}
      </div>

      {selectedPokemon && (
        <PokemonInfoModal
          pokemon={{
            id:
              selectedPokemon.pokemon_id,
            name:
              selectedPokemon.pokemon_name,
            caught: true,
            owners,
            screenshots,
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