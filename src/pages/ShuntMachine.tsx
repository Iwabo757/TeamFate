import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import monsters from "../data/monsters.json";

/* =========================================================
   TYPES
========================================================= */

type Season =
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter";

type Monster = {
  id?: number;
  name?: string;
  species?: string;

  sprite?: string;
  shinySprite?: string;
  shiny_sprite?: string;

  locations?: MonsterLocation[];
};

type MonsterLocation = {
  season?: Season | string;

  region?: string;

  location?: string;
  location_name?: string;
  location_name_full?: string;

  route?: string;

  method?: string;

  levels?: string | number;

  morning?: string | number;
  day?: string | number;
  night?: string | number;

  [key: string]: unknown;
};

type ReelMonster = Monster & {
  _key: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const SEASONS: Season[] = [
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
];

const SEASON_ICONS: Record<Season, string> = {
  Spring: "🌸",
  Summer: "☀️",
  Autumn: "🍂",
  Winter: "❄️",
};

const REEL_LENGTH = 9;

const SPIN_TIME = 2600;

/* =========================================================
   HELPERS
========================================================= */

function getMonsterName(monster: Monster): string {
  return (
    monster.name ||
    monster.species ||
    "Unknown Pokémon"
  );
}

function getMonsterId(monster: Monster): number | null {
  if (
    typeof monster.id === "number" &&
    Number.isFinite(monster.id)
  ) {
    return monster.id;
  }

  return null;
}

function getShinySprite(monster: Monster): string {
  if (monster.shinySprite) {
    return monster.shinySprite;
  }

  if (monster.shiny_sprite) {
    return monster.shiny_sprite;
  }

  const id = getMonsterId(monster);

  if (id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
  }

  if (monster.sprite) {
    return monster.sprite;
  }

  return "";
}

function getLocationName(
  location: MonsterLocation
): string {
  return (
    location.location_name ||
    location.location_name_full ||
    location.location ||
    location.route ||
    "Unknown Location"
  );
}

function getLocationRegion(
  location: MonsterLocation
): string {
  return (
    location.region ||
    "Unknown Region"
  );
}

function getLocationSeason(
  location: MonsterLocation
): string {
  return String(
    location.season || ""
  ).trim();
}

function normalizeMonsters(): Monster[] {
  if (!Array.isArray(monsters)) {
    return [];
  }

  return monsters as Monster[];
}

function getSeasonLocations(
  monster: Monster,
  season: Season
): MonsterLocation[] {
  if (!Array.isArray(monster.locations)) {
    return [];
  }

  return monster.locations.filter(
    (location) =>
      getLocationSeason(location).toLowerCase() ===
      season.toLowerCase() &&
      Boolean(getLocationName(location))
  );
}

function hasSeasonLocation(
  monster: Monster,
  season: Season
): boolean {
  return (
    getSeasonLocations(
      monster,
      season
    ).length > 0
  );
}

function randomItem<T>(
  array: T[]
): T | null {
  if (!array.length) {
    return null;
  }

  return array[
    Math.floor(
      Math.random() * array.length
    )
  ];
}

function buildReel(
  pool: Monster[],
  length: number
): ReelMonster[] {
  if (!pool.length) {
    return [];
  }

  return Array.from(
    { length },
    (_, index) => {
      const monster =
        pool[
          Math.floor(
            Math.random() * pool.length
          )
        ];

      return {
        ...monster,
        _key: `${getMonsterName(
          monster
        )}-${index}-${Math.random()}`,
      };
    }
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ShuntMachine() {
  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const allMonsters = useMemo(
    () => normalizeMonsters(),
    []
  );

  /* -------------------------------------------------------
     SEASON
  ------------------------------------------------------- */

  const [
    selectedSeason,
    setSelectedSeason,
  ] = useState<Season>("Spring");

  /* -------------------------------------------------------
     SHUNTABLE POOL
  ------------------------------------------------------- */

  const shuntablePokemon = useMemo(() => {
    return allMonsters.filter(
      (monster) =>
        hasSeasonLocation(
          monster,
          selectedSeason
        )
    );
  }, [
    allMonsters,
    selectedSeason,
  ]);

  /* -------------------------------------------------------
     REELS
  ------------------------------------------------------- */

  const [
    reelPokemon,
    setReelPokemon,
  ] = useState<ReelMonster[][]>([
    [],
    [],
    [],
  ]);

  /* -------------------------------------------------------
     MACHINE STATE
  ------------------------------------------------------- */

  const [
    spinning,
    setSpinning,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState<Monster | null>(null);

  const [
    showReveal,
    setShowReveal,
  ] = useState(false);

  const [
    reelStopped,
    setReelStopped,
  ] = useState<boolean[]>([
    true,
    true,
    true,
  ]);

  const spinTimeout =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  /* -------------------------------------------------------
     BUILD INITIAL REELS
  ------------------------------------------------------- */

  useEffect(() => {
    if (!shuntablePokemon.length) {
      setReelPokemon([
        [],
        [],
        [],
      ]);

      setResult(null);

      return;
    }

    setReelPokemon([
      buildReel(
        shuntablePokemon,
        REEL_LENGTH
      ),
      buildReel(
        shuntablePokemon,
        REEL_LENGTH
      ),
      buildReel(
        shuntablePokemon,
        REEL_LENGTH
      ),
    ]);

    setResult(null);
    setShowReveal(false);

    setReelStopped([
      true,
      true,
      true,
    ]);
  }, [
    shuntablePokemon,
  ]);

  /* -------------------------------------------------------
     CLEANUP
  ------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (spinTimeout.current) {
        clearTimeout(
          spinTimeout.current
        );
      }
    };
  }, []);

  /* =========================================================
     SHUNT
  ========================================================= */

  function shunt() {
    if (spinning) {
      return;
    }

    if (!shuntablePokemon.length) {
      return;
    }

    const selected =
      randomItem(
        shuntablePokemon
      );

    if (!selected) {
      return;
    }

    setResult(null);
    setShowReveal(false);

    setSpinning(true);

    setReelStopped([
      false,
      false,
      false,
    ]);

    /*
     * Create spinning reels.
     *
     * The selected Pokémon is inserted into
     * the center position of every reel.
     */
    const newReels =
      Array.from(
        { length: 3 },
        () => {
          const reel =
            buildReel(
              shuntablePokemon,
              REEL_LENGTH
            );

          /*
           * Center index.
           *
           * With 9 entries:
           * 0 1 2 3 [4] 5 6 7 8
           */
          reel[4] = {
            ...selected,
            _key: `winner-${Math.random()}`,
          };

          return reel;
        }
      );

    setReelPokemon(
      newReels
    );

    /*
     * Stop reels one after another.
     */
    setTimeout(() => {
      setReelStopped([
        false,
        true,
        true,
      ]);
    }, 900);

    setTimeout(() => {
      setReelStopped([
        false,
        false,
        true,
      ]);
    }, 1450);

    setTimeout(() => {
      setReelStopped([
        true,
        true,
        true,
      ]);
    }, SPIN_TIME - 300);

    /*
     * Final result.
     */
    spinTimeout.current =
      setTimeout(() => {
        setSpinning(false);

        setReelStopped([
          true,
          true,
          true,
        ]);

        setResult(
          selected
        );

        /*
         * Small delay before the reveal
         * for the machine feel.
         */
        setTimeout(() => {
          setShowReveal(true);
        }, 200);
      }, SPIN_TIME);
  }

  /* =========================================================
     SEASON CHANGE
  ========================================================= */

  function changeSeason(
    season: Season
  ) {
    if (spinning) {
      return;
    }

    setSelectedSeason(
      season
    );

    setResult(null);
    setShowReveal(false);

    setReelStopped([
      true,
      true,
      true,
    ]);
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="shunt-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="shunt-header">

        <div className="shunt-header-icon">
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

      {/* =====================================================
          SEASON FILTER
      ===================================================== */}

      <div className="season-filter">

        <div className="season-filter-label">
          HUNT SEASON
        </div>

        <div className="season-buttons">

          {SEASONS.map(
            (season) => (
              <button
                key={season}
                type="button"
                disabled={spinning}
                className={
                  selectedSeason ===
                  season
                    ? "season-button active"
                    : "season-button"
                }
                onClick={() =>
                  changeSeason(
                    season
                  )
                }
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

      </div>

      {/* =====================================================
          CURRENT SEASON
      ===================================================== */}

      <div className="current-season">

        {
          SEASON_ICONS[
            selectedSeason
          ]
        }

        <span>
          {selectedSeason} Hunts
        </span>

        <strong>
          {shuntablePokemon.length}
        </strong>

        <span>
          available
        </span>

      </div>

      {/* =====================================================
          MACHINE
      ===================================================== */}

      <div
        className={
          spinning
            ? "machine spinning"
            : "machine"
        }
      >

        <div className="machine-top">

          <div className="machine-title">
            FATE'S
          </div>

          <div className="machine-title-large">
            SHUNT
          </div>

        </div>

        {/* ---------------------------------------------------
            REELS
        --------------------------------------------------- */}

        <div className="reels">

          {reelPokemon.map(
            (reel, reelIndex) => {

              const stopped =
                reelStopped[
                  reelIndex
                ];

              return (
                <div
                  key={
                    `reel-${reelIndex}`
                  }
                  className={
                    stopped
                      ? "reel stopped"
                      : "reel"
                  }
                >

                  <div className="reel-window">

                    {reel.map(
                      (
                        pokemon,
                        index
                      ) => {

                        const sprite =
                          getShinySprite(
                            pokemon
                          );

                        const isCenter =
                          index === 4;

                        return (
                          <div
                            key={
                              pokemon._key
                            }
                            className={
                              isCenter
                                ? "reel-item center"
                                : "reel-item"
                            }
                          >

                            {sprite ? (
                              <img
                                src={
                                  sprite
                                }
                                alt={getMonsterName(
                                  pokemon
                                )}
                                draggable={
                                  false
                                }
                              />
                            ) : (
                              <div className="missing-sprite">
                                ?
                              </div>
                            )}

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>
              );
            }
          )}

          {/* CENTER SELECTION WINDOW */}

          <div className="selection-window">
            <div className="selection-arrow left">
              ▶
            </div>

            <div className="selection-arrow right">
              ◀
            </div>
          </div>

        </div>

        {/* ---------------------------------------------------
            MACHINE BUTTON
        --------------------------------------------------- */}

        <button
          type="button"
          className={
            spinning
              ? "shunt-button spinning-button"
              : "shunt-button"
          }
          disabled={
            spinning ||
            !shuntablePokemon.length
          }
          onClick={
            shunt
          }
        >

          {spinning
            ? "SHUNTING..."
            : result
              ? "SHUNT AGAIN"
              : "SHUNT"}

        </button>

      </div>

      {/* =====================================================
          NO DATA
      ===================================================== */}

      {!shuntablePokemon.length && (
        <div className="no-results">

          <div className="no-results-icon">
            ⚠️
          </div>

          <h2>
            NO HUNTS AVAILABLE
          </h2>

          <p>
            No Pokémon in the database have
            a location for{" "}
            <strong>
              {selectedSeason}
            </strong>
            .
          </p>

        </div>
      )}

      {/* =====================================================
          RESULT
      ===================================================== */}

      {result && showReveal && (
        <div className="result-section">

          <div className="result-label">
            FATE HAS CHOSEN
          </div>

          <div className="result-card">

            <div className="result-number">

              #
              {String(
                getMonsterId(
                  result
                ) || "???"
              ).padStart(
                3,
                "0"
              )}

            </div>

            <div className="result-sprite">

              {getShinySprite(
                result
              ) ? (
                <img
                  src={getShinySprite(
                    result
                  )}
                  alt={getMonsterName(
                    result
                  )}
                  draggable={
                    false
                  }
                />
              ) : (
                <div className="result-missing">
                  ?
                </div>
              )}

            </div>

            <h2>
              {getMonsterName(
                result
              )}
            </h2>

            <div className="result-subtitle">
              Your next shiny hunt
            </div>

          </div>

          {/* =================================================
              LOCATIONS
          ================================================= */}

          <div className="locations-section">

            <div className="locations-title">
              <span>
                📍
              </span>

              {selectedSeason} Hunt
              Locations
            </div>

            <div className="locations-grid">

              {getSeasonLocations(
                result,
                selectedSeason
              ).map(
                (
                  location,
                  index
                ) => (
                  <div
                    className="location-card"
                    key={`${getLocationName(
                      location
                    )}-${index}`}
                  >

                    <div className="location-region">
                      {getLocationRegion(
                        location
                      )}
                    </div>

                    <div className="location-name">
                      {getLocationName(
                        location
                      )}
                    </div>

                    {location.method && (
                      <div className="location-detail">
                        <span>
                          Method
                        </span>

                        <strong>
                          {
                            String(
                              location.method
                            )
                          }
                        </strong>
                      </div>
                    )}

                    {location.levels && (
                      <div className="location-detail">
                        <span>
                          Levels
                        </span>

                        <strong>
                          {
                            String(
                              location.levels
                            )
                          }
                        </strong>
                      </div>
                    )}

                    <div className="time-grid">

                      {location.morning && (
                        <div>
                          <span>
                            🌅
                          </span>

                          <strong>
                            {
                              String(
                                location.morning
                              )
                            }
                          </strong>
                        </div>
                      )}

                      {location.day && (
                        <div>
                          <span>
                            ☀️
                          </span>

                          <strong>
                            {
                              String(
                                location.day
                              )
                            }
                          </strong>
                        </div>
                      )}

                      {location.night && (
                        <div>
                          <span>
                            🌙
                          </span>

                          <strong>
                            {
                              String(
                                location.night
                              )
                            }
                          </strong>
                        </div>
                      )}

                    </div>

                  </div>
                )
              )}

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="shunt-footer">

        <span>
          {SEASON_ICONS[
            selectedSeason
          ]}
        </span>

        Only Pokémon with a valid{" "}
        {selectedSeason.toLowerCase()}{" "}
        hunt location can be selected.

      </div>

      {/* =====================================================
          STYLES
      ===================================================== */}

      <style>{`

        /* ===================================================
           PAGE
        =================================================== */

        .shunt-page {
          min-height: 100vh;

          padding:
            70px
            30px
            100px;

          color: #dcecff;

          background:
            radial-gradient(
              circle at 50% 25%,
              rgba(20, 78, 124, 0.28),
              transparent 45%
            );

          box-sizing: border-box;
        }

        /* ===================================================
           HEADER
        =================================================== */

        .shunt-header {
          text-align: center;

          margin:
            0 auto
            30px;

          max-width: 800px;
        }

        .shunt-header-icon {
          font-size: 35px;

          margin-bottom: 5px;
        }

        .shunt-header h1 {
          margin: 0;

          color: #eaf6ff;

          font-size: 42px;
          font-weight: 900;

          letter-spacing: 3px;

          text-shadow:
            0 0 20px
            rgba(88, 186, 255, 0.35);
        }

        .shunt-header p {
          margin:
            10px 0 0;

          color: #8ea9c4;

          font-size: 16px;
        }

        /* ===================================================
           SEASON FILTER
        =================================================== */

        .season-filter {
          display: flex;

          flex-direction: column;

          align-items: center;

          margin:
            0 auto
            28px;
        }

        .season-filter-label {
          margin-bottom: 10px;

          color: #8ea9c4;

          font-size: 11px;
          font-weight: 900;

          letter-spacing: 2px;
        }

        .season-buttons {
          display: flex;

          gap: 8px;

          padding: 5px;

          border:
            1px solid
            rgba(
              72,
              135,
              194,
              0.4
            );

          border-radius: 13px;

          background:
            rgba(
              3,
              20,
              39,
              0.78
            );

          box-shadow:
            0 8px 30px
            rgba(
              0,
              0,
              0,
              0.15
            );
        }

        .season-button {
          min-width: 120px;

          padding:
            11px
            18px;

          border:
            1px solid
            transparent;

          border-radius: 9px;

          color: #9db6ce;

          background:
            transparent;

          font-size: 13px;
          font-weight: 900;

          cursor: pointer;

          transition:
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease,
            transform 0.15s ease;
        }

        .season-button:hover:not(:disabled) {
          color: #ffffff;

          background:
            rgba(
              50,
              103,
              151,
              0.28
            );
        }

        .season-button.active {
          color: #ffffff;

          border-color:
            rgba(
              111,
              201,
              255,
              0.75
            );

          background:
            linear-gradient(
              180deg,
              rgba(
                55,
                126,
                181,
                0.8
              ),
              rgba(
                28,
                75,
                117,
                0.8
              )
            );

          box-shadow:
            0 0 18px
            rgba(
              74,
              177,
              255,
              0.18
            );
        }

        .season-button:disabled {
          opacity: 0.5;

          cursor: not-allowed;
        }

        .season-icon {
          margin-right: 6px;
        }

        /* ===================================================
           CURRENT SEASON
        =================================================== */

        .current-season {
          display: flex;

          align-items: center;
          justify-content: center;

          gap: 7px;

          margin-bottom: 22px;

          color: #8ea9c4;

          font-size: 13px;
        }

        .current-season strong {
          color: #8bd1ff;

          font-size: 15px;
        }

        /* ===================================================
           MACHINE
        =================================================== */

        .machine {
          position: relative;

          width: min(
            900px,
            100%
          );

          margin:
            0 auto;

          padding:
            32px
            32px
            40px;

          box-sizing: border-box;

          border:
            1px solid
            rgba(
              79,
              155,
              216,
              0.55
            );

          border-radius: 24px;

          background:
            linear-gradient(
              180deg,
              rgba(
                8,
                31,
                57,
                0.96
              ),
              rgba(
                2,
                15,
                29,
                0.98
              )
            );

          box-shadow:
            0 30px 70px
            rgba(
              0,
              0,
              0,
              0.4
            ),
            inset 0 1px 0
            rgba(
              255,
              255,
              255,
              0.04
            );
        }

        .machine.spinning {
          box-shadow:
            0 30px 70px
            rgba(
              0,
              0,
              0,
              0.4
            ),
            0 0 45px
            rgba(
              60,
              170,
              255,
              0.12
            );
        }

        .machine-top {
          text-align: center;

          margin-bottom: 25px;
        }

        .machine-title {
          color: #8db9dc;

          font-size: 12px;
          font-weight: 900;

          letter-spacing: 5px;
        }

        .machine-title-large {
          margin-top: 3px;

          color: #edf8ff;

          font-size: 30px;
          font-weight: 900;

          letter-spacing: 5px;
        }

        /* ===================================================
           REELS
        =================================================== */

        .reels {
          position: relative;

          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 12px;

          height: 390px;

          overflow: hidden;

          padding:
            15px;

          box-sizing: border-box;

          border:
            1px solid
            rgba(
              86,
              157,
              211,
              0.4
            );

          border-radius: 16px;

          background:
            rgba(
              0,
              9,
              20,
              0.8
            );
        }

        .reel {
          position: relative;

          overflow: hidden;

          border:
            1px solid
            rgba(
              78,
              145,
              199,
              0.4
            );

          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              rgba(
                18,
                49,
                76,
                0.5
              ),
              rgba(
                1,
                13,
                26,
                0.95
              )
            );
        }

        .reel-window {
          display: flex;

          flex-direction: column;

          align-items: center;

          transform:
            translateY(
              -4px
            );
        }

        .reel:not(.stopped)
          .reel-window {
          animation:
            reelSpin
            0.18s
            linear
            infinite;
          filter:
            blur(1.5px);
        }

        .reel-item {
          flex:
            0 0
            80px;

          width: 100%;

          display: flex;

          align-items: center;
          justify-content: center;
        }

        .reel-item img {
          width: 70px;
          height: 70px;

          object-fit: contain;

          image-rendering:
            pixelated;
        }

        .reel-item.center {
          transform:
            scale(1.15);
        }

        .selection-window {
          position: absolute;

          top: 50%;

          left: 15px;
          right: 15px;

          height: 82px;

          transform:
            translateY(
              -50%
            );

          border:
            2px solid
            rgba(
              111,
              205,
              255,
              0.85
            );

          border-radius: 12px;

          pointer-events: none;

          box-shadow:
            0 0 25px
            rgba(
              80,
              185,
              255,
              0.12
            ),
            inset 0 0 20px
            rgba(
              80,
              185,
              255,
              0.06
            );
        }

        .selection-arrow {
          position: absolute;

          top: 50%;

          transform:
            translateY(
              -50%
            );

          color: #9edaff;

          font-size: 14px;
        }

        .selection-arrow.left {
          left: 8px;
        }

        .selection-arrow.right {
          right: 8px;
        }

        /* ===================================================
           BUTTON
        =================================================== */

        .shunt-button {
          display: block;

          margin:
            28px auto
            0;

          min-width: 230px;

          padding:
            15px
            30px;

          border:
            1px solid
            rgba(
              120,
              211,
              255,
              0.75
            );

          border-radius: 10px;

          color: #ffffff;

          background:
            linear-gradient(
              180deg,
              #236995,
              #16486d
            );

          font-size: 15px;
          font-weight: 900;

          letter-spacing: 2px;

          cursor: pointer;

          box-shadow:
            0 8px 25px
            rgba(
              0,
              0,
              0,
              0.25
            );

          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .shunt-button:hover:not(:disabled) {
          transform:
            translateY(-2px);

          box-shadow:
            0 12px 30px
            rgba(
              0,
              0,
              0,
              0.35
            );
        }

        .shunt-button:disabled {
          opacity: 0.55;

          cursor: not-allowed;
        }

        .spinning-button {
          animation:
            buttonPulse
            0.8s
            ease-in-out
            infinite;
        }

        /* ===================================================
           RESULT
        =================================================== */

        .result-section {
          width: min(
            900px,
            100%
          );

          margin:
            45px auto
            0;

          text-align: center;
        }

        .result-label {
          margin-bottom: 12px;

          color: #79caff;

          font-size: 12px;
          font-weight: 900;

          letter-spacing: 4px;
        }

        .result-card {
          padding:
            35px
            20px;

          border:
            1px solid
            rgba(
              93,
              180,
              236,
              0.5
            );

          border-radius: 20px;

          background:
            linear-gradient(
              180deg,
              rgba(
                9,
                36,
                63,
                0.92
              ),
              rgba(
                3,
                19,
                34,
                0.96
              )
            );

          box-shadow:
            0 20px 50px
            rgba(
              0,
              0,
              0,
              0.3
            ),
            0 0 40px
            rgba(
              78,
              190,
              255,
              0.08
            );

          animation:
            reveal
            0.45s
            ease-out;
        }

        .result-number {
          color: #6ca8d0;

          font-size: 13px;
          font-weight: 900;

          letter-spacing: 2px;
        }

        .result-sprite {
          min-height: 180px;

          display: flex;

          align-items: center;
          justify-content: center;
        }

        .result-sprite img {
          width: 180px;
          height: 180px;

          object-fit: contain;

          image-rendering:
            pixelated;

          filter:
            drop-shadow(
              0 10px 25px
              rgba(
                0,
                0,
                0,
                0.35
              )
            );
        }

        .result-card h2 {
          margin:
            5px 0;

          color: #f0f8ff;

          font-size: 32px;
          font-weight: 900;

          text-transform:
            capitalize;
        }

        .result-subtitle {
          color: #7f9db8;

          font-size: 14px;
        }

        /* ===================================================
           LOCATIONS
        =================================================== */

        .locations-section {
          margin-top: 25px;

          text-align: left;
        }

        .locations-title {
          margin-bottom: 12px;

          color: #a9d9fa;

          font-size: 16px;
          font-weight: 900;
        }

        .locations-title span {
          margin-right: 7px;
        }

        .locations-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                240px,
                1fr
              )
            );

          gap: 10px;
        }

        .location-card {
          padding: 17px;

          border:
            1px solid
            rgba(
              74,
              135,
              181,
              0.4
            );

          border-radius: 12px;

          background:
            rgba(
              5,
              27,
              48,
              0.72
            );
        }

        .location-region {
          color: #6ebfff;

          font-size: 10px;
          font-weight: 900;

          letter-spacing: 2px;

          text-transform:
            uppercase;
        }

        .location-name {
          margin-top: 5px;

          color: #e5f3ff;

          font-size: 16px;
          font-weight: 900;
        }

        .location-detail {
          display: flex;

          justify-content:
            space-between;

          gap: 10px;

          margin-top: 10px;

          color: #7895ae;

          font-size: 12px;
        }

        .location-detail strong {
          color: #b9d9ee;
        }

        .time-grid {
          display: flex;

          gap: 12px;

          margin-top: 12px;

          padding-top: 10px;

          border-top:
            1px solid
            rgba(
              93,
              145,
              182,
              0.2
            );
        }

        .time-grid div {
          display: flex;

          align-items: center;

          gap: 4px;

          color: #9cb9d0;

          font-size: 11px;
        }

        /* ===================================================
           NO RESULTS
        =================================================== */

        .no-results {
          width: min(
            700px,
            100%
          );

          margin:
            40px auto;

          padding: 30px;

          text-align: center;

          border:
            1px solid
            rgba(
              217,
              153,
              73,
              0.4
            );

          border-radius: 15px;

          background:
            rgba(
              40,
              25,
              10,
              0.45
            );
        }

        .no-results-icon {
          font-size: 30px;
        }

        .no-results h2 {
          color: #e7f2ff;

          font-size: 18px;
        }

        .no-results p {
          color: #8ba3b8;
        }

        /* ===================================================
           FOOTER
        =================================================== */

        .shunt-footer {
          margin:
            25px auto
            0;

          max-width: 700px;

          text-align: center;

          color: #617d96;

          font-size: 12px;
        }

        .shunt-footer span {
          margin-right: 5px;
        }

        /* ===================================================
           ANIMATIONS
        =================================================== */

        @keyframes reelSpin {
          0% {
            transform:
              translateY(
                -4px
              );
          }

          100% {
            transform:
              translateY(
                -84px
              );
          }
        }

        @keyframes buttonPulse {
          0%,
          100% {
            box-shadow:
              0 8px 25px
              rgba(
                0,
                0,
                0,
                0.25
              );
          }

          50% {
            box-shadow:
              0 8px 30px
              rgba(
                70,
                180,
                255,
                0.25
              );
          }
        }

        @keyframes reveal {
          from {
            opacity: 0;

            transform:
              translateY(
                15px
              )
              scale(
                0.96
              );
          }

          to {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }

        /* ===================================================
           MOBILE
        =================================================== */

        @media (max-width: 700px) {

          .shunt-page {
            padding:
              45px
              15px
              70px;
          }

          .shunt-header h1 {
            font-size: 30px;
          }

          .season-buttons {
            width: 100%;

            display: grid;

            grid-template-columns:
              repeat(2, 1fr);
          }

          .season-button {
            min-width: 0;

            width: 100%;
          }

          .machine {
            padding:
              20px
              15px
              25px;
          }

          .reels {
            height: 300px;

            gap: 6px;

            padding: 8px;
          }

          .reel-item {
            flex-basis: 65px;
          }

          .reel-item img {
            width: 55px;
            height: 55px;
          }

          .selection-window {
            left: 8px;
            right: 8px;

            height: 67px;
          }

          .result-sprite img {
            width: 140px;
            height: 140px;
          }

          .result-card h2 {
            font-size: 25px;
          }

        }

      `}</style>

    </div>
  );
}