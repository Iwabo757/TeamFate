import { useMemo, useState } from "react";
import monsters from "../data/monsters.json";

/* =========================================================
   TYPES
========================================================= */

type Season =
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter";

type Region =
  | "All"
  | "Kanto"
  | "Johto"
  | "Hoenn"
  | "Sinnoh"
  | "Unova";

type HordeLocation = {
  form?: number;
  type?: string;

  region_id?: number;
  region_name?: string;

  location_id?: number;
  location_name?: string;
  location_name_full?: string;

  min_level?: number;
  max_level?: number;

  season?: string;

  is_horde_3x?: boolean;
  is_horde_5x?: boolean;

  rarity_morning?: string;
  rarity_day?: string;
  rarity_night?: string;
};

type Monster = {
  id: number;
  name: string;
  locations?: HordeLocation[];
};

type HordeEncounter = {
  pokemonId: number;
  pokemonName: string;

  region: string;

  locationId: number;
  locationName: string;

  minLevel: number;
  maxLevel: number;

  season: string;

  type: string;

  horde3x: boolean;
  horde5x: boolean;

  morning: string;
  day: string;
  night: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const SEASONS: {
  name: Season;
  icon: string;
}[] = [
  {
    name: "Spring",
    icon: "🌸",
  },
  {
    name: "Summer",
    icon: "☀️",
  },
  {
    name: "Autumn",
    icon: "🍂",
  },
  {
    name: "Winter",
    icon: "❄️",
  },
];

const REGIONS: Region[] = [
  "All",
  "Kanto",
  "Johto",
  "Hoenn",
  "Sinnoh",
  "Unova",
];

/* =========================================================
   REGION NORMALIZER
========================================================= */

function normalizeRegion(
  location: HordeLocation
): string {
  const raw = (
    location.region_name ?? ""
  )
    .trim()
    .toLowerCase();

  /*
   * Already using the correct names.
   */
  if (raw.includes("kanto")) {
    return "Kanto";
  }

  if (raw.includes("johto")) {
    return "Johto";
  }

  if (raw.includes("hoenn")) {
    return "Hoenn";
  }

  if (raw.includes("sinnoh")) {
    return "Sinnoh";
  }

  if (raw.includes("unova")) {
    return "Unova";
  }

  /*
   * Handle game/version names if
   * they exist in the dataset.
   */

  if (
    [
      "red",
      "blue",
      "yellow",
      "fire red",
      "leaf green",
      "firered",
      "leafgreen",
    ].includes(raw)
  ) {
    return "Kanto";
  }

  if (
    [
      "gold",
      "silver",
      "crystal",
      "heartgold",
      "soulsilver",
      "heartgold",
      "soul silver",
    ].includes(raw)
  ) {
    return "Johto";
  }

  if (
    [
      "ruby",
      "sapphire",
      "emerald",
      "omega ruby",
      "alpha sapphire",
      "omegaruby",
      "alphasapphire",
    ].includes(raw)
  ) {
    return "Hoenn";
  }

  if (
    [
      "diamond",
      "pearl",
      "platinum",
      "brilliant diamond",
      "shining pearl",
    ].includes(raw)
  ) {
    return "Sinnoh";
  }

  if (
    [
      "black",
      "white",
      "black 2",
      "white 2",
      "black2",
      "white2",
    ].includes(raw)
  ) {
    return "Unova";
  }

  /*
   * If the dataset has region_id but
   * region_name is missing.
   *
   * PokeMMO Gen 1-5 ordering.
   */
  switch (location.region_id) {
    case 1:
      return "Kanto";

    case 2:
      return "Johto";

    case 3:
      return "Hoenn";

    case 4:
      return "Sinnoh";

    case 5:
      return "Unova";

    default:
      return (
        location.region_name ||
        "Unknown"
      );
  }
}

/* =========================================================
   SEASON NORMALIZER
========================================================= */

function normalizeSeason(
  value?: string
): string {
  if (!value) {
    return "Any";
  }

  const normalized =
    value.trim().toLowerCase();

  if (normalized === "spring") {
    return "Spring";
  }

  if (normalized === "summer") {
    return "Summer";
  }

  if (
    normalized === "autumn" ||
    normalized === "fall"
  ) {
    return "Autumn";
  }

  if (normalized === "winter") {
    return "Winter";
  }

  if (
    normalized === "any" ||
    normalized === "all"
  ) {
    return "Any";
  }

  return value;
}

/* =========================================================
   PERCENTAGE CONVERSION
========================================================= */

function getHordePercentage(
  value: string
): number | null {
  if (
    !value ||
    value === "--" ||
    value === "-"
  ) {
    return null;
  }

  const number =
    parseFloat(value);

  if (Number.isNaN(number)) {
    return null;
  }

  switch (number) {
    case 5:
      return 100;

    case 3:
      return 60;

    case 2.5:
      return 50;

    case 2:
      return 40;

    case 1:
      return 20;

    default:
      return null;
  }
}

/* =========================================================
   PERCENTAGE DISPLAY
========================================================= */

function ChanceDisplay({
  value,
}: {
  value: string;
}) {
  const converted =
    getHordePercentage(value);

  if (
    !value ||
    value === "--" ||
    value === "-"
  ) {
    return (
      <span className="horde-time-empty">
        —
      </span>
    );
  }

  return (
    <div className="horde-time-chance">
      <strong>
        {value}
      </strong>

      {converted !== null && (
        <small>
          ({converted}%)
        </small>
      )}
    </div>
  );
}

/* =========================================================
   HORDE SIZE
========================================================= */

function getHordeSize(
  horde: HordeEncounter
): string {
  if (horde.horde5x) {
    return "5×";
  }

  if (horde.horde3x) {
    return "3×";
  }

  return "—";
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function HordeHunter() {
  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState<Season>("Spring");

  const [
    selectedRegion,
    setSelectedRegion,
  ] = useState<Region>("All");

  const [
    search,
    setSearch,
  ] = useState("");

  /*
   * Routes are intentionally empty
   * at first, meaning every route
   * starts collapsed.
   */
  const [
    expandedRoutes,
    setExpandedRoutes,
  ] = useState<Set<string>>(
    new Set()
  );

  /* =======================================================
     BUILD HORDE DATA
  ======================================================= */

  const hordeLocations =
    useMemo<HordeEncounter[]>(() => {
      const results: HordeEncounter[] =
        [];

      const data =
        monsters as Monster[];

      data.forEach(
        (pokemon) => {
          if (
            !pokemon.locations ||
            pokemon.locations.length === 0
          ) {
            return;
          }

          pokemon.locations.forEach(
            (location) => {
              /*
               * Only actual hordes.
               */
              if (
                !location.is_horde_3x &&
                !location.is_horde_5x
              ) {
                return;
              }

              const season =
                normalizeSeason(
                  location.season
                );

              /*
               * "Any" appears during
               * every season.
               */
              if (
                season !== "Any" &&
                season !==
                  selectedSeason
              ) {
                return;
              }

              const region =
                normalizeRegion(
                  location
                );

              const locationName =
                location.location_name_full ||
                location.location_name ||
                "Unknown Location";

              results.push({
                pokemonId:
                  pokemon.id,

                pokemonName:
                  pokemon.name,

                region,

                locationId:
                  location.location_id ??
                  0,

                locationName,

                minLevel:
                  location.min_level ??
                  0,

                maxLevel:
                  location.max_level ??
                  0,

                season,

                type:
                  location.type ||
                  "Horde",

                horde3x:
                  Boolean(
                    location.is_horde_3x
                  ),

                horde5x:
                  Boolean(
                    location.is_horde_5x
                  ),

                morning:
                  location.rarity_morning ||
                  "--",

                day:
                  location.rarity_day ||
                  "--",

                night:
                  location.rarity_night ||
                  "--",
              });
            }
          );
        }
      );

      return results;
    }, [selectedSeason]);

  /* =======================================================
     SEARCH + REGION FILTER
  ======================================================= */

  const filteredHordes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return hordeLocations.filter(
        (horde) => {
          const matchesRegion =
            selectedRegion ===
              "All" ||
            horde.region ===
              selectedRegion;

          const matchesSearch =
            !query ||
            horde.pokemonName
              .toLowerCase()
              .includes(query) ||
            horde.locationName
              .toLowerCase()
              .includes(query) ||
            horde.region
              .toLowerCase()
              .includes(query);

          return (
            matchesRegion &&
            matchesSearch
          );
        }
      );
    }, [
      hordeLocations,
      search,
      selectedRegion,
    ]);

  /* =======================================================
     GROUP
     
     REGION
       └── ROUTE
             └── POKEMON
  ======================================================= */

  const groupedHordes =
    useMemo(() => {
      const grouped: Record<
        string,
        Record<
          string,
          HordeEncounter[]
        >
      > = {};

      filteredHordes.forEach(
        (horde) => {
          if (!grouped[horde.region]) {
            grouped[horde.region] =
              {};
          }

          if (
            !grouped[horde.region][
              horde.locationName
            ]
          ) {
            grouped[horde.region][
              horde.locationName
            ] = [];
          }

          grouped[horde.region][
            horde.locationName
          ].push(horde);
        }
      );

      /*
       * Alphabetize Pokémon
       * inside routes.
       */
      Object.values(grouped).forEach(
        (routes) => {
          Object.values(routes).forEach(
            (pokemon) => {
              pokemon.sort((a, b) =>
                a.pokemonName.localeCompare(
                  b.pokemonName
                )
              );
            }
          );
        }
      );

      return grouped;
    }, [filteredHordes]);

  /* =======================================================
     REGION ORDER
  ======================================================= */

  const regionOrder = [
    "Kanto",
    "Johto",
    "Hoenn",
    "Sinnoh",
    "Unova",
  ];

  const sortedRegions =
    Object.keys(
      groupedHordes
    ).sort((a, b) => {
      const aIndex =
        regionOrder.indexOf(a);

      const bIndex =
        regionOrder.indexOf(b);

      if (
        aIndex === -1 &&
        bIndex === -1
      ) {
        return a.localeCompare(b);
      }

      if (aIndex === -1) {
        return 1;
      }

      if (bIndex === -1) {
        return -1;
      }

      return aIndex - bIndex;
    });

  /* =======================================================
     TOGGLE ROUTE
  ======================================================= */

  function toggleRoute(
    routeKey: string
  ) {
    setExpandedRoutes(
      (previous) => {
        const next =
          new Set(previous);

        if (
          next.has(routeKey)
        ) {
          next.delete(routeKey);
        } else {
          next.add(routeKey);
        }

        return next;
      }
    );
  }

  /* =======================================================
     CLEAR SEARCH
  ======================================================= */

  function clearSearch() {
    setSearch("");
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="horde-hunter-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="horde-hunter-header">

        <div>
          <h1>
            Horde Hunter
          </h1>

          <p>
            Find every horde
            encounter by region,
            route, Pokémon, and
            season.
          </p>
        </div>

      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="horde-hunter-search">

        <span className="horde-search-icon">
          🔍
        </span>

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search Pokémon, route, or region..."
        />

        {search && (
          <button
            type="button"
            className="horde-search-clear"
            onClick={
              clearSearch
            }
            aria-label="Clear search"
          >
            ×
          </button>
        )}

      </div>

      {/* =================================================
          REGION FILTER
      ================================================= */}

      <div className="horde-region-filter">

        {REGIONS.map(
          (region) => (
            <button
              key={region}
              type="button"
              className={
                selectedRegion ===
                region
                  ? "horde-region-filter-button active"
                  : "horde-region-filter-button"
              }
              onClick={() => {
                setSelectedRegion(
                  region
                );

                /*
                 * When switching region,
                 * start with routes collapsed.
                 */
                setExpandedRoutes(
                  new Set()
                );
              }}
            >
              {region === "All"
                ? "All Regions"
                : region}
            </button>
          )
        )}

      </div>

      {/* =================================================
          SEASON TABS
      ================================================= */}

      <div className="horde-season-tabs">

        {SEASONS.map(
          (season) => (
            <button
              key={season.name}
              type="button"
              className={
                selectedSeason ===
                season.name
                  ? "horde-season-tab active"
                  : "horde-season-tab"
              }
              onClick={() => {
                setSelectedSeason(
                  season.name
                );

                /*
                 * Keep all routes collapsed
                 * when changing seasons.
                 */
                setExpandedRoutes(
                  new Set()
                );
              }}
            >

              <span className="horde-season-icon">
                {season.icon}
              </span>

              <span>
                {season.name}
              </span>

            </button>
          )
        )}

      </div>

      {/* =================================================
          RESULTS HEADER
      ================================================= */}

      <div className="horde-results-header">

        <div>

          <h2>
            {
              SEASONS.find(
                (season) =>
                  season.name ===
                  selectedSeason
              )?.icon
            }{" "}
            {selectedSeason} Hordes
          </h2>

          <span>
            {filteredHordes.length}{" "}
            encounters
          </span>

        </div>

        {selectedRegion !==
          "All" && (
          <div className="horde-active-region">
            Region:
            <strong>
              {" "}
              {selectedRegion}
            </strong>
          </div>
        )}

      </div>

      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {sortedRegions.length ===
        0 && (
        <div className="horde-empty">

          <div className="horde-empty-icon">
            🔍
          </div>

          <h3>
            No hordes found
          </h3>

          <p>
            Try another Pokémon,
            route, region, or
            season.
          </p>

        </div>
      )}

      {/* =================================================
          REGIONS
      ================================================= */}

      <div className="horde-region-list">

        {sortedRegions.map(
          (region) => {
            const routes =
              groupedHordes[
                region
              ];

            const sortedRoutes =
              Object.keys(
                routes
              ).sort((a, b) =>
                a.localeCompare(b)
              );

            return (
              <section
                key={region}
                className="horde-region-section"
              >

                {/* =======================================
                    REGION HEADER
                ======================================= */}

                <div className="horde-region-header">

                  <div className="horde-region-line" />

                  <h2>
                    {region}
                  </h2>

                  <div className="horde-region-line" />

                </div>

                {/* =======================================
                    ROUTES
                ======================================= */}

                <div className="horde-routes">

                  {sortedRoutes.map(
                    (route) => {
                      const pokemon =
                        routes[
                          route
                        ];

                      const routeKey =
                        `${region}-${route}`;

                      const isExpanded =
                        expandedRoutes.has(
                          routeKey
                        );

                      return (
                        <div
                          key={routeKey}
                          className="horde-route"
                        >

                          {/* =========================
                              ROUTE HEADER
                          ========================= */}

                          <button
                            type="button"
                            className="horde-route-header"
                            onClick={() =>
                              toggleRoute(
                                routeKey
                              )
                            }
                          >

                            <div className="horde-route-title">

                              <span className="horde-route-arrow">
                                {isExpanded
                                  ? "▼"
                                  : "▶"}
                              </span>

                              <h3>
                                {route}
                              </h3>

                            </div>

                            <span className="horde-route-count">
                              {
                                pokemon.length
                              }{" "}
                              {pokemon.length ===
                              1
                                ? "Horde"
                                : "Hordes"}
                            </span>

                          </button>

                          {/* =========================
                              POKÉMON CONTENT
                          ========================= */}

                          {isExpanded && (
                            <div className="horde-route-content">

                              {/* =====================
                                  COLUMN HEADERS
                              ===================== */}

                              <div className="horde-column-header">

                                <span>
                                  Pokémon
                                </span>

                                <span>
                                  Levels
                                </span>

                                <span>
                                  Morning
                                </span>

                                <span>
                                  Day
                                </span>

                                <span>
                                  Night
                                </span>

                                <span>
                                  Horde Size
                                </span>

                              </div>

                              {/* =====================
                                  POKÉMON GRID
                              ===================== */}

                              <div className="horde-pokemon-list">

                                {pokemon.map(
                                  (
                                    horde,
                                    index
                                  ) => {

                                    const hordeSize =
                                      getHordeSize(
                                        horde
                                      );

                                    return (
                                      <div
                                        key={`${horde.pokemonId}-${horde.locationId}-${index}`}
                                        className="horde-pokemon-card"
                                      >

                                        {/* POKÉMON */}

                                        <div className="horde-pokemon-info">

                                          <div className="horde-pokemon-sprite">

                                            <img
                                              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${horde.pokemonId}.png`}
                                              alt={
                                                horde.pokemonName
                                              }
                                              loading="lazy"
                                            />

                                          </div>

                                          <div className="horde-pokemon-name">

                                            <strong>
                                              {
                                                horde.pokemonName
                                              }
                                            </strong>

                                            {horde.type && (
                                              <small>
                                                {
                                                  horde.type
                                                }
                                              </small>
                                            )}

                                          </div>

                                        </div>

                                        {/* LEVELS */}

                                        <div className="horde-levels">

                                          {horde.minLevel ===
                                          horde.maxLevel
                                            ? horde.minLevel
                                            : `${horde.minLevel}–${horde.maxLevel}`}

                                        </div>

                                        {/* MORNING */}

                                        <div className="horde-time">

                                          <ChanceDisplay
                                            value={
                                              horde.morning
                                            }
                                          />

                                        </div>

                                        {/* DAY */}

                                        <div className="horde-time">

                                          <ChanceDisplay
                                            value={
                                              horde.day
                                            }
                                          />

                                        </div>

                                        {/* NIGHT */}

                                        <div className="horde-time">

                                          <ChanceDisplay
                                            value={
                                              horde.night
                                            }
                                          />

                                        </div>

                                        {/* HORDE SIZE */}

                                        <div className="horde-size-container">

                                          <span
                                            className={
                                              hordeSize ===
                                              "5×"
                                                ? "horde-size five"
                                                : "horde-size three"
                                            }
                                          >
                                            {
                                              hordeSize
                                            }
                                          </span>

                                        </div>

                                      </div>
                                    );
                                  }
                                )}

                              </div>

                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>

              </section>
            );
          }
        )}

      </div>

    </div>
  );
}