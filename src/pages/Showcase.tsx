import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import PokemonInfoModal from "../components/PokemonInfoModal";

type Shiny = {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
  owner: string;
  screenshot_url: string | null;
};

function getGifName(name: string) {
  return name
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]/g, "");
}

export default function Showcase() {
  const [grouped, setGrouped] = useState<
    Record<string, Shiny[]>
  >({});

  const [selectedPokemon, setSelectedPokemon] =
    useState<Shiny | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [searchQuery, setSearchQuery] =
    useState("");

  useEffect(() => {
    loadShowcase();
  }, []);

  async function loadShowcase() {
    setLoading(true);

    try {
      const [
        profilesResponse,
        catchesResponse,
        pokemonResponse,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, nickname, username"
          ),

        supabase
          .from("shiny_catches")
          .select(`
            id,
            pokemon_id,
            profile_id,
            screenshot_url
          `),

        supabase
          .from("pokemon")
          .select(
            "id, name"
          ),
      ]);

      if (profilesResponse.error) {
        throw profilesResponse.error;
      }

      if (catchesResponse.error) {
        throw catchesResponse.error;
      }

      if (pokemonResponse.error) {
        throw pokemonResponse.error;
      }

      const profileMap: Record<
        string,
        string
      > = {};

      profilesResponse.data?.forEach(
        (profile) => {
          profileMap[
            profile.id
          ] =
            profile.nickname ||
            profile.username ||
            "Unknown";
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

      const groups: Record<
        string,
        Shiny[]
      > = {};

      catchesResponse.data?.forEach(
        (shiny) => {
          const owner =
            profileMap[
              shiny.profile_id
            ] || "Unknown";

          if (!groups[owner]) {
            groups[owner] = [];
          }

          groups[owner].push({
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
            owner,
            screenshot_url:
              shiny.screenshot_url ||
              null,
          });
        }
      );

      setGrouped(groups);
    } catch (error) {
      console.error(
        "Failed to load Showcase:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  const sortedMembers = useMemo(
    () =>
      Object.entries(grouped).sort(
        (a, b) =>
          b[1].length -
          a[1].length
      ),
    [grouped]
  );

  const normalizedSearch = searchQuery
    .trim()
    .toLowerCase();

  const filteredMembers = useMemo(() => {
    if (!normalizedSearch) {
      return sortedMembers;
    }

    return sortedMembers
      .map(([member, shinies]) => {
        const memberMatches = member
          .toLowerCase()
          .includes(normalizedSearch);

        if (memberMatches) {
          return [member, shinies] as [
            string,
            Shiny[]
          ];
        }

        const matchingPokemon = shinies.filter(
          (shiny) =>
            shiny.pokemon_name
              .toLowerCase()
              .includes(normalizedSearch)
        );

        return matchingPokemon.length > 0
          ? [member, matchingPokemon] as [
              string,
              Shiny[]
            ]
          : null;
      })
      .filter(
        (
          entry
        ): entry is [string, Shiny[]] =>
          entry !== null
      );
  }, [
    normalizedSearch,
    sortedMembers,
  ]);

  const allShinies = useMemo(
    () =>
      Object.values(grouped).flat(),
    [grouped]
  );

  const matchingShinies = useMemo(() => {
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

  const owners = useMemo(() => {
    return matchingShinies.reduce<
      Record<string, number>
    >(
      (totals, shiny) => {
        totals[shiny.owner] =
          (totals[shiny.owner] ||
            0) + 1;

        return totals;
      },
      {}
    );
  }, [matchingShinies]);

  const screenshots = useMemo(() => {
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
              Boolean(screenshot)
          )
      );

    return Array.from(
      uniqueScreenshots
    );
  }, [matchingShinies]);

  if (loading) {
    return (
      <div className="showcase-loading">
        Loading Showcase...
      </div>
    );
  }

  return (
    <div className="showcase-page">
      <div className="dex-header">
        <h1>
          ✨ Shiny Showcase
        </h1>

        <p>
          Every Team [Faté]
          member ranked by total
          shiny count.
        </p>
      </div>

      <div className="showcase-search">
        <div className="showcase-search-input">
          <span
            className="showcase-search-icon"
            aria-hidden="true"
          >
            🔎
          </span>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="Search member or Pokémon..."
            aria-label="Search member or Pokémon"
          />

          {searchQuery && (
            <button
              type="button"
              className="showcase-search-clear"
              onClick={() =>
                setSearchQuery("")
              }
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <p className="showcase-search-result">
          {normalizedSearch
            ? `${filteredMembers.length} ${
                filteredMembers.length === 1
                  ? "member"
                  : "members"
              } found`
            : "Search by member or Pokémon"}
        </p>
      </div>

      {filteredMembers.length > 0 ? (
        filteredMembers.map(
          ([member, shinies]) => (
            <div
              key={member}
              className="showcase-member"
            >
              <h2>
                {member} (
                {shinies.length})
              </h2>

              <div className="showcase-sprites">
                {shinies.map(
                  (shiny) => (
                    <button
                      key={shiny.id}
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
        )
      ) : (
        <div className="showcase-empty">
          <h2>No results found</h2>
          <p>
            Try searching for a member or Pokémon.
          </p>
        </div>
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