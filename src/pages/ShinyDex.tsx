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

  const [selectedRegion, setSelectedRegion] =
    useState("National");

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

const filteredPokemon = pokemon.filter(
  (poke) => {
    const searchText =
      search.toLowerCase();

    const matchesSearch =
      searchMode === "pokemon"
        ? poke.name
            .toLowerCase()
            .includes(searchText)
        : Object.keys(
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

    const matchesRegion =
      selectedRegion ===
      "National"
        ? true
        : selectedRegion ===
          "Kanto"
        ? poke.id >= 1 &&
          poke.id <= 151
        : selectedRegion ===
          "Johto"
        ? poke.id >= 152 &&
          poke.id <= 251
        : selectedRegion ===
          "Hoenn"
        ? poke.id >= 252 &&
          poke.id <= 386
        : selectedRegion ===
          "Sinnoh"
        ? poke.id >= 387 &&
          poke.id <= 493
        : poke.id >= 494 &&
          poke.id <= 649;

const regionStats = {
  National: {
    caught: pokemon.filter((p) => p.caught).length,
    total: 649,
  },

  Kanto: {
    caught: pokemon.filter(
      (p) => p.caught && p.id >= 1 && p.id <= 151
    ).length,
    total: 151,
  },

  Johto: {
    caught: pokemon.filter(
      (p) => p.caught && p.id >= 152 && p.id <= 251
    ).length,
    total: 100,
  },

  Hoenn: {
    caught: pokemon.filter(
      (p) => p.caught && p.id >= 252 && p.id <= 386
    ).length,
    total: 135,
  },

  Sinnoh: {
    caught: pokemon.filter(
      (p) => p.caught && p.id >= 387 && p.id <= 493
    ).length,
    total: 107,
  },

  Unova: {
    caught: pokemon.filter(
      (p) => p.caught && p.id >= 494 && p.id <= 649
    ).length,
    total: 156,
  },
};
    return (
      matchesSearch &&
      matchesFilter &&
      matchesRegion
    );
  }
);

const regionPokemon =
  selectedRegion === "National"
    ? pokemon
    : pokemon.filter((p) => {
        if (
          selectedRegion === "Kanto"
        )
          return (
            p.id >= 1 &&
            p.id <= 151
          );

        if (
          selectedRegion === "Johto"
        )
          return (
            p.id >= 152 &&
            p.id <= 251
          );

        if (
          selectedRegion === "Hoenn"
        )
          return (
            p.id >= 252 &&
            p.id <= 386
          );

        if (
          selectedRegion === "Sinnoh"
        )
          return (
            p.id >= 387 &&
            p.id <= 493
          );

        if (
          selectedRegion === "Unova"
        )
          return (
            p.id >= 494 &&
            p.id <= 649
          );

        return true;
      });

const capturedCount =
  regionPokemon.filter(
    (p) => p.caught
  ).length;

const totalCount =
  regionPokemon.length;

const completionPercent =
  totalCount
    ? (
        (capturedCount /
          totalCount) *
        100
      ).toFixed(1)
    : "0";


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
  {selectedRegion} Completion:
  {" "}
  {capturedCount}
  {" / "}
  {totalCount}
  {" "}
  ({completionPercent}%)
</p>
</div>

<div className="region-grid">
  {Object.entries(regionStats).map(
    ([region, stats]) => (
      <div
        key={region}
        className={`region-card ${
          selectedRegion === region
            ? "active-region"
            : ""
        }`}
        onClick={() =>
          setSelectedRegion(region)
        }
      >
        <h3>{region}</h3>

        <span className="region-count">
          {stats.caught} / {stats.total}
        </span>
      </div>
    )
  )}
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
  onClick={() => window.open(url, "_blank")}
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