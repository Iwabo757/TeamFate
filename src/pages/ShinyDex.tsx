import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import DexCard from "../components/DexCard";

type DexPokemon = {
  id: number;
  name: string;
  region?: string;
  caught: boolean;
  owners: string[];
};

export default function ShinyDex() {
  const [pokemon, setPokemon] = useState<DexPokemon[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [searchMode, setSearchMode] = useState<
    "pokemon" | "trainer"
  >("pokemon");

  const [filter, setFilter] = useState<
    "all" | "caught" | "missing"
  >("all");

  const [selectedPokemon, setSelectedPokemon] =
    useState<DexPokemon | null>(null);

  useEffect(() => {
    loadDex();
  }, []);

  async function loadDex() {
    try {
      const {
        data: pokemonData,
        error: pokemonError,
      } = await supabase
        .from("pokemon")
        .select("*")
        .order("id");

      if (pokemonError) throw pokemonError;

      const {
        data: catchData,
        error: catchError,
      } = await supabase
        .from("shiny_catches")
        .select("*");

      if (catchError) throw catchError;

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, username");

      if (profileError) throw profileError;

      const profileMap: Record<
        string,
        string
      > = {};

      profileData?.forEach((profile: any) => {
        profileMap[profile.id] =
          profile.username;
      });

      const ownershipMap: Record<
        number,
        string[]
      > = {};

      catchData?.forEach((entry: any) => {
        const pokemonId = Number(
          entry.pokemon_id
        );

        const username =
          profileMap[entry.profile_id];

        if (!ownershipMap[pokemonId]) {
          ownershipMap[pokemonId] = [];
        }

        if (username) {
          ownershipMap[pokemonId].push(
            username
          );

        }
      });

      const caughtIds = new Set(
        catchData?.map((c: any) =>
          Number(c.pokemon_id)
        ) || []
      );

      const dexData: DexPokemon[] =
        (pokemonData || []).map(
          (poke: any) => ({
            id: Number(poke.id),
            name: poke.name,
            region: poke.region,
            caught: caughtIds.has(
              Number(poke.id)
            ),
            owners:
              ownershipMap[
                Number(poke.id)
              ] || [],
          })
        );

      setPokemon(dexData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredPokemon =
    pokemon.filter((poke) => {
      const searchText =
        search.toLowerCase();

      const matchesSearch =
        searchMode === "pokemon"
          ? poke.name
              .toLowerCase()
              .includes(searchText)
          : poke.owners.some((owner) =>
              owner
                .toLowerCase()
                .includes(searchText)
            );

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "caught"
          ? poke.caught
          : !poke.caught;

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  const capturedCount =
    pokemon.filter(
      (p) => p.caught
    ).length;

  const completionPercent =
    pokemon.length
      ? (
          (capturedCount /
            pokemon.length) *
          100
        ).toFixed(1)
      : "0";

  const regions = [
    "Kanto",
    "Johto",
    "Hoenn",
    "Sinnoh",
    "Unova",
  ];

  if (loading) {
    return <h2>Loading Dex...</h2>;
  }

  return (
    <div className="dex-page">

<div className="dex-header">
  <h1>📖 Team Shiny Dex</h1>

  <div className="fate-banner">
    ⭐ One Wish. One Fate ⭐
  </div>

  <p>
    Completion:
    {" "}
    {capturedCount}
    {" / "}
    {pokemon.length}
    {" "}
    ({completionPercent}%)
  </p>
</div>

      <div className="region-grid">
        {regions.map((region) => {
          const regionMons =
            pokemon.filter(
              (p) =>
                p.region === region
            );

          const regionCaught =
            regionMons.filter(
              (p) => p.caught
            ).length;

          return (
            <div
              key={region}
              className="region-card"
            >
              <h3>{region}</h3>

              <p>
                {regionCaught}
                {" / "}
                {regionMons.length}
              </p>
            </div>
          );
        })}
      </div>

      <div className="dex-controls">

        <select
          value={searchMode}
          onChange={(e) =>
            setSearchMode(
              e.target.value as
                | "pokemon"
                | "trainer"
            )
          }
        >
          <option value="pokemon">
            Pokémon
          </option>

          <option value="trainer">
            Trainer
          </option>
        </select>

        <input
          type="text"
          placeholder={
            searchMode === "pokemon"
              ? "Search Pokémon..."
              : "Search Trainer..."
          }
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={filter}
          onChange={(e) =>
            setFilter(
              e.target.value as
                | "all"
                | "caught"
                | "missing"
            )
          }
        >
          <option value="all">All</option>
          <option value="caught">Caught</option>
          <option value="missing">Missing</option>
        </select>

      </div>

      <div className="dex-grid">
        {filteredPokemon.map(
          (poke) => (
            <DexCard
              key={poke.id}
              id={poke.id}
              name={poke.name}
              caught={poke.caught}
              owners={poke.owners}
              onClick={() =>
                setSelectedPokemon(
                  poke
                )
              }
            />
          )
        )}
      </div>

      {selectedPokemon && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedPokemon(null)
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
                setSelectedPokemon(null)
              }
            >
              ×
            </button>

            <div className="modal-header">
              <h2>
                #{selectedPokemon.id}
                {" "}
                {selectedPokemon.name}
              </h2>

              <span className="status-badge">
                {selectedPokemon.caught
                  ? "Captured"
                  : "Missing"}
              </span>
            </div>

            <div className="modal-body">

              <div className="modal-left">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${selectedPokemon.id}.png`}
                  alt={
                    selectedPokemon.name
                  }
                  className="modal-sprite"
                />
              </div>

              <div className="modal-right">

                <div className="detail-card">
                  <h3>Pokédex Info</h3>

                  <p>
                    National Dex #
                    {selectedPokemon.id}
                  </p>

                  <p>
                    Region:
                    {" "}
                    {
                      selectedPokemon.region
                    }
                  </p>
                </div>

                <div className="detail-card">
                  <h3>Owners</h3>

                  {selectedPokemon.owners
                    .length > 0 ? (
                    selectedPokemon.owners.map(
                      (owner) => (
                        <div
                          key={owner}
                          className="owner-row"
                        >
                          👤 {owner}
                        </div>
                      )
                    )
                  ) : (
                    <p>
                      No owners yet
                    </p>
                  )}
                </div>

                <div className="detail-card">
                  <h3>Collection Stats</h3>

                  <p>
                    Copies:
                    {" "}
                    {
                      selectedPokemon
                        .owners.length
                    }
                  </p>
                </div>

                <div className="detail-card">
                  <h3>Gallery</h3>

                  <p>
                    No screenshots
                    uploaded yet.
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