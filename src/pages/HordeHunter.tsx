import { useMemo, useState } from "react";
import monsters from "../data/monsters.json";

type Season =
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter";

type HordeLocation = {
  form: number;
  type: string;

  region_id: number;
  region_name: string;

  location_id: number;
  location_name: string;
  location_name_full: string;

  min_level: number;
  max_level: number;

  season: string;

  is_horde_3x: boolean;
  is_horde_5x: boolean;

  rarity_morning: string;
  rarity_day: string;
  rarity_night: string;
};

type Monster = {
  id: number;
  name: string;
  locations?: HordeLocation[];
};

type HordeEncounter = HordeLocation & {
  pokemonId: number;
  pokemonName: string;
};

const seasons: {
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

/* =========================================================
   HORDE RATE CONVERSION
========================================================= */

function getHordeRate(
  percent: string
): number | null {
  const value = parseFloat(percent);

  if (Number.isNaN(value)) {
    return null;
  }

  switch (value) {
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
   FORMAT HORDE CHANCE
========================================================= */

function formatHordeChance(
  location: HordeEncounter
) {
  const chances = [
    location.rarity_morning,
    location.rarity_day,
    location.rarity_night,
  ].filter(
    (chance) =>
      chance &&
      chance !== "--"
  );

  const uniqueChances =
    Array.from(
      new Set(chances)
    );

  return uniqueChances.map(
    (chance) => {
      const relative =
        getHordeRate(chance);

      return {
        percent: chance,
        relative,
      };
    }
  );
}

/* =========================================================
   HORDE HUNTER PAGE
========================================================= */

export default function HordeHunter() {
  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState<Season>("Spring");

  const [
    search,
    setSearch,
  ] = useState("");

  /* =======================================================
     BUILD HORDE DATA
  ======================================================= */

  const hordeLocations =
    useMemo<HordeEncounter[]>(() => {
      const results: HordeEncounter[] = [];

      const pokemonData =
        monsters as Monster[];

      pokemonData.forEach(
        (pokemon) => {
          if (!pokemon.locations) {
            return;
          }

          pokemon.locations.forEach(
            (location) => {
              /*
               * Only include actual horde
               * encounters.
               */
              if (
                !location.is_horde_3x &&
                !location.is_horde_5x
              ) {
                return;
              }

              /*
               * "Any" encounters appear
               * in every season.
               */
              if (
                location.season !==
                  "Any" &&
                location.season !==
                  selectedSeason
              ) {
                return;
              }

              results.push({
                ...location,

                pokemonId:
                  pokemon.id,

                pokemonName:
                  pokemon.name,
              });
            }
          );
        }
      );

      return results;
    }, [selectedSeason]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredHordes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return hordeLocations;
      }

      return hordeLocations.filter(
        (horde) => {
          return (
            horde.pokemonName
              .toLowerCase()
              .includes(query) ||

            horde.location_name
              .toLowerCase()
              .includes(query) ||

            horde.location_name_full
              .toLowerCase()
              .includes(query) ||

            horde.region_name
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      hordeLocations,
      search,
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
          const region =
            horde.region_name ||
            "Unknown Region";

          const route =
            horde.location_name_full ||
            horde.location_name ||
            "Unknown Location";

          if (!grouped[region]) {
            grouped[region] = {};
          }

          if (!grouped[region][route]) {
            grouped[region][route] = [];
          }

          grouped[region][route].push(
            horde
          );
        }
      );

      /*
       * Sort Pokémon inside
       * each route alphabetically.
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
    Object.keys(groupedHordes).sort(
      (a, b) => {
        const indexA =
          regionOrder.indexOf(a);

        const indexB =
          regionOrder.indexOf(b);

        if (
          indexA === -1 &&
          indexB === -1
        ) {
          return a.localeCompare(b);
        }

        if (indexA === -1) {
          return 1;
        }

        if (indexB === -1) {
          return -1;
        }

        return indexA - indexB;
      }
    );

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
            Find every PokeMMO horde
            encounter by region,
            route, Pokémon, and season.
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
            onClick={() =>
              setSearch("")
            }
          >
            ×
          </button>
        )}

      </div>

      {/* =================================================
          SEASON TABS
      ================================================= */}

      <div className="horde-season-tabs">

        {seasons.map(
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
              onClick={() =>
                setSelectedSeason(
                  season.name
                )
              }
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
          CURRENT SEASON / RESULTS
      ================================================= */}

      <div className="horde-results-header">

        <div>

          <h2>
            {
              seasons.find(
                (season) =>
                  season.name ===
                  selectedSeason
              )?.icon
            }{" "}
            {selectedSeason} Hordes
          </h2>

          <span>
            {filteredHordes.length}{" "}
            horde encounters
          </span>

        </div>

        {search && (
          <div className="horde-search-result">
            Searching for:
            <strong>
              {" "}
              {search}
            </strong>
          </div>
        )}

      </div>

      {/* =================================================
          NO RESULTS
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
            route, or region.
          </p>

        </div>
      )}

      {/* =================================================
          REGION GROUPS
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
              ).sort(
                (a, b) =>
                  a.localeCompare(b)
              );

            return (
              <section
                key={region}
                className="horde-region-section"
              >

                {/* ===============================
                    REGION
                =============================== */}

                <div className="horde-region-header">

                  <div className="horde-region-line" />

                  <h2>
                    {region}
                  </h2>

                  <div className="horde-region-line" />

                </div>

                {/* ===============================
                    ROUTES
                =============================== */}

                <div className="horde-routes">

                  {sortedRoutes.map(
                    (route) => {

                      const pokemon =
                        routes[
                          route
                        ];

                      return (
                        <div
                          key={route}
                          className="horde-route"
                        >

                          {/* ROUTE HEADER */}

                          <div className="horde-route-header">

                            <h3>
                              {route}
                            </h3>

                            <span>
                              {
                                pokemon.length
                              }{" "}
                              horde
                              {pokemon.length !==
                              1
                                ? "s"
                                : ""}
                            </span>

                          </div>

                          {/* COLUMN HEADERS */}

                          <div className="horde-column-header">

                            <span>
                              Pokémon
                            </span>

                            <span>
                              Levels
                            </span>

                            <span>
                              Horde Chance
                            </span>

                            <span>
                              Horde Size
                            </span>

                          </div>

                          {/* POKÉMON */}

                          <div className="horde-pokemon-list">

                            {pokemon.map(
                              (
                                location,
                                index
                              ) => {

                                const chances =
                                  formatHordeChance(
                                    location
                                  );

                                const hordeSize =
                                  location.is_horde_5x
                                    ? "5×"
                                    : "3×";

                                return (
                                  <div
                                    key={`${location.pokemonId}-${location.location_id}-${index}`}
                                    className="horde-pokemon-row"
                                  >

                                    {/* POKÉMON */}

                                    <div className="horde-pokemon-info">

                                      <img
                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${location.pokemonId}.png`}
                                        alt={
                                          location.pokemonName
                                        }
                                        loading="lazy"
                                      />

                                      <div>

                                        <strong>
                                          {
                                            location.pokemonName
                                          }
                                        </strong>

                                        <small>
                                          {
                                            location.type
                                          }
                                        </small>

                                      </div>

                                    </div>

                                    {/* LEVELS */}

                                    <div className="horde-levels">

                                      {location.min_level ===
                                      location.max_level
                                        ? location.min_level
                                        : `${location.min_level}–${location.max_level}`}

                                    </div>

                                    {/* CHANCE */}

                                    <div className="horde-chance-list">

                                      {chances.map(
                                        (
                                          chance,
                                          chanceIndex
                                        ) => (
                                          <span
                                            key={`${chance.percent}-${chanceIndex}`}
                                            className="horde-chance-item"
                                          >

                                            <strong>
                                              {
                                                chance.percent
                                              }
                                            </strong>

                                            {chance.relative !==
                                              null && (
                                              <small>
                                                (
                                                {
                                                  chance.relative
                                                }
                                                %)
                                              </small>
                                            )}

                                          </span>
                                        )
                                      )}

                                    </div>

                                    {/* HORDE SIZE */}

                                    <div>

                                      <span
                                        className={
                                          hordeSize ===
                                          "5×"
                                            ? "horde-size five"
                                            : "horde-size three"
                                        }
                                      >
                                        {hordeSize}
                                      </span>

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>

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