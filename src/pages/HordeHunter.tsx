import { useMemo, useState } from "react";
import monsters from "../data/monsters.json";

type Season =
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter";

type Region =
  | "All Regions"
  | "Kanto"
  | "Johto"
  | "Hoenn"
  | "Sinnoh"
  | "Unova";

type MonsterLocation = {
  form: number;
  type: string;

  region_id: number;
  region_name: string;

  location_id: number;
  location_name: string;
  location_name_full: string;

  min_level: number;
  max_level: number;

  season: Season | "Any";

  is_horde_3x: boolean;
  is_horde_5x: boolean;

  rarity_flags: number;

  rarity_morning: string;
  rarity_day: string;
  rarity_night: string;
};

type Monster = {
  id: number;
  name: string;
  locations?: MonsterLocation[];
};

type HordeEntry = {
  pokemonId: number;
  pokemonName: string;

  locationId: number;
  locationName: string;
  locationFullName: string;

  region: string;

  minLevel: number;
  maxLevel: number;

  method: string;

  hordeSize: number;
  hordeChance: string;
  convertedChance: number | null;

  morning: string;
  day: string;
  night: string;
};

type RouteGroup = {
  region: string;
  locationName: string;
  entries: HordeEntry[];
};

const SEASONS: Season[] = [
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
];

const REGIONS: Region[] = [
  "All Regions",
  "Kanto",
  "Johto",
  "Hoenn",
  "Sinnoh",
  "Unova",
];

/*
 * Horde encounter conversion
 *
 * 5%   = 100%
 * 3%   = 60%
 * 2.5% = 50%
 * 2%   = 40%
 * 1%   = 20%
 */
const HORDE_CONVERSION: Record<string, number> = {
  "5%": 100,
  "3%": 60,
  "2.5%": 50,
  "2%": 40,
  "1%": 20,
};

const SEASON_ICONS: Record<Season, string> = {
  Spring: "🌸",
  Summer: "☀️",
  Autumn: "🍂",
  Winter: "❄️",
};

const REGION_ICONS: Record<string, string> = {
  Kanto: "🔴",
  Johto: "🟡",
  Hoenn: "🟢",
  Sinnoh: "🔵",
  Unova: "⚫",
};

/* =========================================================
   HELPERS
========================================================= */

function getHordeSize(
  location: MonsterLocation
): number {
  if (location.is_horde_5x) {
    return 5;
  }

  if (location.is_horde_3x) {
    return 3;
  }

  return 0;
}

function getNumericChance(
  value: string
): number | null {
  if (!value || value === "--") {
    return null;
  }

  const match = value.match(/[\d.]+/);

  if (!match) {
    return null;
  }

  const number = Number(match[0]);

  return Number.isFinite(number)
    ? number
    : null;
}

function getHordeChance(
  location: MonsterLocation
): string {
  const chances = [
    location.rarity_morning,
    location.rarity_day,
    location.rarity_night,
  ]
    .map(getNumericChance)
    .filter(
      (value): value is number =>
        value !== null
    );

  if (chances.length === 0) {
    return "--";
  }

  return `${Math.max(...chances)}%`;
}

function getConvertedChance(
  chance: string
): number | null {
  return HORDE_CONVERSION[chance] ?? null;
}

function getLevelText(
  entry: HordeEntry
): string {
  if (
    entry.minLevel ===
    entry.maxLevel
  ) {
    return `${entry.minLevel}`;
  }

  return `${entry.minLevel}–${entry.maxLevel}`;
}

function getSprite(
  id: number
): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function getShinySprite(
  id: number
): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
}

function normalize(
  value: string
): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/*
 * Routes are grouped by:
 *
 * REGION + DISPLAYED LOCATION
 *
 * NOT location_id.
 *
 * This prevents duplicate route cards when
 * monsters.json contains multiple records
 * for the same displayed location.
 */
function getRouteKey(
  region: string,
  locationName: string
): string {
  return `${normalize(region)}::${normalize(
    locationName
  )}`;
}

/*
 * Prevent duplicate Pokémon records
 * inside the same route.
 */
function getPokemonKey(
  entry: HordeEntry
): string {
  return [
    entry.pokemonId,
    normalize(entry.pokemonName),
    entry.hordeSize,
    entry.hordeChance,
    entry.minLevel,
    entry.maxLevel,
  ].join("::");
}

/* =========================================================
   PAGE
========================================================= */

export default function HordeHunter() {
  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState<Season>("Spring");

  const [
    selectedRegion,
    setSelectedRegion,
  ] = useState<Region>(
    "All Regions"
  );

  const [
    seasonExclusiveOnly,
    setSeasonExclusiveOnly,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  /*
   * Routes start collapsed.
   */
  const [
    openRoutes,
    setOpenRoutes,
  ] = useState<
    Record<string, boolean>
  >({});

  /* =======================================================
     BUILD HORDE DATA
  ======================================================= */

  const hordeEntries =
    useMemo<HordeEntry[]>(() => {
      const output: HordeEntry[] = [];

      /*
       * =====================================================
       * FIRST PASS
       *
       * Find EVERY season in which each Pokémon has
       * a Horde encounter.
       *
       * This is intentionally done against the ENTIRE
       * monsters.json dataset before filters are applied.
       * =====================================================
       */

      const pokemonHordeSeasons =
        new Map<
          number,
          Set<Season | "Any">
        >();

      (
        monsters as Monster[]
      ).forEach((pokemon) => {
        if (!pokemon.locations) {
          return;
        }

        pokemon.locations.forEach(
          (location) => {
            const hordeSize =
              getHordeSize(location);

            if (hordeSize === 0) {
              return;
            }

            if (
              !pokemonHordeSeasons.has(
                pokemon.id
              )
            ) {
              pokemonHordeSeasons.set(
                pokemon.id,
                new Set()
              );
            }

            const seasons =
              pokemonHordeSeasons.get(
                pokemon.id
              )!;

            if (
              location.season ===
              "Any"
            ) {
              seasons.add("Any");
            } else {
              seasons.add(
                location.season
              );
            }
          }
        );
      });

      /*
       * =====================================================
       * SECOND PASS
       *
       * Build the actual displayed Horde entries.
       * =====================================================
       */

      (
        monsters as Monster[]
      ).forEach((pokemon) => {
        if (!pokemon.locations) {
          return;
        }

        const seasons =
          pokemonHordeSeasons.get(
            pokemon.id
          );

        if (!seasons) {
          return;
        }

        /*
         * ===================================================
         * TRUE SEASON EXCLUSIVITY
         *
         * A Pokémon is exclusive to the selected season
         * ONLY when:
         *
         * 1. It has a Horde in the selected season.
         * 2. It has NO "Any" Horde.
         * 3. It has NO Horde in any other season.
         *
         * Examples:
         *
         * Spring only:
         *   ["Spring"]          -> TRUE
         *
         * Spring + Summer:
         *   ["Spring","Summer"] -> FALSE
         *
         * Any:
         *   ["Any"]             -> FALSE
         *
         * Spring + Any:
         *   ["Spring","Any"]    -> FALSE
         * ===================================================
         */

        const isSeasonExclusive =
          !seasons.has("Any") &&
          seasons.size === 1 &&
          seasons.has(
            selectedSeason
          );

        pokemon.locations.forEach(
          (location) => {
            /*
             * Only Horde encounters.
             */
            const hordeSize =
              getHordeSize(location);

            if (hordeSize === 0) {
              return;
            }

            /*
             * =================================================
             * EXCLUSIVE MODE
             *
             * Only show the actual selected-season records
             * for Pokémon that occur ONLY in this season.
             * =================================================
             */

            if (seasonExclusiveOnly) {
              if (!isSeasonExclusive) {
                return;
              }

              if (
                location.season !==
                selectedSeason
              ) {
                return;
              }
            }

            /*
             * =================================================
             * NORMAL MODE
             *
             * Show:
             *
             * selected season
             * +
             * Any
             * =================================================
             */

            if (!seasonExclusiveOnly) {
              if (
                location.season !==
                  "Any" &&
                location.season !==
                  selectedSeason
              ) {
                return;
              }
            }

            /*
             * Region filter.
             */
            if (
              selectedRegion !==
                "All Regions" &&
              location.region_name !==
                selectedRegion
            ) {
              return;
            }

            const hordeChance =
              getHordeChance(
                location
              );

            const locationName =
              location.location_name ||
              location.location_name_full ||
              "Unknown Location";

            const locationFullName =
              location.location_name_full ||
              location.location_name ||
              "Unknown Location";

            output.push({
              pokemonId:
                pokemon.id,

              pokemonName:
                pokemon.name,

              locationId:
                location.location_id,

              locationName,

              locationFullName,

              region:
                location.region_name ||
                "Unknown",

              minLevel:
                location.min_level,

              maxLevel:
                location.max_level,

              method:
                location.type ||
                "Unknown",

              hordeSize,

              hordeChance,

              convertedChance:
                getConvertedChance(
                  hordeChance
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
      });

      return output;
    }, [
      selectedSeason,
      selectedRegion,
      seasonExclusiveOnly,
    ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredEntries =
    useMemo(() => {
      const query =
        normalize(search);

      if (!query) {
        return hordeEntries;
      }

      return hordeEntries.filter(
        (entry) =>
          normalize(
            entry.pokemonName
          ).includes(query) ||
          normalize(
            entry.locationName
          ).includes(query) ||
          normalize(
            entry.locationFullName
          ).includes(query) ||
          normalize(
            entry.region
          ).includes(query)
      );
    }, [
      hordeEntries,
      search,
    ]);

  /* =======================================================
     GROUP ROUTES
  ======================================================= */

  const groupedRoutes =
    useMemo<RouteGroup[]>(() => {
      const groups =
        new Map<
          string,
          RouteGroup
        >();

      filteredEntries.forEach(
        (entry) => {
          const routeName =
            entry.locationFullName ||
            entry.locationName ||
            "Unknown Location";

          const routeKey =
            getRouteKey(
              entry.region,
              routeName
            );

          if (!groups.has(routeKey)) {
            groups.set(
              routeKey,
              {
                region:
                  entry.region,

                locationName:
                  routeName,

                entries: [],
              }
            );
          }

          const route =
            groups.get(routeKey)!;

          const duplicate =
            route.entries.some(
              (existing) =>
                getPokemonKey(
                  existing
                ) ===
                getPokemonKey(entry)
            );

          if (!duplicate) {
            route.entries.push(
              entry
            );
          }
        }
      );

      return Array.from(
        groups.values()
      )
        .map((route) => ({
          ...route,

          entries: [
            ...route.entries,
          ].sort((a, b) =>
            a.pokemonName.localeCompare(
              b.pokemonName
            )
          ),
        }))
        .sort((a, b) => {
          const regionCompare =
            a.region.localeCompare(
              b.region
            );

          if (
            regionCompare !== 0
          ) {
            return regionCompare;
          }

          return a.locationName.localeCompare(
            b.locationName
          );
        });
    }, [filteredEntries]);

  /* =======================================================
     STATS
  ======================================================= */

  const routeCount =
    groupedRoutes.length;

  const hordeCount =
    groupedRoutes.reduce(
      (total, route) =>
        total +
        route.entries.length,
      0
    );

  /* =======================================================
     ROUTE TOGGLE
  ======================================================= */

  function toggleRoute(
    routeKey: string
  ) {
    setOpenRoutes(
      (previous) => ({
        ...previous,
        [routeKey]:
          !previous[routeKey],
      })
    );
  }

  function handleSeasonChange(
    season: Season
  ) {
    setSelectedSeason(season);

    /*
     * Collapse routes when changing
     * season.
     */
    setOpenRoutes({});
  }

  function handleRegionChange(
    region: Region
  ) {
    setSelectedRegion(region);

    /*
     * Collapse routes when changing
     * region.
     */
    setOpenRoutes({});
  }

  function toggleExclusive() {
    setSeasonExclusiveOnly(
      (previous) => !previous
    );

    /*
     * Collapse routes when changing
     * filter mode.
     */
    setOpenRoutes({});
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="horde-hunter-page">

      {/* HEADER */}

      <div className="horde-hunter-header">
        <h1 className="horde-hunter-title">
          HORDE HUNTER
        </h1>

        <p className="horde-hunter-subtitle">
          Find every Horde encounter by
          region, route, Pokémon, and
          season.
        </p>
      </div>

      {/* SEARCH */}

      <div className="horde-search-wrapper">
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
          placeholder="Search Pokémon or route..."
          className="horde-search-input"
        />
      </div>

      {/* REGION */}

      <div className="horde-filter-section">

        <div className="horde-filter-label">
          REGION
        </div>

        <div className="horde-filter-row">

          {REGIONS.map(
            (region) => {
              const active =
                selectedRegion ===
                region;

              return (
                <button
                  key={region}
                  type="button"
                  onClick={() =>
                    handleRegionChange(
                      region
                    )
                  }
                  className={
                    active
                      ? "horde-filter-button active"
                      : "horde-filter-button"
                  }
                >
                  {region !==
                    "All Regions" && (
                    <span className="region-icon">
                      {
                        REGION_ICONS[
                          region
                        ]
                      }
                    </span>
                  )}

                  {region}
                </button>
              );
            }
          )}

        </div>
      </div>

      {/* SEASON */}

      <div className="horde-filter-section">

        <div className="horde-filter-label">
          SEASON
        </div>

        <div className="horde-season-row">

          {SEASONS.map(
            (season) => {
              const active =
                selectedSeason ===
                season;

              return (
                <button
                  key={season}
                  type="button"
                  onClick={() =>
                    handleSeasonChange(
                      season
                    )
                  }
                  className={
                    active
                      ? "horde-season-button active"
                      : "horde-season-button"
                  }
                >
                  <span>
                    {
                      SEASON_ICONS[
                        season
                      ]
                    }
                  </span>

                  <span>
                    {season}
                  </span>

                  {active && (
                    <span className="season-selected-dot">
                      ●
                    </span>
                  )}
                </button>
              );
            }
          )}

        </div>

        {/* EXCLUSIVE FILTER */}

        <div className="horde-exclusive-filter">

          <button
            type="button"
            onClick={
              toggleExclusive
            }
            className={
              seasonExclusiveOnly
                ? "horde-exclusive-button active"
                : "horde-exclusive-button"
            }
          >

            <span className="horde-exclusive-icon">
              ✦
            </span>

            <span>
              Exclusive to{" "}
              {selectedSeason}
            </span>

            {seasonExclusiveOnly && (
              <span className="season-selected-dot">
                ●
              </span>
            )}

          </button>

        </div>
      </div>

      {/* STATS */}

      <div className="horde-stats">

        <div className="horde-stat">
          <span className="horde-stat-number">
            {routeCount}
          </span>

          <span className="horde-stat-label">
            Routes
          </span>
        </div>

        <div className="horde-stat">
          <span className="horde-stat-number">
            {hordeCount}
          </span>

          <span className="horde-stat-label">
            Horde Encounters
          </span>
        </div>

        <div className="horde-stat">
          <span className="horde-stat-number">
            {selectedSeason}
          </span>

          <span className="horde-stat-label">
            Selected Season
          </span>
        </div>

      </div>

      {/* CONVERSION */}

      <div className="horde-conversion-card">

        <div className="horde-conversion-title">
          HORDE ENCOUNTER CHANCE
        </div>

        <div className="horde-conversion-values">

          <span>
            5% = 100%
          </span>

          <span>
            3% = 60%
          </span>

          <span>
            2.5% = 50%
          </span>

          <span>
            2% = 40%
          </span>

          <span>
            1% = 20%
          </span>

        </div>
      </div>

      {/* RESULTS */}

      <div className="horde-results">

        {groupedRoutes.length ===
        0 ? (

          <div className="horde-empty">

            <div className="horde-empty-icon">
              🔍
            </div>

            <h2>
              No Horde Encounters Found
            </h2>

            <p>
              Try another Pokémon,
              route, region, or
              season.
            </p>

          </div>

        ) : (

          groupedRoutes.map(
            (route) => {
              const routeKey =
                getRouteKey(
                  route.region,
                  route.locationName
                );

              const isOpen =
                openRoutes[
                  routeKey
                ] === true;

              return (
                <section
                  key={routeKey}
                  className={
                    isOpen
                      ? "horde-route open"
                      : "horde-route"
                  }
                >

                  {/* ROUTE HEADER */}

                  <button
                    type="button"
                    className="horde-route-header"
                    onClick={() =>
                      toggleRoute(
                        routeKey
                      )
                    }
                  >

                    <div className="horde-route-left">

                      <span className="horde-route-arrow">
                        {isOpen
                          ? "▼"
                          : "▶"}
                      </span>

                      <div>

                        <div className="horde-route-region">
                          {
                            REGION_ICONS[
                              route.region
                            ] || "◆"
                          }{" "}
                          {route.region}
                        </div>

                        <h2 className="horde-route-name">
                          {
                            route.locationName
                          }
                        </h2>

                      </div>

                    </div>

                    <div className="horde-route-count">
                      {
                        route.entries
                          .length
                      }{" "}
                      {route.entries
                        .length === 1
                        ? "Horde"
                        : "Hordes"}
                    </div>

                  </button>

                  {/* ROUTE CONTENT */}

                  {isOpen && (
                    <div className="horde-route-content">

                      <div className="horde-pokemon-grid">

                        {route.entries.map(
                          (entry) => (
                            <article
                              key={`${routeKey}-${getPokemonKey(
                                entry
                              )}`}
                              className="horde-pokemon-card"
                            >

                              <div className="horde-pokemon-image-wrapper">

                                <img
                                  src={getSprite(
                                    entry.pokemonId
                                  )}
                                  alt={
                                    entry.pokemonName
                                  }
                                  className="horde-pokemon-image normal"
                                />

                                <img
                                  src={getShinySprite(
                                    entry.pokemonId
                                  )}
                                  alt={`${entry.pokemonName} shiny`}
                                  className="horde-pokemon-image shiny"
                                />

                              </div>

                              <h3 className="horde-pokemon-name">
                                {
                                  entry.pokemonName
                                }
                              </h3>

                              <div className="horde-pokemon-level">
                                Lv.{" "}
                                {
                                  getLevelText(
                                    entry
                                  )
                                }
                              </div>

                              <div className="horde-size-badge">
                                {
                                  entry.hordeSize
                                }× HORDE
                              </div>

                              <div className="horde-chance-row">

                                <div className="horde-chance-box">

                                  <span className="horde-detail-label">
                                    HORDE CHANCE
                                  </span>

                                  <strong>
                                    {
                                      entry.hordeChance
                                    }
                                  </strong>

                                </div>

                                {entry.convertedChance !==
                                  null && (
                                  <div className="horde-chance-box converted">

                                    <span className="horde-detail-label">
                                      FIND CHANCE
                                    </span>

                                    <strong>
                                      {
                                        entry.convertedChance
                                      }
                                      %
                                    </strong>

                                  </div>
                                )}

                              </div>

                              <div className="horde-times">

                                <div>
                                  <span>
                                    🌅
                                  </span>

                                  <strong>
                                    Morning
                                  </strong>

                                  <span>
                                    {
                                      entry.morning
                                    }
                                  </span>
                                </div>

                                <div>
                                  <span>
                                    ☀️
                                  </span>

                                  <strong>
                                    Day
                                  </strong>

                                  <span>
                                    {
                                      entry.day
                                    }
                                  </span>
                                </div>

                                <div>
                                  <span>
                                    🌙
                                  </span>

                                  <strong>
                                    Night
                                  </strong>

                                  <span>
                                    {
                                      entry.night
                                    }
                                  </span>
                                </div>

                              </div>

                              <div className="horde-method">
                                {
                                  entry.method
                                }
                              </div>

                            </article>
                          )
                        )}

                      </div>

                    </div>
                  )}

                </section>
              );
            }
          )

        )}

      </div>

      {/* =====================================================
          STYLES
      ===================================================== */}

      <style>{`

        .horde-hunter-page {
          width: 100%;
          max-width: 1700px;
          margin: 0 auto;
          padding: 30px 42px 80px;
          box-sizing: border-box;
        }

        .horde-hunter-header {
          margin-bottom: 28px;
        }

        .horde-hunter-title {
          margin: 0;
          font-size: 48px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .horde-hunter-subtitle {
          margin: 8px 0 0;
          color: #b9cce5;
          font-size: 18px;
        }

        /* SEARCH */

        .horde-search-wrapper {
          display: flex;
          align-items: center;
          width: min(520px, 100%);
          height: 58px;
          margin-bottom: 26px;

          border: 1px solid
            rgba(100, 175, 255, 0.55);

          border-radius: 14px;

          background:
            rgba(2, 19, 42, 0.85);

          box-shadow:
            inset 0 0 20px
              rgba(0, 80, 160, 0.12),
            0 0 15px
              rgba(0, 60, 130, 0.08);
        }

        .horde-search-wrapper:focus-within {
          border-color: #7ecbff;

          box-shadow:
            0 0 0 2px
              rgba(100, 190, 255, 0.15),
            0 0 20px
              rgba(60, 160, 255, 0.12);
        }

        .horde-search-icon {
          padding-left: 18px;
          font-size: 21px;
        }

        .horde-search-input {
          flex: 1;
          height: 100%;

          border: 0;
          outline: 0;

          background: transparent;

          color: #edf7ff;

          font-size: 17px;

          padding:
            0 18px 0 12px;
        }

        .horde-search-input::placeholder {
          color: #8299b5;
        }

        /* FILTERS */

        .horde-filter-section {
          margin-bottom: 20px;
        }

        .horde-filter-label {
          margin-bottom: 10px;

          color: #8fcaff;

          font-size: 13px;
          font-weight: 800;

          letter-spacing: 1.5px;
        }

        .horde-filter-row,
        .horde-season-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .horde-filter-button,
        .horde-season-button {
          border:
            1px solid
            rgba(95, 157, 222, 0.45);

          background:
            rgba(5, 27, 53, 0.88);

          color: #c6daf3;

          border-radius: 12px;

          padding: 11px 19px;

          font-size: 15px;
          font-weight: 800;

          cursor: pointer;

          transition:
            background 0.18s ease,
            border-color 0.18s ease,
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .horde-filter-button:hover,
        .horde-season-button:hover {
          border-color: #72c4ff;
          transform: translateY(-1px);
        }

        .horde-filter-button.active,
        .horde-season-button.active {
          color: white;

          border-color: #83cfff;

          background:
            linear-gradient(
              180deg,
              rgba(54, 137, 224, 0.9),
              rgba(27, 85, 153, 0.95)
            );

          box-shadow:
            0 0 18px
              rgba(63, 161, 255, 0.2);
        }

        .region-icon {
          margin-right: 6px;
        }

        .horde-season-button {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 9px;

          min-width: 135px;
        }

        .season-selected-dot {
          color: #8fdbff;
          font-size: 9px;
          margin-left: 2px;
        }

        /* EXCLUSIVE */

        .horde-exclusive-filter {
          margin-top: 12px;
        }

        .horde-exclusive-button {
          display: inline-flex;
          align-items: center;

          gap: 9px;

          border:
            1px solid
            rgba(135, 89, 218, 0.45);

          background:
            rgba(28, 13, 61, 0.55);

          color: #d8c8f5;

          border-radius: 12px;

          padding: 11px 19px;

          font-size: 14px;
          font-weight: 800;

          cursor: pointer;

          transition:
            background 0.18s ease,
            border-color 0.18s ease,
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .horde-exclusive-button:hover {
          border-color: #c39aff;

          transform:
            translateY(-1px);

          box-shadow:
            0 0 15px
              rgba(135, 89, 218, 0.15);
        }

        .horde-exclusive-button.active {
          color: white;

          border-color: #cda8ff;

          background:
            linear-gradient(
              180deg,
              rgba(115, 61, 172, 0.9),
              rgba(74, 37, 111, 0.95)
            );

          box-shadow:
            0 0 18px
              rgba(151, 100, 224, 0.25);
        }

        .horde-exclusive-icon {
          color: #d9b8ff;
          font-size: 16px;
        }

        /* STATS */

        .horde-stats {
          display: flex;
          flex-wrap: wrap;

          gap: 12px;

          margin:
            30px 0 20px;
        }

        .horde-stat {
          min-width: 160px;

          padding: 14px 18px;

          border:
            1px solid
            rgba(74, 137, 202, 0.35);

          border-radius: 13px;

          background:
            rgba(4, 24, 48, 0.75);
        }

        .horde-stat-number {
          display: block;

          color: #e7f4ff;

          font-size: 23px;
          font-weight: 900;
        }

        .horde-stat-label {
          display: block;

          margin-top: 3px;

          color: #849bb7;

          font-size: 12px;

          text-transform:
            uppercase;

          letter-spacing: 1px;
        }

        /* CONVERSION */

        .horde-conversion-card {
          margin:
            22px 0 28px;

          padding: 17px 20px;

          border:
            1px solid
            rgba(135, 89, 218, 0.4);

          border-radius: 14px;

          background:
            rgba(28, 13, 61, 0.45);
        }

        .horde-conversion-title {
          color: #cda8ff;

          font-size: 12px;
          font-weight: 900;

          letter-spacing: 1.5px;

          margin-bottom: 10px;
        }

        .horde-conversion-values {
          display: flex;
          flex-wrap: wrap;

          gap: 12px 22px;

          color: #e5d6ff;

          font-weight: 800;
        }

        /* ROUTES */

        .horde-route {
          margin-bottom: 14px;

          overflow: hidden;

          border:
            1px solid
            rgba(65, 129, 195, 0.42);

          border-radius: 18px;

          background:
            rgba(3, 25, 51, 0.86);

          box-shadow:
            0 8px 30px
              rgba(0, 0, 0, 0.14);
        }

        .horde-route-header {
          display: flex;

          align-items: center;
          justify-content: space-between;

          width: 100%;

          min-height: 88px;

          padding:
            16px 22px;

          border: 0;

          color: inherit;

          background: transparent;

          cursor: pointer;

          text-align: left;
        }

        .horde-route-header:hover {
          background:
            rgba(34, 92, 151, 0.12);
        }

        .horde-route-left {
          display: flex;

          align-items: center;

          gap: 16px;

          min-width: 0;
        }

        .horde-route-arrow {
          width: 24px;

          color: #8bd3ff;

          font-size: 17px;

          text-align: center;
        }

        .horde-route-region {
          margin-bottom: 2px;

          color: #72bfff;

          font-size: 11px;
          font-weight: 900;

          letter-spacing: 1.2px;

          text-transform:
            uppercase;
        }

        .horde-route-name {
          margin: 0;

          color: #edf6ff;

          font-size: 23px;
          font-weight: 900;
        }

        .horde-route-count {
          flex-shrink: 0;

          padding:
            8px 14px;

          border:
            1px solid
            rgba(94, 168, 241, 0.4);

          border-radius: 999px;

          color: #a8d9ff;

          background:
            rgba(29, 82, 139, 0.3);

          font-size: 13px;
          font-weight: 800;
        }

        .horde-route-content {
          padding:
            0 20px 22px;

          border-top:
            1px solid
            rgba(70, 125, 180, 0.25);
        }

        /* POKEMON GRID */

        .horde-pokemon-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(220px, 1fr)
            );

          gap: 15px;

          padding-top: 20px;
        }

        .horde-pokemon-card {
          position: relative;

          min-width: 0;

          padding: 18px;

          border:
            1px solid
            rgba(67, 130, 194, 0.35);

          border-radius: 16px;

          background:
            linear-gradient(
              180deg,
              rgba(8, 39, 72, 0.9),
              rgba(3, 21, 43, 0.95)
            );

          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .horde-pokemon-card:hover {
          transform:
            translateY(-3px);

          border-color:
            rgba(104, 191, 255, 0.65);

          box-shadow:
            0 10px 30px
              rgba(0, 0, 0, 0.2);
        }

        /* NORMAL / SHINY */

        .horde-pokemon-image-wrapper {
          position: relative;

          display: flex;

          justify-content:
            center;

          align-items: center;

          height: 125px;

          margin-bottom: 8px;
        }

        .horde-pokemon-image {
          width: 120px;
          height: 120px;

          object-fit: contain;

          image-rendering:
            pixelated;
        }

        .horde-pokemon-image.shiny {
          display: none;
        }

        .horde-pokemon-card:hover
        .horde-pokemon-image.normal {
          display: none;
        }

        .horde-pokemon-card:hover
        .horde-pokemon-image.shiny {
          display: block;
        }

        .horde-pokemon-name {
          margin: 0;

          color: #f1f7ff;

          font-size: 20px;
          font-weight: 900;

          text-align: center;
        }

        .horde-pokemon-level {
          margin-top: 5px;

          color: #8da9c5;

          font-size: 13px;

          text-align: center;
        }

        /* HORDE SIZE */

        .horde-size-badge {
          width: fit-content;

          margin:
            12px auto;

          padding:
            7px 13px;

          border-radius: 9px;

          color: #dfc6ff;

          background:
            rgba(115, 61, 172, 0.35);

          border:
            1px solid
            rgba(172, 115, 237, 0.35);

          font-size: 13px;
          font-weight: 900;
        }

        /* CHANCES */

        .horde-chance-row {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 8px;

          margin-top: 10px;
        }

        .horde-chance-box {
          padding:
            9px 7px;

          border-radius: 9px;

          background:
            rgba(8, 25, 48, 0.8);

          border:
            1px solid
            rgba(65, 116, 166, 0.28);

          text-align: center;
        }

        .horde-chance-box.converted {
          border-color:
            rgba(151, 100, 224, 0.3);

          background:
            rgba(57, 27, 91, 0.35);
        }

        .horde-detail-label {
          display: block;

          margin-bottom: 3px;

          color: #7791ad;

          font-size: 9px;
          font-weight: 900;

          letter-spacing: 0.7px;
        }

        .horde-chance-box strong {
          color: #e8f5ff;

          font-size: 17px;
        }

        .horde-chance-box.converted strong {
          color: #d7b8ff;
        }

        /* TIMES */

        .horde-times {
          margin-top: 13px;

          border-top:
            1px solid
            rgba(73, 125, 177, 0.2);

          padding-top: 10px;
        }

        .horde-times > div {
          display: grid;

          grid-template-columns:
            22px 1fr auto;

          gap: 6px;

          align-items: center;

          min-height: 25px;

          color: #8ca5c0;

          font-size: 11px;
        }

        .horde-times strong {
          color: #bcd2e9;

          font-size: 11px;
        }

        .horde-method {
          margin-top: 10px;

          color: #64809c;

          font-size: 10px;

          text-align: center;

          text-transform:
            uppercase;

          letter-spacing: 1px;
        }

        /* EMPTY */

        .horde-empty {
          padding:
            80px 20px;

          border:
            1px solid
            rgba(68, 126, 184, 0.3);

          border-radius: 18px;

          background:
            rgba(3, 22, 44, 0.7);

          text-align: center;
        }

        .horde-empty-icon {
          font-size: 40px;

          margin-bottom: 10px;
        }

        .horde-empty h2 {
          margin:
            0 0 8px;

          color: #eaf5ff;
        }

        .horde-empty p {
          margin: 0;

          color: #829bb7;
        }

        /* MOBILE */

        @media (max-width: 700px) {

          .horde-hunter-page {
            padding:
              22px 16px 60px;
          }

          .horde-hunter-title {
            font-size: 36px;
          }

          .horde-hunter-subtitle {
            font-size: 15px;
          }

          .horde-filter-button,
          .horde-season-button {
            flex:
              1 1 auto;
          }

          .horde-exclusive-button {
            width: 100%;
            justify-content:
              center;
          }

          .horde-route-header {
            min-height: 76px;

            padding:
              13px 14px;
          }

          .horde-route-name {
            font-size: 18px;
          }

          .horde-route-count {
            font-size: 11px;

            padding:
              6px 9px;
          }

          .horde-route-content {
            padding-left: 12px;
            padding-right: 12px;
          }

          .horde-pokemon-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );

            gap: 9px;
          }

          .horde-pokemon-card {
            padding: 12px;
          }

          .horde-pokemon-image-wrapper {
            height: 95px;
          }

          .horde-pokemon-image {
            width: 90px;
            height: 90px;
          }

          .horde-pokemon-name {
            font-size: 15px;
          }

          .horde-chance-row {
            grid-template-columns:
              1fr;
          }
        }

      `}</style>
    </div>
  );
}