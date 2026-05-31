import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import DexCard from "../components/DexCard";

type DexPokemon = {
  id: number;
  name: string;
  region?: string;
  caught: boolean;

  owners: Record<string, number>;

  screenshots: string[];

  totalCopies: number;
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
  .select("id, username, nickname");

if (profileError) {
  throw profileError;
}

const profileMap: Record<string, string> = {};

profileData?.forEach((profile: any) => {
  profileMap[profile.id] =
    profile.nickname ||
    profile.username;
});

const ownershipMap: Record<
  number,
  Record<string, number>
> = {};

const screenshotMap: Record<
  number,
  string[]
> = {};

catchData?.forEach((entry: any) => {
  const pokemonId =
    Number(entry.pokemon_id);

  const trainer =
    profileMap[entry.profile_id];

  if (!trainer) return;

  if (!ownershipMap[pokemonId]) {
    ownershipMap[pokemonId] = {};
  }

  ownershipMap[pokemonId][trainer] =
    (ownershipMap[pokemonId][trainer] || 0)
    + 1;

  if (
    entry.screenshot_url
  ) {
    if (!screenshotMap[pokemonId]) {
      screenshotMap[pokemonId] = [];
    }

    screenshotMap[pokemonId].push(
      entry.screenshot_url
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
  ] || {},

screenshots:
  screenshotMap[
    Number(poke.id)
  ] || [],

totalCopies:
  Object.values(
    ownershipMap[
      Number(poke.id)
    ] || {}
  ).reduce(
    (a, b) => a + b,
    0
  ),
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
          :
 Object.keys(
  poke.owners
).some((owner) =>
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
    ⭐Montly Bounty Here ⭐
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

                  {Object.keys(selectedPokemon.owners).length > 0 ? (
Object.entries(
  selectedPokemon.owners
).map(
  ([name, count]) => (
    <div
      key={name}
      className="owner-row"
    >
      👤 {name} x{count}
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
                    {selectedPokemon.totalCopies}
                  </p>
                </div>

                <div className="detail-card">
                  <h3>Gallery</h3>

                  {selectedPokemon.screenshots.length > 0 ? (
  <div className="gallery-grid">
    {selectedPokemon.screenshots.map(
      (url, index) => (
        <img
          key={index}
          src={url}
          alt={`Screenshot ${index + 1}`}
          className="gallery-image"
        />
      )
    )}
  </div>
) : (
  <p>No screenshots uploaded yet.</p>
)}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}