import { useMemo, useRef, useState } from "react";
import monsters from "../data/monsters.json";

type Season = "Spring" | "Summer" | "Autumn" | "Winter";

type Monster = {
  id?: number | string;
  dex?: number | string;
  number?: number | string;
  name?: string;
  pokemon?: string;
  species?: string;

  sprite?: string;
  image?: string;
  gif?: string;
  shinyGif?: string;
  shiny_gif?: string;
  shinySprite?: string;
  shiny_sprite?: string;

  locations?: unknown;
  location?: unknown;
  wildLocations?: unknown;
  wild_locations?: unknown;

  [key: string]: unknown;
};

type LocationEntry = {
  location: string;
  season?: string;
};

const allMonsters = monsters as unknown as Monster[];

const SEASONS: Season[] = [
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
];

const FALLBACK_SHINY_GIF =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/";

function getPokemonId(pokemon: Monster): number | null {
  const value = pokemon.id ?? pokemon.dex ?? pokemon.number;

  const id = Number(value);

  if (Number.isFinite(id) && id > 0) {
    return id;
  }

  return null;
}

function getPokemonName(pokemon: Monster): string {
  return String(
    pokemon.name ??
      pokemon.pokemon ??
      pokemon.species ??
      "Unknown Pokémon"
  );
}

function getShinyGif(pokemon: Monster): string {
  const directGif =
    pokemon.shinyGif ??
    pokemon.shiny_gif ??
    pokemon.gif ??
    pokemon.shinySprite ??
    pokemon.shiny_sprite;

  if (typeof directGif === "string" && directGif.trim()) {
    return directGif;
  }

  const id = getPokemonId(pokemon);

  if (id) {
    return `${FALLBACK_SHINY_GIF}${id}.gif`;
  }

  return "";
}

/*
 * Pull location information from the monster JSON.
 *
 * This intentionally supports several common structures so the
 * Shunt Machine does not depend on one exact location property name.
 */
function extractLocations(pokemon: Monster): LocationEntry[] {
  const possibleSources = [
    pokemon.locations,
    pokemon.location,
    pokemon.wildLocations,
    pokemon.wild_locations,
  ];

  const results: LocationEntry[] = [];

  function walk(value: unknown, inheritedSeason?: string): void {
    if (value == null) {
      return;
    }

    if (typeof value === "string") {
      const text = value.trim();

      if (text) {
        results.push({
          location: text,
          season: inheritedSeason,
        });
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, inheritedSeason));
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const object = value as Record<string, unknown>;

    const seasonValue =
      object.season ??
      object.Season ??
      object.seasons ??
      object.Seasons;

    let currentSeason = inheritedSeason;

    if (typeof seasonValue === "string") {
      currentSeason = seasonValue;
    }

    if (Array.isArray(seasonValue)) {
      const seasonStrings = seasonValue.filter(
        (item): item is string => typeof item === "string"
      );

      if (seasonStrings.length > 0) {
        seasonStrings.forEach((season) => {
          const locationValue =
            object.location ??
            object.Location ??
            object.route ??
            object.Route ??
            object.area ??
            object.Area ??
            object.name ??
            object.Name;

          if (typeof locationValue === "string") {
            results.push({
              location: locationValue,
              season,
            });
          }
        });

        return;
      }
    }

    const locationValue =
      object.location ??
      object.Location ??
      object.route ??
      object.Route ??
      object.area ??
      object.Area;

    if (typeof locationValue === "string") {
      results.push({
        location: locationValue,
        season: currentSeason,
      });

      return;
    }

    Object.entries(object).forEach(([key, child]) => {
      /*
       * Don't treat arbitrary scalar fields as locations.
       */
      if (
        typeof child === "string" &&
        ![
          "name",
          "pokemon",
          "species",
          "method",
          "type",
          "region",
          "season",
        ].includes(key.toLowerCase())
      ) {
        return;
      }

      walk(child, currentSeason);
    });
  }

  possibleSources.forEach((source) => walk(source));

  const unique = new Map<string, LocationEntry>();

  results.forEach((entry) => {
    const location = entry.location.trim();

    if (!location) {
      return;
    }

    const key = `${location.toLowerCase()}|${entry.season ?? ""}`;

    if (!unique.has(key)) {
      unique.set(key, {
        location,
        season: entry.season,
      });
    }
  });

  return [...unique.values()];
}

function locationMatchesSeason(
  entry: LocationEntry,
  season: Season
): boolean {
  if (!entry.season) {
    return true;
  }

  return entry.season.toLowerCase() === season.toLowerCase();
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function getUniqueLocations(
  pokemon: Monster,
  season: Season
): string[] {
  const locations = extractLocations(pokemon)
    .filter((entry) => locationMatchesSeason(entry, season))
    .map((entry) => entry.location);

  return [...new Set(locations)];
}

function playMachineSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(180, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      70,
      context.currentTime + 0.08
    );

    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + 0.1
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
  } catch {
    // Audio is optional.
  }
}

export default function ShuntMachine() {
  const [selectedSeason, setSelectedSeason] =
    useState<Season>("Spring");

  const [isSpinning, setIsSpinning] = useState(false);

  const [selectedPokemon, setSelectedPokemon] =
    useState<Monster | null>(null);

  const [reels, setReels] = useState<Monster[][]>([
    [],
    [],
    [],
  ]);

  const [spinKey, setSpinKey] = useState(0);

  const spinTimeout = useRef<number | null>(null);

  /*
   * Only Pokémon that actually have location information
   * can enter the Shunt Machine.
   */
  const huntablePokemon = useMemo(() => {
    return allMonsters.filter((pokemon) => {
      const locations = getUniqueLocations(
        pokemon,
        selectedSeason
      );

      return locations.length > 0;
    });
  }, [selectedSeason]);

  /*
   * Create a visual reel around a center Pokémon.
   *
   * IMPORTANT:
   * index 2 is ALWAYS the actual center selection.
   *
   * All three reels receive the same center Pokémon.
   */
  function buildReel(
    centerPokemon: Monster,
    pool: Monster[]
  ): Monster[] {
    if (pool.length === 0) {
      return [centerPokemon, centerPokemon, centerPokemon];
    }

    const shuffled = shuffle(
      pool.filter((pokemon) => pokemon !== centerPokemon)
    );

    const before = shuffled.slice(0, 2);

    while (before.length < 2) {
      before.push(centerPokemon);
    }

    const after = shuffled.slice(2, 4);

    while (after.length < 2) {
      after.push(centerPokemon);
    }

    return [
      before[0],
      before[1],
      centerPokemon,
      after[0],
      after[1],
    ];
  }

  /*
   * Build an initial display so the machine is not empty.
   */
  useMemo(() => {
    if (
      reels[0].length === 0 &&
      huntablePokemon.length > 0 &&
      !selectedPokemon
    ) {
      const first =
        huntablePokemon[
          Math.floor(Math.random() * huntablePokemon.length)
        ];

      setReels([
        buildReel(first, huntablePokemon),
        buildReel(first, huntablePokemon),
        buildReel(first, huntablePokemon),
      ]);
    }
  }, [huntablePokemon]);

  function resetMachine() {
    if (spinTimeout.current) {
      window.clearTimeout(spinTimeout.current);
      spinTimeout.current = null;
    }

    setIsSpinning(false);
    setSelectedPokemon(null);
    setSpinKey((value) => value + 1);

    if (huntablePokemon.length > 0) {
      const next =
        huntablePokemon[
          Math.floor(Math.random() * huntablePokemon.length)
        ];

      setReels([
        buildReel(next, huntablePokemon),
        buildReel(next, huntablePokemon),
        buildReel(next, huntablePokemon),
      ]);
    }
  }

  function spinMachine() {
    if (isSpinning || huntablePokemon.length === 0) {
      return;
    }

    playMachineSound();

    setSelectedPokemon(null);
    setIsSpinning(true);
    setSpinKey((value) => value + 1);

    /*
     * THIS is the one and only Pokémon selected for the spin.
     *
     * The same object is inserted into the center of all
     * three reels.
     */
    const winner =
      huntablePokemon[
        Math.floor(Math.random() * huntablePokemon.length)
      ];

    const temporaryPool = shuffle(huntablePokemon);

    const animatedReels: Monster[][] = [
      [
        ...temporaryPool.slice(0, 8),
        winner,
        ...temporaryPool.slice(8, 14),
      ],
      [
        ...shuffle(huntablePokemon).slice(0, 10),
        winner,
        ...shuffle(huntablePokemon).slice(10, 17),
      ],
      [
        ...shuffle(huntablePokemon).slice(0, 12),
        winner,
        ...shuffle(huntablePokemon).slice(12, 20),
      ],
    ];

    setReels(animatedReels);

    /*
     * Give the reels enough time to visually slow down.
     */
    spinTimeout.current = window.setTimeout(() => {
      /*
       * Final state:
       *
       * CENTER = winner
       * CENTER = winner
       * CENTER = winner
       *
       * The reveal below therefore can NEVER disagree
       * with the Pokémon shown in the middle row.
       */
      setReels([
        buildReel(winner, huntablePokemon),
        buildReel(winner, huntablePokemon),
        buildReel(winner, huntablePokemon),
      ]);

      setSelectedPokemon(winner);
      setIsSpinning(false);

      spinTimeout.current = null;
    }, 3000);
  }

  const selectedLocations = selectedPokemon
    ? getUniqueLocations(
        selectedPokemon,
        selectedSeason
      )
    : [];

  const selectedId = selectedPokemon
    ? getPokemonId(selectedPokemon)
    : null;

  return (
    <div
      className="shunt-machine-page"
      style={{
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        padding: "24px 16px 60px",
        color: "#dcecff",
        background:
          "radial-gradient(circle at 50% 35%, rgba(20,90,150,.18), transparent 45%)",
      }}
    >
      <style>
        {`
          .shunt-machine-page {
            overflow-x: hidden;
          }

          .shunt-wrapper {
            width: min(960px, 100%);
            margin: 0 auto;
          }

          .shunt-title {
            text-align: center;
            font-size: clamp(24px, 4vw, 42px);
            font-weight: 900;
            letter-spacing: 5px;
            margin: 10px 0 8px;
          }

          .shunt-subtitle {
            text-align: center;
            opacity: .75;
            margin-bottom: 22px;
            font-size: 15px;
          }

          .season-row {
            display: flex;
            justify-content: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 22px;
          }

          .season-button {
            border: 1px solid rgba(100,190,255,.45);
            background: rgba(5,25,55,.75);
            color: #cfe8ff;
            border-radius: 12px;
            padding: 10px 18px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 800;
            transition: .2s ease;
          }

          .season-button:hover {
            transform: translateY(-1px);
            border-color: #70c9ff;
          }

          .season-button.active {
            background: linear-gradient(
              180deg,
              rgba(50,130,220,.85),
              rgba(20,75,145,.9)
            );
            border-color: #7bd2ff;
            box-shadow:
              0 0 18px rgba(80,190,255,.2),
              inset 0 0 12px rgba(120,210,255,.12);
          }

          .machine {
            width: min(820px, 100%);
            margin: 0 auto;
            border: 1px solid rgba(90,180,255,.55);
            border-radius: 24px;
            padding: clamp(12px, 3vw, 24px);
            background:
              linear-gradient(
                180deg,
                rgba(4,25,53,.94),
                rgba(2,14,31,.96)
              );
            box-shadow:
              0 0 35px rgba(0,100,180,.15),
              inset 0 0 30px rgba(0,80,150,.08);
            box-sizing: border-box;
          }

          .machine-header {
            text-align: center;
            margin-bottom: 14px;
          }

          .machine-label {
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 4px;
            color: #77caff;
          }

          .machine-season {
            font-size: 12px;
            opacity: .6;
            margin-top: 4px;
          }

          .reels {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            width: 100%;
            border: 1px solid rgba(100,180,255,.4);
            border-radius: 18px;
            overflow: hidden;
            background: rgba(1,13,29,.88);
          }

          .reel {
            position: relative;
            height: 330px;
            min-width: 0;
            overflow: hidden;
            border-right: 1px solid rgba(100,180,255,.25);
          }

          .reel:last-child {
            border-right: none;
          }

          .reel-track {
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translateY(0);
          }

          .reel-item {
            height: 66px;
            width: 100%;
            flex: 0 0 66px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }

          .reel-item img {
            width: 52px;
            height: 52px;
            object-fit: contain;
            image-rendering: pixelated;
          }

          .reel-item.center img {
            width: 64px;
            height: 64px;
          }

          .center-window {
            position: absolute;
            left: 0;
            right: 0;
            top: 132px;
            height: 66px;
            border-top: 2px solid #67c8ff;
            border-bottom: 2px solid #67c8ff;
            box-shadow:
              0 0 20px rgba(60,190,255,.16),
              inset 0 0 18px rgba(50,150,255,.08);
            pointer-events: none;
            z-index: 5;
          }

          .center-arrow-left,
          .center-arrow-right {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            font-size: 18px;
            color: #82d4ff;
            z-index: 7;
            pointer-events: none;
          }

          .center-arrow-left {
            left: 6px;
          }

          .center-arrow-right {
            right: 6px;
          }

          .spinning .reel-track {
            animation: shuntScroll 0.18s linear infinite;
          }

          .spinning .reel-item img {
            filter: blur(1.8px);
          }

          .spinning .reel:nth-child(2) .reel-track {
            animation-duration: .16s;
          }

          .spinning .reel:nth-child(3) .reel-track {
            animation-duration: .20s;
          }

          @keyframes shuntScroll {
            from {
              transform: translateY(-80px);
            }

            to {
              transform: translateY(0);
            }
          }

          .machine-controls {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 18px;
          }

          .spin-button {
            border: 1px solid #77d0ff;
            background:
              linear-gradient(
                180deg,
                #287fbd,
                #155083
              );
            color: white;
            border-radius: 12px;
            padding: 13px 28px;
            font-weight: 900;
            font-size: 15px;
            letter-spacing: 1px;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(50,160,240,.18);
          }

          .spin-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 0 25px rgba(70,180,255,.3);
          }

          .spin-button:disabled {
            opacity: .5;
            cursor: not-allowed;
          }

          .reset-button {
            border: 1px solid rgba(120,190,240,.35);
            background: rgba(7,30,58,.85);
            color: #b9dfff;
            border-radius: 12px;
            padding: 13px 20px;
            font-weight: 800;
            cursor: pointer;
          }

          .result {
            width: min(820px, 100%);
            margin: 22px auto 0;
            border: 1px solid rgba(90,190,255,.55);
            border-radius: 22px;
            padding: 22px 16px;
            text-align: center;
            box-sizing: border-box;
            background:
              linear-gradient(
                180deg,
                rgba(5,30,60,.92),
                rgba(2,17,35,.95)
              );
          }

          .result-label {
            color: #76cfff;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 4px;
            margin-bottom: 12px;
          }

          .result-dex {
            color: #79caff;
            font-weight: 900;
            letter-spacing: 2px;
            font-size: 14px;
          }

          .result img {
            width: clamp(110px, 25vw, 180px);
            height: clamp(110px, 25vw, 180px);
            object-fit: contain;
            image-rendering: pixelated;
            margin: 4px auto 0;
            display: block;
          }

          .result-name {
            font-size: clamp(28px, 5vw, 48px);
            font-weight: 900;
            font-style: italic;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 0;
          }

          .result-location-title {
            margin-top: 18px;
            font-size: 13px;
            letter-spacing: 2px;
            font-weight: 900;
            color: #7bcfff;
          }

          .locations {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
            margin-top: 10px;
          }

          .location-pill {
            border: 1px solid rgba(100,190,255,.35);
            background: rgba(20,60,100,.5);
            border-radius: 10px;
            padding: 8px 12px;
            font-size: 13px;
          }

          .empty-message {
            text-align: center;
            opacity: .7;
            padding: 30px 10px;
          }

          @media (max-width: 650px) {
            .shunt-machine-page {
              padding: 14px 8px 40px;
            }

            .machine {
              border-radius: 18px;
              padding: 10px;
            }

            .reel {
              height: 270px;
            }

            .reel-item {
              height: 54px;
              flex-basis: 54px;
            }

            .reel-item img {
              width: 44px;
              height: 44px;
            }

            .reel-item.center img {
              width: 56px;
              height: 56px;
            }

            .center-window {
              top: 108px;
              height: 54px;
            }

            .machine-controls {
              flex-direction: column;
            }

            .spin-button,
            .reset-button {
              width: 100%;
            }
          }

          @media (max-width: 430px) {
            .reel {
              height: 240px;
            }

            .reel-item {
              height: 48px;
              flex-basis: 48px;
            }

            .center-window {
              top: 96px;
              height: 48px;
            }

            .reel-item img {
              width: 40px;
              height: 40px;
            }

            .reel-item.center img {
              width: 50px;
              height: 50px;
            }
          }
        `}
      </style>

      <div className="shunt-wrapper">
        <h1 className="shunt-title">
          SHUNT MACHINE
        </h1>

        <div className="shunt-subtitle">
          Let Fate choose your next shiny hunt.
        </div>

        {/* SEASON FILTER */}
        <div className="season-row">
          {SEASONS.map((season) => (
            <button
              key={season}
              type="button"
              className={`season-button ${
                selectedSeason === season ? "active" : ""
              }`}
              onClick={() => {
                if (isSpinning) {
                  return;
                }

                setSelectedSeason(season);
                setSelectedPokemon(null);
              }}
            >
              {season}
            </button>
          ))}
        </div>

        {huntablePokemon.length === 0 ? (
          <div className="machine">
            <div className="empty-message">
              No Pokémon with location data are available
              for {selectedSeason}.
            </div>
          </div>
        ) : (
          <>
            <div className="machine">
              <div className="machine-header">
                <div className="machine-label">
                  FATE'S SHINY REEL
                </div>

                <div className="machine-season">
                  {selectedSeason} •{" "}
                  {huntablePokemon.length} huntable Pokémon
                </div>
              </div>

              <div
                key={spinKey}
                className={`reels ${
                  isSpinning ? "spinning" : ""
                }`}
              >
                {reels.map((reel, reelIndex) => (
                  <div
                    className="reel"
                    key={reelIndex}
                  >
                    <div className="reel-track">
                      {reel.map((pokemon, index) => {
                        const isCenter = index === 2;

                        return (
                          <div
                            className={`reel-item ${
                              isCenter ? "center" : ""
                            }`}
                            key={`${reelIndex}-${index}-${getPokemonId(
                              pokemon
                            )}-${getPokemonName(pokemon)}`}
                          >
                            <img
                              src={getShinyGif(pokemon)}
                              alt={getPokemonName(pokemon)}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="center-window" />

                    {reelIndex === 0 && (
                      <div className="center-arrow-left">
                        ▶
                      </div>
                    )}

                    {reelIndex === 2 && (
                      <div className="center-arrow-right">
                        ◀
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="machine-controls">
                <button
                  type="button"
                  className="spin-button"
                  disabled={isSpinning}
                  onClick={spinMachine}
                >
                  {isSpinning
                    ? "SHUNTING..."
                    : "🎰 SHUNT"}
                </button>

                <button
                  type="button"
                  className="reset-button"
                  disabled={isSpinning}
                  onClick={resetMachine}
                >
                  RESET
                </button>
              </div>
            </div>

            {selectedPokemon && (
              <div className="result">
                <div className="result-label">
                  FATE HAS CHOSEN
                </div>

                {selectedId && (
                  <div className="result-dex">
                    #{String(selectedId).padStart(3, "0")}
                  </div>
                )}

                <img
                  src={getShinyGif(selectedPokemon)}
                  alt={getPokemonName(selectedPokemon)}
                />

                <div className="result-name">
                  {getPokemonName(selectedPokemon)}
                </div>

                <div className="result-location-title">
                  HUNT LOCATION
                </div>

                <div className="locations">
                  {selectedLocations.map((location) => (
                    <div
                      key={location}
                      className="location-pill"
                    >
                      {location}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}