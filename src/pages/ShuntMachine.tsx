import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import monsters from "../data/monsters.json";

type Season =
  | "All Seasons"
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter";

type MonsterLocation = {
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

  rarity_flags?: number;

  rarity_morning?: string;
  rarity_day?: string;
  rarity_night?: string;
};

type Monster = {
  id: number;
  name: string;
  locations?: MonsterLocation[];
};

const pokemonList = monsters as Monster[];

/* =========================================================
   CONSTANTS
========================================================= */

const SEASONS: Season[] = [
  "All Seasons",
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
];

const SEASON_ICONS: Record<Season, string> = {
  "All Seasons": "✦",
  Spring: "🌸",
  Summer: "☀️",
  Autumn: "🍂",
  Winter: "❄️",
};

/* =========================================================
   SPRITE HELPERS
========================================================= */

function getSprite(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function getShinySprite(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
}

/* =========================================================
   SEASON HELPERS
========================================================= */

function normalizeSeason(
  season?: string
): Season | null {
  if (!season) {
    return null;
  }

  const value = season.trim().toLowerCase();

  if (value === "spring") {
    return "Spring";
  }

  if (value === "summer") {
    return "Summer";
  }

  if (value === "autumn" || value === "fall") {
    return "Autumn";
  }

  if (value === "winter") {
    return "Winter";
  }

  return null;
}

/* =========================================================
   LOCATION HELPERS
========================================================= */

function hasValidLocation(
  pokemon: Monster,
  season: Season = "All Seasons"
) {
  if (
    !Array.isArray(pokemon.locations) ||
    pokemon.locations.length === 0
  ) {
    return false;
  }

  return pokemon.locations.some(
    (location) => {
      const locationName =
        location.location_name_full ||
        location.location_name;

      if (!locationName) {
        return false;
      }

      if (season === "All Seasons") {
        return true;
      }

      return (
        normalizeSeason(location.season) ===
        season
      );
    }
  );
}

function getLocations(
  pokemon: Monster,
  season: Season
) {
  if (!Array.isArray(pokemon.locations)) {
    return [];
  }

  const seen = new Set<string>();

  return pokemon.locations.filter(
    (location) => {
      const name =
        location.location_name_full ||
        location.location_name;

      if (!name) {
        return false;
      }

      /*
       * When a specific season is selected,
       * only show locations belonging to that season.
       */
      if (season !== "All Seasons") {
        if (
          normalizeSeason(location.season) !==
          season
        ) {
          return false;
        }
      }

      const key = [
        name,
        location.region_name || "",
        normalizeSeason(location.season) ||
          "",
        location.type || "",
        location.min_level ?? "",
        location.max_level ?? "",
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

/* =========================================================
   RANDOM HELPERS
========================================================= */

function randomPokemon(
  pool: Monster[]
) {
  if (pool.length === 0) {
    return null;
  }

  return pool[
    Math.floor(
      Math.random() * pool.length
    )
  ];
}

function randomPool(
  pool: Monster[],
  amount: number
) {
  if (pool.length === 0) {
    return [];
  }

  const result: Monster[] = [];

  for (let i = 0; i < amount; i++) {
    const pokemon = randomPokemon(pool);

    if (pokemon) {
      result.push(pokemon);
    }
  }

  return result;
}

/* =========================================================
   BUILD REEL
========================================================= */

function buildReel(
  selected: Monster,
  pool: Monster[]
) {
  /*
   * Lots of random Pokémon first.
   * Selected Pokémon is always the final
   * item so the center position lands on it.
   */
  const reel = randomPool(
    pool,
    18
  );

  reel.push(selected);

  return reel;
}

/* =========================================================
   PAGE
========================================================= */

export default function ShuntMachine() {
  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState<Season>("All Seasons");

  const [
    spinning,
    setSpinning,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<Monster | null>(null);

  const [
    reelPokemon,
    setReelPokemon,
  ] = useState<Monster[][]>([
    [],
    [],
    [],
  ]);

  const [
    reelStopped,
    setReelStopped,
  ] = useState([
    true,
    true,
    true,
  ]);

  const audioContext =
    useRef<AudioContext | null>(
      null
    );

  /* =======================================================
     SHUNTABLE POOL
  ======================================================= */

  const shuntablePokemon =
    useMemo(() => {
      return pokemonList.filter(
        (pokemon) =>
          hasValidLocation(
            pokemon,
            selectedSeason
          )
      );
    }, [selectedSeason]);

  /* =======================================================
     INITIAL / SEASON CHANGE
  ======================================================= */

  useEffect(() => {
    /*
     * Changing seasons completely resets the
     * visible machine without using a reset button.
     */
    setResult(null);
    setSpinning(false);

    setReelStopped([
      true,
      true,
      true,
    ]);

    if (shuntablePokemon.length > 0) {
      setReelPokemon([
        randomPool(
          shuntablePokemon,
          7
        ),
        randomPool(
          shuntablePokemon,
          7
        ),
        randomPool(
          shuntablePokemon,
          7
        ),
      ]);
    } else {
      setReelPokemon([
        [],
        [],
        [],
      ]);
    }
  }, [selectedSeason, shuntablePokemon]);

  /* =======================================================
     CLICK SOUND
  ======================================================= */

  function playClickSound() {
    try {
      const AudioCtx =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioCtx) {
        return;
      }

      if (!audioContext.current) {
        audioContext.current =
          new AudioCtx();
      }

      const context =
        audioContext.current;

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type =
        "square";

      oscillator.frequency.setValueAtTime(
        140,
        context.currentTime
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        60,
        context.currentTime + 0.08
      );

      gain.gain.setValueAtTime(
        0.12,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.08
      );

      oscillator.connect(gain);
      gain.connect(
        context.destination
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime + 0.08
      );
    } catch {
      // Audio is optional.
    }
  }

  /* =======================================================
     STOP SOUND
  ======================================================= */

  function playStopSound() {
    try {
      const context =
        audioContext.current;

      if (!context) {
        return;
      }

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type =
        "sine";

      oscillator.frequency.setValueAtTime(
        320,
        context.currentTime
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        180,
        context.currentTime + 0.12
      );

      gain.gain.setValueAtTime(
        0.14,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.12
      );

      oscillator.connect(gain);
      gain.connect(
        context.destination
      );

      oscillator.start();

      oscillator.stop(
        context.currentTime + 0.12
      );
    } catch {
      // Audio is optional.
    }
  }

  /* =======================================================
     SHUNT
  ======================================================= */

  function shunt() {
    if (
      spinning ||
      shuntablePokemon.length === 0
    ) {
      return;
    }

    const selected =
      randomPokemon(
        shuntablePokemon
      );

    if (!selected) {
      return;
    }

    playClickSound();

    setResult(null);

    setSpinning(true);

    setReelStopped([
      false,
      false,
      false,
    ]);

    /*
     * Every reel receives the SAME selected
     * Pokémon at its stopping position.
     */
    setReelPokemon([
      buildReel(
        selected,
        shuntablePokemon
      ),
      buildReel(
        selected,
        shuntablePokemon
      ),
      buildReel(
        selected,
        shuntablePokemon
      ),
    ]);

    /*
     * Each reel stops separately.
     *
     * LEFT   = fastest
     * MIDDLE = slower
     * RIGHT  = slowest / final reel
     */
    const reelTimes = [
      1800,
      2600,
      3600,
    ];

    reelTimes.forEach(
      (delay, index) => {
        window.setTimeout(() => {
          playStopSound();

          setReelStopped(
            (previous) => {
              const next = [
                ...previous,
              ];

              next[index] = true;

              return next;
            }
          );

          /*
           * Only reveal the final result
           * after the third reel has stopped.
           */
          if (index === 2) {
            window.setTimeout(() => {
              setResult(
                selected
              );

              setSpinning(false);
            }, 500);
          }
        }, delay);
      }
    );
  }

  /* =======================================================
     RESULT LOCATIONS
  ======================================================= */

  const resultLocations =
    result
      ? getLocations(
          result,
          selectedSeason
        )
      : [];

  /* =======================================================
     THEME
  ======================================================= */

  const themeClass =
    selectedSeason === "All Seasons"
      ? "theme-all"
      : `theme-${selectedSeason.toLowerCase()}`;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={`shunt-page ${themeClass}`}
    >
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="shunt-header">
        <div className="shunt-title-icon">
          ✨
        </div>

        <h1>
          SHUNT MACHINE
        </h1>

        <p>
          Don't know what to shunt next?
          Let fate decide.
        </p>
      </div>

      {/* ===================================================
          SEASON FILTER
      =================================================== */}

      <div className="season-filter">
        <div className="season-filter-label">
          HUNTING SEASON
        </div>

        <div className="season-buttons">
          {SEASONS.map(
            (season) => (
              <button
                key={season}
                type="button"
                className={
                  selectedSeason === season
                    ? "season-button active"
                    : "season-button"
                }
                onClick={() =>
                  !spinning &&
                  setSelectedSeason(
                    season
                  )
                }
                disabled={spinning}
              >
                <span className="season-icon">
                  {
                    SEASON_ICONS[
                      season
                    ]
                  }
                </span>

                <span>
                  {season}
                </span>
              </button>
            )
          )}
        </div>

        <div className="season-description">
          {selectedSeason ===
          "All Seasons"
            ? "Fate may choose from any Pokémon with a known hunt location."
            : `Fate will only choose Pokémon available during ${selectedSeason}.`}
        </div>
      </div>

      {/* ===================================================
          MACHINE
      =================================================== */}

      <div className="shunt-machine">
        <div className="machine-top-light">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="machine-title">
          <span>✦</span>

          {selectedSeason ===
          "All Seasons"
            ? "NEXT SHUNT"
            : `${selectedSeason.toUpperCase()} SHUNT`}

          <span>✦</span>
        </div>

        {/* REELS */}

        <div
          className={
            spinning
              ? "reels spinning"
              : "reels"
          }
        >
          {reelPokemon.map(
            (
              reel,
              reelIndex
            ) => {
              const stopped =
                reelStopped[
                  reelIndex
                ];

              return (
                <div
                  key={reelIndex}
                  className={
                    stopped
                      ? "reel stopped"
                      : `reel moving reel-${reelIndex}`
                  }
                >
                  <div className="reel-inner">
                    {reel.map(
                      (
                        pokemon,
                        pokemonIndex
                      ) => (
                        <div
                          key={`${reelIndex}-${pokemon.id}-${pokemonIndex}`}
                          className="reel-pokemon"
                        >
                          <img
                            src={getSprite(
                              pokemon.id
                            )}
                            alt={
                              pokemon.name
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            }
          )}

          {/* CENTER SELECTION */}

          <div className="selection-window">
            <div className="selection-arrow left">
              ▶
            </div>

            <div className="selection-arrow right">
              ◀
            </div>
          </div>
        </div>

        {/* MACHINE BOTTOM */}

        <div className="machine-bottom">
          <div className="machine-status">
            {spinning ? (
              <>
                <span className="status-light spinning-light" />
                SEARCHING...
              </>
            ) : result ? (
              <>
                <span className="status-light result-light" />
                SHUNT FOUND
              </>
            ) : (
              <>
                <span className="status-light ready-light" />
                READY
              </>
            )}
          </div>

          <button
            type="button"
            className={
              spinning
                ? "shunt-button disabled"
                : "shunt-button"
            }
            onClick={shunt}
            disabled={
              spinning ||
              shuntablePokemon.length ===
                0
            }
          >
            <span className="button-top" />

            <span className="button-text">
              {result
                ? "SHUNT AGAIN"
                : "SHUNT"}
            </span>
          </button>

          {shuntablePokemon.length ===
            0 && (
            <div className="no-results">
              No Pokémon have a valid hunt
              location for this season.
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          RESULT
      =================================================== */}

      {result && !spinning && (
        <div className="result-section">
          <div className="result-label">
            ✦ YOUR NEXT SHUNT ✦
          </div>

          <div className="result-card">
            {/* RESULT POKEMON */}

            <div className="result-pokemon">
              <div className="result-sparkles">
                ✦
              </div>

              <img
                src={getShinySprite(
                  result.id
                )}
                alt={`${result.name} shiny`}
              />

              <div className="result-sparkles bottom">
                ✦
              </div>
            </div>

            {/* RESULT INFORMATION */}

            <div className="result-info">
              <div className="result-number">
                #
                {String(
                  result.id
                ).padStart(3, "0")}
              </div>

              <h2>
                SHINY{" "}
                {result.name.toUpperCase()}
              </h2>

              <p className="result-description">
                Fate has chosen your next
                target.
              </p>

              <div className="result-season">
                <span>
                  {
                    SEASON_ICONS[
                      selectedSeason
                    ]
                  }
                </span>

                {selectedSeason ===
                "All Seasons"
                  ? "ALL SEASONS"
                  : selectedSeason.toUpperCase()}
              </div>

              <div className="result-divider" />

              {/* LOCATIONS */}

              <div className="locations-title">
                📍 HUNT LOCATIONS
              </div>

              {resultLocations.length >
              0 ? (
                <div className="locations-list">
                  {resultLocations.map(
                    (
                      location,
                      index
                    ) => {
                      const locationName =
                        location.location_name_full ||
                        location.location_name ||
                        "Unknown Location";

                      return (
                        <div
                          key={`${locationName}-${index}`}
                          className="location-card"
                        >
                          <div className="location-main">
                            <strong>
                              {
                                locationName
                              }
                            </strong>

                            {location.region_name && (
                              <span>
                                {
                                  location.region_name
                                }
                              </span>
                            )}
                          </div>

                          <div className="location-details">
                            {location.season && (
                              <span>
                                🍂{" "}
                                {
                                  location.season
                                }
                              </span>
                            )}

                            {location.type && (
                              <span>
                                🎯{" "}
                                {
                                  location.type
                                }
                              </span>
                            )}

                            {location.min_level !==
                              undefined &&
                              location.max_level !==
                                undefined && (
                                <span>
                                  Lv.{" "}
                                  {
                                    location.min_level
                                  }
                                  –
                                  {
                                    location.max_level
                                  }
                                </span>
                              )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="no-location-data">
                  No location data available.
                </div>
              )}
            </div>
          </div>

          {/* SHUNT AGAIN */}

          <button
            type="button"
            className="result-shunt-again"
            onClick={shunt}
          >
            🎰 SHUNT AGAIN
          </button>
        </div>
      )}

      {/* ===================================================
          HELP
      =================================================== */}

      {!result && !spinning && (
        <div className="machine-help">
          <div>
            <span>🎰</span>

            <strong>
              LET FATE DECIDE
            </strong>

            <p>
              Press SHUNT to randomly
              choose your next shiny
              target.
            </p>
          </div>

          <div>
            <span>📍</span>

            <strong>
              LOCATION GUARANTEED
            </strong>

            <p>
              Every Pokémon in the
              machine has at least one
              known hunt location.
            </p>
          </div>

          <div>
            <span>✨</span>

            <strong>
              SHINY TARGET
            </strong>

            <p>
              The machine only chooses
              Pokémon you can actually
              hunt.
            </p>
          </div>
        </div>
      )}

      {/* ===================================================
          STYLES
      =================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        /* =================================================
           PAGE
        ================================================= */

        .shunt-page {
          --theme-primary: #63cfff;
          --theme-secondary: #a878ff;
          --theme-glow: rgba(99, 207, 255, 0.25);
          --theme-dark: #061a30;
          --theme-machine-top: #092d4e;
          --theme-machine-bottom: #020f20;

          width: 100%;
          max-width: 1250px;
          margin: 0 auto;

          padding:
            35px 25px 90px;

          color: #edf7ff;
        }

        /* =================================================
           SEASON THEMES
        ================================================= */

        .theme-all {
          --theme-primary: #63cfff;
          --theme-secondary: #a878ff;
          --theme-glow: rgba(99, 207, 255, 0.25);
          --theme-dark: #061a30;
          --theme-machine-top: #092d4e;
          --theme-machine-bottom: #020f20;
        }

        .theme-spring {
          --theme-primary: #ff9fc8;
          --theme-secondary: #a9e878;
          --theme-glow: rgba(255, 159, 200, 0.28);
          --theme-dark: #26152a;
          --theme-machine-top: #3a1f39;
          --theme-machine-bottom: #171022;
        }

        .theme-summer {
          --theme-primary: #ffd15c;
          --theme-secondary: #ff9d4d;
          --theme-glow: rgba(255, 209, 92, 0.28);
          --theme-dark: #2d210c;
          --theme-machine-top: #4a3510;
          --theme-machine-bottom: #211707;
        }

        .theme-autumn {
          --theme-primary: #ff9b52;
          --theme-secondary: #e45d42;
          --theme-glow: rgba(255, 155, 82, 0.28);
          --theme-dark: #2b170d;
          --theme-machine-top: #4a2411;
          --theme-machine-bottom: #211009;
        }

        .theme-winter {
          --theme-primary: #83e8ff;
          --theme-secondary: #8ea7ff;
          --theme-glow: rgba(131, 232, 255, 0.28);
          --theme-dark: #081d35;
          --theme-machine-top: #0c3556;
          --theme-machine-bottom: #031322;
        }

        /* =================================================
           HEADER
        ================================================= */

        .shunt-header {
          text-align: center;

          margin-bottom: 28px;
        }

        .shunt-title-icon {
          font-size: 34px;

          margin-bottom: 3px;
        }

        .shunt-header h1 {
          margin: 0;

          font-size: 48px;
          font-weight: 950;

          letter-spacing: 4px;

          text-shadow:
            0 0 20px
            var(--theme-glow);
        }

        .shunt-header p {
          margin:
            8px 0 0;

          color: #8ea9c4;

          font-size: 17px;
        }

        /* =================================================
           SEASON FILTER
        ================================================= */

        .season-filter {
          max-width: 900px;

          margin:
            0 auto 28px;

          padding:
            18px 20px;

          border:
            1px solid
            rgba(100, 174, 224, 0.28);

          border-radius: 18px;

          background:
            rgba(4, 25, 47, 0.72);

          box-shadow:
            0 15px 40px
            rgba(0, 0, 0, 0.18);
        }

        .season-filter-label {
          margin-bottom: 11px;

          color:
            var(--theme-primary);

          font-size: 11px;
          font-weight: 950;

          letter-spacing: 2px;

          text-align: center;
        }

        .season-buttons {
          display: flex;

          justify-content: center;

          gap: 8px;

          flex-wrap: wrap;
        }

        .season-button {
          display: flex;

          align-items: center;
          justify-content: center;

          gap: 7px;

          min-width: 125px;

          padding:
            11px 17px;

          border:
            1px solid
            rgba(101, 166, 213, 0.34);

          border-radius: 11px;

          color: #a9c4dc;

          background:
            rgba(8, 36, 64, 0.8);

          font-size: 13px;
          font-weight: 900;

          cursor: pointer;

          transition:
            all 0.18s ease;
        }

        .season-button:hover {
          border-color:
            var(--theme-primary);

          color: white;

          transform:
            translateY(-1px);

          box-shadow:
            0 0 18px
            var(--theme-glow);
        }

        .season-button.active {
          border-color:
            var(--theme-primary);

          color: white;

          background:
            linear-gradient(
              135deg,
              color-mix(
                in srgb,
                var(--theme-primary) 22%,
                transparent
              ),
              rgba(15, 44, 70, 0.95)
            );

          box-shadow:
            0 0 22px
            var(--theme-glow),
            inset 0 0 18px
            var(--theme-glow);
        }

        .season-button:disabled {
          cursor:
            not-allowed;

          opacity:
            0.65;
        }

        .season-icon {
          font-size: 16px;
        }

        .season-description {
          margin-top: 12px;

          color: #708ba5;

          font-size: 11px;

          text-align: center;
        }

        /* =================================================
           MACHINE
        ================================================= */

        .shunt-machine {
          position: relative;

          max-width: 900px;

          margin:
            0 auto;

          padding:
            25px 28px 30px;

          border:
            2px solid
            color-mix(
              in srgb,
              var(--theme-primary) 55%,
              transparent
            );

          border-radius: 30px;

          background:
            linear-gradient(
              180deg,
              var(--theme-machine-top),
              var(--theme-machine-bottom)
            );

          box-shadow:
            0 25px 70px
            rgba(0, 0, 0, 0.38),

            inset 0 0 40px
            var(--theme-glow);
        }

        .machine-top-light {
          display: flex;

          justify-content:
            center;

          gap: 14px;

          margin-bottom: 15px;
        }

        .machine-top-light span {
          width: 8px;
          height: 8px;

          border-radius: 50%;

          background:
            var(--theme-primary);

          box-shadow:
            0 0 10px
            var(--theme-primary);
        }

        .machine-title {
          display: flex;

          justify-content:
            center;

          align-items: center;

          gap: 16px;

          margin-bottom: 20px;

          color: #d9efff;

          font-size: 16px;
          font-weight: 950;

          letter-spacing: 3px;
        }

        .machine-title span {
          color:
            var(--theme-secondary);

          font-size: 20px;
        }

        /* =================================================
           REELS
        ================================================= */

        .reels {
          position: relative;

          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 13px;

          height: 400px;

          overflow: hidden;

          padding: 15px;

          border:
            2px solid
            color-mix(
              in srgb,
              var(--theme-primary) 42%,
              transparent
            );

          border-radius: 20px;

          background:
            #020d1b;

          box-shadow:
            inset 0 0 30px
            rgba(0, 0, 0, 0.7);
        }

        .reel {
          position: relative;

          overflow: hidden;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--theme-primary) 28%,
              transparent
            );

          border-radius: 14px;

          background:
            linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.35),
              color-mix(
                in srgb,
                var(--theme-primary) 12%,
                transparent
              ),
              rgba(0, 0, 0, 0.35)
            );
        }

        .reel::before,
        .reel::after {
          content: "";

          position: absolute;

          left: 0;
          right: 0;

          height: 100px;

          z-index: 4;

          pointer-events:
            none;
        }

        .reel::before {
          top: 0;

          background:
            linear-gradient(
              180deg,
              #020d1b,
              transparent
            );
        }

        .reel::after {
          bottom: 0;

          background:
            linear-gradient(
              0deg,
              #020d1b,
              transparent
            );
        }

        .reel-inner {
          display: flex;

          flex-direction:
            column;

          align-items:
            center;

          gap: 5px;

          padding-top: 5px;

          transform:
            translateY(-5px);

          transition:
            transform 0.9s
            cubic-bezier(
              0.12,
              0.8,
              0.18,
              1
            );
        }

        /*
         * All reels scroll quickly at first.
         */

        .reel.moving .reel-inner {
          animation:
            reelScroll
            0.11s
            linear
            infinite;
        }

        /*
         * Each reel has a progressively slower
         * mechanical stop.
         */

        .reel-0.stopped .reel-inner {
          animation:
            reelStopFast
            0.65s
            cubic-bezier(
              0.12,
              0.8,
              0.18,
              1
            );
        }

        .reel-1.stopped .reel-inner {
          animation:
            reelStopMedium
            0.95s
            cubic-bezier(
              0.12,
              0.8,
              0.18,
              1
            );
        }

        .reel-2.stopped .reel-inner {
          animation:
            reelStopSlow
            1.35s
            cubic-bezier(
              0.12,
              0.8,
              0.18,
              1
            );
        }

        .reel.stopped .reel-inner {
          animation-fill-mode:
            forwards;
        }

        .reel-pokemon {
          display: flex;

          justify-content:
            center;

          align-items:
            center;

          flex:
            0 0 115px;

          width: 100%;
        }

        .reel-pokemon img {
          width: 110px;
          height: 110px;

          object-fit: contain;

          image-rendering:
            pixelated;

          transition:
            filter 0.1s ease;
        }

        .reel.moving
        .reel-pokemon img {
          filter:
            blur(3px);
        }

        /* =================================================
           CENTER WINDOW
        ================================================= */

        .selection-window {
          position: absolute;

          left: 8px;
          right: 8px;

          top: 50%;

          height: 125px;

          transform:
            translateY(-50%);

          z-index: 8;

          pointer-events:
            none;

          border:
            2px solid
            var(--theme-primary);

          border-radius: 15px;

          box-shadow:
            0 0 0 3px
            rgba(3, 17, 31, 0.8),

            0 0 30px
            var(--theme-glow);

          background:
            color-mix(
              in srgb,
              var(--theme-primary) 4%,
              transparent
            );
        }

        .selection-arrow {
          position: absolute;

          top: 50%;

          transform:
            translateY(-50%);

          color:
            var(--theme-primary);

          font-size: 18px;

          text-shadow:
            0 0 8px
            var(--theme-primary);
        }

        .selection-arrow.left {
          left: 5px;
        }

        .selection-arrow.right {
          right: 5px;
        }

        /* =================================================
           REEL ANIMATIONS
        ================================================= */

        @keyframes reelScroll {
          0% {
            transform:
              translateY(-10%);
          }

          100% {
            transform:
              translateY(-65%);
          }
        }

        @keyframes reelStopFast {
          0% {
            transform:
              translateY(-18%);
          }

          70% {
            transform:
              translateY(-6%);
          }

          88% {
            transform:
              translateY(-8%);
          }

          100% {
            transform:
              translateY(-7%);
          }
        }

        @keyframes reelStopMedium {
          0% {
            transform:
              translateY(-25%);
          }

          65% {
            transform:
              translateY(-5%);
          }

          82% {
            transform:
              translateY(-9%);
          }

          100% {
            transform:
              translateY(-7%);
          }
        }

        @keyframes reelStopSlow {
          0% {
            transform:
              translateY(-32%);
          }

          55% {
            transform:
              translateY(-8%);
          }

          72% {
            transform:
              translateY(-4%);
          }

          87% {
            transform:
              translateY(-8%);
          }

          94% {
            transform:
              translateY(-6%);
          }

          100% {
            transform:
              translateY(-7%);
          }
        }

        /* =================================================
           MACHINE BOTTOM
        ================================================= */

        .machine-bottom {
          display: flex;

          justify-content:
            center;

          align-items:
            center;

          flex-direction:
            column;

          gap: 17px;

          padding-top: 25px;
        }

        .machine-status {
          display: flex;

          align-items:
            center;

          gap: 8px;

          color: #7792ac;

          font-size: 11px;
          font-weight: 900;

          letter-spacing: 2px;
        }

        .status-light {
          width: 7px;
          height: 7px;

          border-radius: 50%;
        }

        .ready-light {
          background:
            var(--theme-primary);

          box-shadow:
            0 0 9px
            var(--theme-primary);
        }

        .spinning-light {
          background:
            var(--theme-secondary);

          box-shadow:
            0 0 9px
            var(--theme-secondary);

          animation:
            pulse
            0.3s
            infinite
            alternate;
        }

        .result-light {
          background:
            #86f4ad;

          box-shadow:
            0 0 9px
            #86f4ad;
        }

        @keyframes pulse {
          from {
            opacity:
              0.35;
          }

          to {
            opacity:
              1;
          }
        }

        /* =================================================
           SHUNT BUTTON
        ================================================= */

        .shunt-button {
          position: relative;

          width: 260px;
          height: 72px;

          border:
            2px solid
            var(--theme-secondary);

          border-radius: 17px;

          color: white;

          background:
            linear-gradient(
              180deg,
              color-mix(
                in srgb,
                var(--theme-secondary) 90%,
                white
              ),
              color-mix(
                in srgb,
                var(--theme-secondary) 65%,
                black
              )
            );

          font-size: 22px;
          font-weight: 950;

          letter-spacing: 3px;

          cursor: pointer;

          box-shadow:
            0 8px 0
            color-mix(
              in srgb,
              var(--theme-secondary) 40%,
              black
            ),

            0 0 25px
            var(--theme-glow);

          transition:
            transform 0.08s ease,
            box-shadow 0.08s ease;
        }

        .shunt-button:hover {
          box-shadow:
            0 8px 0
            color-mix(
              in srgb,
              var(--theme-secondary) 40%,
              black
            ),

            0 0 35px
            var(--theme-glow);
        }

        .shunt-button:active {
          transform:
            translateY(6px);

          box-shadow:
            0 2px 0
            color-mix(
              in srgb,
              var(--theme-secondary) 40%,
              black
            );
        }

        .shunt-button.disabled {
          opacity:
            0.65;

          cursor:
            not-allowed;
        }

        .no-results {
          color:
            #ff9b9b;

          font-size: 12px;
        }

        /* =================================================
           RESULT SECTION
        ================================================= */

        .result-section {
          max-width: 900px;

          margin:
            55px auto 0;

          text-align:
            center;
        }

        .result-label {
          color:
            var(--theme-primary);

          font-size: 15px;
          font-weight: 950;

          letter-spacing: 3px;

          margin-bottom: 18px;
        }

        /*
         * Desktop intentionally uses the SAME
         * vertical structure as mobile.
         *
         * This makes the hunt locations impossible
         * to miss on PC.
         */

        .result-card {
          display: block;

          overflow: hidden;

          text-align:
            left;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--theme-primary) 45%,
              transparent
            );

          border-radius: 24px;

          background:
            linear-gradient(
              135deg,
              color-mix(
                in srgb,
                var(--theme-secondary) 10%,
                #071d34
              ),
              #051b31
            );

          box-shadow:
            0 20px 55px
            rgba(0, 0, 0, 0.28),

            0 0 35px
            var(--theme-glow);
        }

        /* =================================================
           RESULT POKEMON
        ================================================= */

        .result-pokemon {
          position: relative;

          display: flex;

          justify-content:
            center;

          align-items:
            center;

          min-height: 430px;

          overflow: hidden;

          background:
            radial-gradient(
              circle,
              var(--theme-glow),
              transparent 65%
            );
        }

        .result-pokemon::before {
          content: "";

          position: absolute;

          width: 270px;
          height: 270px;

          border-radius: 50%;

          background:
            var(--theme-glow);

          filter:
            blur(18px);
        }

        .result-pokemon img {
          position: relative;

          z-index: 2;

          width: 290px;
          height: 290px;

          object-fit:
            contain;

          image-rendering:
            pixelated;

          animation:
            resultReveal
            0.65s
            cubic-bezier(
              0.2,
              1.4,
              0.3,
              1
            );
        }

        @keyframes resultReveal {
          0% {
            opacity: 0;

            transform:
              scale(0.3)
              rotate(-10deg);
          }

          70% {
            transform:
              scale(1.08)
              rotate(2deg);
          }

          100% {
            opacity: 1;

            transform:
              scale(1)
              rotate(0);
          }
        }

        .result-sparkles {
          position: absolute;

          top: 65px;
          right: 45px;

          z-index: 3;

          color:
            var(--theme-primary);

          font-size: 28px;

          animation:
            sparkle
            1.2s
            infinite
            alternate;
        }

        .result-sparkles.bottom {
          top: auto;
          right: auto;

          bottom: 80px;
          left: 55px;

          font-size: 20px;
        }

        @keyframes sparkle {
          from {
            opacity:
              0.3;

            transform:
              scale(0.8)
              rotate(0);
          }

          to {
            opacity:
              1;

            transform:
              scale(1.2)
              rotate(20deg);
          }
        }

        /* =================================================
           RESULT INFO
        ================================================= */

        .result-info {
          padding:
            35px 40px 40px;
        }

        .result-number {
          color: #718aa4;

          font-size: 13px;
          font-weight: 900;

          letter-spacing: 2px;
        }

        .result-info h2 {
          margin:
            5px 0 8px;

          color: #f1e7ff;

          font-size: 38px;
          font-weight: 950;

          letter-spacing: 2px;
        }

        .result-description {
          margin: 0;

          color: #91a8bf;

          font-size: 15px;
        }

        .result-season {
          display: inline-flex;

          align-items:
            center;

          gap: 7px;

          margin-top: 15px;

          padding:
            7px 11px;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--theme-primary) 35%,
              transparent
            );

          border-radius: 8px;

          color:
            var(--theme-primary);

          background:
            color-mix(
              in srgb,
              var(--theme-primary) 8%,
              transparent
            );

          font-size: 10px;
          font-weight: 950;

          letter-spacing: 1px;
        }

        .result-divider {
          height: 1px;

          margin:
            25px 0;

          background:
            color-mix(
              in srgb,
              var(--theme-primary) 20%,
              transparent
            );
        }

        /* =================================================
           LOCATIONS
        ================================================= */

        .locations-title {
          margin-bottom: 14px;

          color:
            var(--theme-primary);

          font-size: 13px;
          font-weight: 950;

          letter-spacing: 1.5px;
        }

        .locations-list {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 10px;

          max-height: 400px;

          overflow-y:
            auto;

          padding-right: 5px;
        }

        .location-card {
          padding:
            13px 15px;

          border:
            1px solid
            rgba(91, 139, 182, 0.3);

          border-radius: 11px;

          background:
            rgba(4, 23, 44, 0.65);
        }

        .location-main {
          display: flex;

          justify-content:
            space-between;

          align-items:
            center;

          gap: 10px;
        }

        .location-main strong {
          color:
            #e5f2ff;

          font-size: 14px;
        }

        .location-main span {
          color:
            var(--theme-primary);

          font-size: 11px;
          font-weight: 800;

          white-space:
            nowrap;
        }

        .location-details {
          display: flex;

          flex-wrap:
            wrap;

          gap: 8px;

          margin-top: 7px;

          color: #7e98b2;

          font-size: 10px;
        }

        .location-details span {
          padding:
            4px 7px;

          border-radius: 6px;

          background:
            rgba(39, 82, 120, 0.25);
        }

        .no-location-data {
          padding:
            18px;

          border:
            1px solid
            rgba(255, 150, 150, 0.25);

          border-radius: 10px;

          color:
            #d99a9a;

          background:
            rgba(100, 30, 30, 0.15);

          text-align:
            center;
        }

        /* =================================================
           RESULT BUTTON
        ================================================= */

        .result-shunt-again {
          margin-top: 25px;

          padding:
            13px 28px;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--theme-secondary) 55%,
              transparent
            );

          border-radius: 11px;

          color: #eadbff;

          background:
            color-mix(
              in srgb,
              var(--theme-secondary) 18%,
              transparent
            );

          font-size: 14px;
          font-weight: 900;

          letter-spacing: 1px;

          cursor: pointer;
        }

        .result-shunt-again:hover {
          background:
            color-mix(
              in srgb,
              var(--theme-secondary) 30%,
              transparent
            );
        }

        /* =================================================
           HELP
        ================================================= */

        .machine-help {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 15px;

          max-width: 900px;

          margin:
            35px auto 0;
        }

        .machine-help > div {
          padding:
            20px;

          border:
            1px solid
            rgba(72, 135, 194, 0.28);

          border-radius: 15px;

          background:
            rgba(4, 24, 47, 0.6);

          text-align:
            center;
        }

        .machine-help span {
          display: block;

          margin-bottom: 8px;

          font-size: 25px;
        }

        .machine-help strong {
          display: block;

          color: #c4ddf4;

          font-size: 12px;

          letter-spacing: 1px;
        }

        .machine-help p {
          margin:
            8px 0 0;

          color: #7189a2;

          font-size: 12px;

          line-height: 1.5;
        }

        /* =================================================
           MOBILE
        ================================================= */

        @media (max-width: 750px) {

          .shunt-page {
            padding:
              25px 13px 60px;
          }

          .shunt-header h1 {
            font-size: 34px;

            letter-spacing: 2px;
          }

          .shunt-header p {
            font-size: 14px;
          }

          .season-filter {
            padding:
              15px 12px;
          }

          .season-buttons {
            display: grid;

            grid-template-columns:
              repeat(2, 1fr);

            gap: 7px;
          }

          .season-button {
            min-width: 0;

            width: 100%;

            padding:
              10px 7px;

            font-size: 11px;
          }

          .season-button:first-child {
            grid-column:
              1 / -1;
          }

          .season-description {
            font-size: 10px;

            line-height: 1.4;
          }

          .shunt-machine {
            padding:
              18px 13px 24px;

            border-radius:
              21px;
          }

          .reels {
            height: 310px;

            gap: 6px;

            padding: 8px;
          }

          .reel-pokemon {
            flex-basis:
              90px;
          }

          .reel-pokemon img {
            width: 82px;
            height: 82px;
          }

          .selection-window {
            left: 4px;
            right: 4px;

            height: 95px;
          }

          .shunt-button {
            width: 220px;
            height: 64px;

            font-size: 18px;
          }

          .result-card {
            display:
              block;
          }

          .result-pokemon {
            min-height:
              310px;
          }

          .result-pokemon img {
            width: 220px;
            height: 220px;
          }

          .result-info {
            padding:
              28px 22px;
          }

          .result-info h2 {
            font-size: 27px;
          }

          .locations-list {
            grid-template-columns:
              1fr;

            max-height:
              none;
          }

          .location-main {
            align-items:
              flex-start;

            flex-direction:
              column;

            gap: 4px;
          }

          .machine-help {
            grid-template-columns:
              1fr;
          }
        }

      `}</style>
    </div>
  );
}