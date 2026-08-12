import { useEffect, useMemo, useRef, useState } from "react";
import monsters from "../data/monsters.json";

type Season = "All Seasons" | "Spring" | "Summer" | "Autumn" | "Winter";

type Monster = {
  id?: number;
  national_dex?: number;
  dex?: number;
  name?: string;

  locations?: unknown;
  wildLocations?: unknown;
  wild_locations?: unknown;
  encounters?: unknown;

  seasons?: unknown;
  season?: unknown;
};

type ReelMonster = {
  id: number;
  name: string;
};

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

const SEASON_COLORS: Record<Season, string> = {
  "All Seasons": "#7fc9ff",
  Spring: "#ff8fc7",
  Summer: "#ffd84d",
  Autumn: "#ff9a45",
  Winter: "#72ddff",
};

const CELL_HEIGHT = 112;
const START_INDEX = 2;
const STOP_INDEX = 46;

const REEL_DURATIONS = [
  1350,
  2100,
  3000,
];

const allMonsters = monsters as Monster[];

/* -------------------------------------------------------
   BASIC DATA HELPERS
------------------------------------------------------- */

function getMonsterId(monster: Monster): number | null {
  const id =
    monster.id ??
    monster.national_dex ??
    monster.dex;

  if (typeof id !== "number") return null;

  return id;
}

function getMonsterName(monster: Monster): string {
  return monster.name ?? "Unknown Pokémon";
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

function seasonFromKey(value: string): Season | null {
  const normalized = normalize(value);

  if (normalized === "spring") return "Spring";
  if (normalized === "summer") return "Summer";
  if (normalized === "autumn") return "Autumn";
  if (normalized === "fall") return "Autumn";
  if (normalized === "winter") return "Winter";

  return null;
}

/* -------------------------------------------------------
   LOCATION EXTRACTION

   Supports several possible monster.json structures so
   the Shunt Machine can work with the existing dataset.
------------------------------------------------------- */

function extractLocations(
  monster: Monster,
  selectedSeason: Season
): string[] {
  const results = new Set<string>();

  const sources = [
    monster.locations,
    monster.wildLocations,
    monster.wild_locations,
    monster.encounters,
  ];

  const monsterSeasons = new Set<Season>();

  const collectMonsterSeasons = (value: unknown) => {
    if (!value) return;

    if (typeof value === "string") {
      const season = seasonFromKey(value);
      if (season) monsterSeasons.add(season);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collectMonsterSeasons);
      return;
    }

    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(
        ([key, child]) => {
          const season = seasonFromKey(key);

          if (season) {
            monsterSeasons.add(season);
          }

          collectMonsterSeasons(child);
        }
      );
    }
  };

  collectMonsterSeasons(monster.seasons);
  collectMonsterSeasons(monster.season);

  const collect = (
    value: unknown,
    inheritedSeason: Season | null = null,
    parentKey = ""
  ) => {
    if (value === null || value === undefined) return;

    if (typeof value === "string") {
      const text = value.trim();

      if (!text) return;

      const ignored = [
        "morning",
        "day",
        "night",
        "walk",
        "surf",
        "fishing",
        "gift",
        "horde",
        "overworld",
        "grass",
        "water",
      ];

      if (ignored.includes(normalize(text))) return;

      const key = normalize(parentKey);

      const looksLikeLocation =
        key.includes("location") ||
        key.includes("route") ||
        key.includes("area") ||
        key.includes("place") ||
        key === "name" ||
        key === "map";

      const isSeasonMatch =
        selectedSeason === "All Seasons" ||
        inheritedSeason === selectedSeason ||
        monsterSeasons.has(selectedSeason);

      if (looksLikeLocation && isSeasonMatch) {
        results.add(text);
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) =>
        collect(item, inheritedSeason, parentKey)
      );
      return;
    }

    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(
        ([key, child]) => {
          const detectedSeason = seasonFromKey(key);

          collect(
            child,
            detectedSeason ?? inheritedSeason,
            key
          );
        }
      );
    }
  };

  sources.forEach((source) => {
    collect(source);
  });

  /*
    Fallback for simple datasets such as:

    {
      locations: ["Route 1", "Viridian Forest"]
    }
  */

  if (
    selectedSeason === "All Seasons" &&
    results.size === 0
  ) {
    const simpleCollect = (value: unknown) => {
      if (typeof value === "string") {
        const text = value.trim();

        if (
          text &&
          ![
            "morning",
            "day",
            "night",
            "walk",
            "surf",
            "fishing",
            "gift",
            "horde",
          ].includes(normalize(text))
        ) {
          results.add(text);
        }

        return;
      }

      if (Array.isArray(value)) {
        value.forEach(simpleCollect);
        return;
      }

      if (typeof value === "object" && value !== null) {
        Object.entries(value as Record<string, unknown>).forEach(
          ([key, child]) => {
            const normalizedKey = normalize(key);

            if (
              normalizedKey.includes("location") ||
              normalizedKey.includes("route") ||
              normalizedKey.includes("area") ||
              normalizedKey === "name"
            ) {
              simpleCollect(child);
            }
          }
        );
      }
    };

    sources.forEach(simpleCollect);
  }

  return [...results];
}

function hasHuntLocation(
  monster: Monster,
  season: Season
): boolean {
  return extractLocations(monster, season).length > 0;
}

/* -------------------------------------------------------
   SPRITES
------------------------------------------------------- */

function getShinySprite(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
}

function getShinyGif(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/${id}.gif`;
}

/* -------------------------------------------------------
   RANDOM DATA
------------------------------------------------------- */

function randomMonster(
  pool: ReelMonster[],
  excludeId?: number
): ReelMonster {
  let candidates = pool;

  if (excludeId !== undefined && pool.length > 1) {
    candidates = pool.filter(
      (pokemon) => pokemon.id !== excludeId
    );
  }

  return candidates[
    Math.floor(Math.random() * candidates.length)
  ];
}

function buildReel(
  pool: ReelMonster[],
  target: ReelMonster
): ReelMonster[] {
  const reel: ReelMonster[] = [];

  /*
    The target is deliberately inserted at exactly the same
    stop position in EVERY reel.

    That guarantees that the middle row of all 3 reels
    displays the selected Pokémon.
  */

  for (let i = 0; i < STOP_INDEX; i++) {
    reel.push(randomMonster(pool));
  }

  reel.push(target);

  reel.push(randomMonster(pool));
  reel.push(randomMonster(pool));

  return reel;
}

/* -------------------------------------------------------
   SOUND
------------------------------------------------------- */

function playClickSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(
      180,
      context.currentTime
    );

    gain.gain.setValueAtTime(
      0.08,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + 0.08
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
  } catch {
    // Audio is optional.
  }
}

/* -------------------------------------------------------
   COMPONENT
------------------------------------------------------- */

export default function ShuntMachine() {
  const [season, setSeason] =
    useState<Season>("All Seasons");

  const [spinning, setSpinning] =
    useState(false);

  const [selected, setSelected] =
    useState<ReelMonster | null>(null);

  const [reelIndexes, setReelIndexes] =
    useState<number[]>([
      START_INDEX,
      START_INDEX,
      START_INDEX,
    ]);

  const [reels, setReels] =
    useState<ReelMonster[][]>([
      [],
      [],
      [],
    ]);

  const resultTimer = useRef<number | null>(null);

  /* -----------------------------------------------------
     BUILD ELIGIBLE POOL

     A Pokémon can ONLY enter the machine if it has
     actual location data for the selected season.
  ----------------------------------------------------- */

  const eligiblePool = useMemo<ReelMonster[]>(() => {
    const seen = new Set<number>();
    const pool: ReelMonster[] = [];

    allMonsters.forEach((monster) => {
      const id = getMonsterId(monster);
      const name = getMonsterName(monster);

      if (!id || !name) return;

      if (seen.has(id)) return;

      if (!hasHuntLocation(monster, season)) {
        return;
      }

      seen.add(id);

      pool.push({
        id,
        name,
      });
    });

    return pool;
  }, [season]);

  /* -----------------------------------------------------
     CURRENT RESULT LOCATIONS
  ----------------------------------------------------- */

  const selectedMonsterData = useMemo(() => {
    if (!selected) return null;

    return allMonsters.find(
      (monster) =>
        getMonsterId(monster) === selected.id
    );
  }, [selected]);

  const selectedLocations = useMemo(() => {
    if (!selectedMonsterData) return [];

    return extractLocations(
      selectedMonsterData,
      season
    );
  }, [selectedMonsterData, season]);

  /* -----------------------------------------------------
     CLEANUP
  ----------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (resultTimer.current !== null) {
        window.clearTimeout(resultTimer.current);
      }
    };
  }, []);

  /* -----------------------------------------------------
     SEASON CHANGE
  ----------------------------------------------------- */

  function changeSeason(nextSeason: Season) {
    if (spinning) return;

    setSeason(nextSeason);
    setSelected(null);

    setReels([
      [],
      [],
      [],
    ]);

    setReelIndexes([
      START_INDEX,
      START_INDEX,
      START_INDEX,
    ]);
  }

  /* -----------------------------------------------------
     SHUNT

     IMPORTANT:

     ONE target is chosen.

     ALL THREE reels are built using that same target.

     This fixes the previous issue where only the center
     reel matched the final Pokémon.
  ----------------------------------------------------- */

  function shuntAgain() {
    if (spinning) return;

    if (eligiblePool.length === 0) {
      return;
    }

    playClickSound();

    const target = randomMonster(
      eligiblePool,
      selected?.id
    );

    const firstReel = buildReel(
      eligiblePool,
      target
    );

    const secondReel = buildReel(
      eligiblePool,
      target
    );

    const thirdReel = buildReel(
      eligiblePool,
      target
    );

    /*
      Reset the reels to the beginning before starting
      the animation.
    */

    setSelected(null);

    setReels([
      firstReel,
      secondReel,
      thirdReel,
    ]);

    setReelIndexes([
      START_INDEX,
      START_INDEX,
      START_INDEX,
    ]);

    setSpinning(true);

    /*
      Start the actual movement on the next animation frame.
    */

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReelIndexes([
          STOP_INDEX,
          STOP_INDEX,
          STOP_INDEX,
        ]);
      });
    });

    /*
      The third reel is the slowest and therefore determines
      when the machine is finished.
    */

    if (resultTimer.current !== null) {
      window.clearTimeout(resultTimer.current);
    }

    resultTimer.current = window.setTimeout(() => {
      setSpinning(false);

      /*
        The SAME target selected before the roll is returned.
      */

      setSelected(target);

      playClickSound();
    }, REEL_DURATIONS[2] + 120);
  }

  /* -----------------------------------------------------
     SEASON THEME
  ----------------------------------------------------- */

  const seasonColor =
    SEASON_COLORS[season];

  const seasonClass =
    season
      .toLowerCase()
      .replace(/\s+/g, "-");

  return (
    <div
      className={`shunt-page season-${seasonClass}`}
      style={
        {
          "--season-color": seasonColor,
        } as React.CSSProperties
      }
    >
      <style>{`
        .shunt-page {
          width: 100%;
          min-height: 100vh;
          box-sizing: border-box;
          padding: 34px 20px 80px;
          color: #dceeff;
          background:
            radial-gradient(
              circle at 50% 25%,
              rgba(70, 160, 255, 0.10),
              transparent 42%
            );
        }

        .shunt-content {
          width: min(1120px, 100%);
          margin: 0 auto;
        }

        .shunt-header {
          text-align: center;
          margin-bottom: 18px;
        }

        .shunt-subtitle {
          margin: 8px auto 0;
          max-width: 650px;
          color: #9fc8ec;
          font-size: 15px;
        }

        /* SEASON FILTER */

        .season-filter {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 9px;
          margin: 24px auto 28px;
        }

        .season-button {
          appearance: none;
          border: 1px solid rgba(105, 183, 255, 0.42);
          background: rgba(4, 25, 51, 0.82);
          color: #b9d9f6;
          border-radius: 12px;
          min-height: 42px;
          padding: 0 17px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            background 0.15s ease,
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .season-button:hover {
          transform: translateY(-1px);
          border-color: var(--season-color);
        }

        .season-button.active {
          color: #fff;
          border-color: var(--season-color);
          background:
            linear-gradient(
              180deg,
              color-mix(
                in srgb,
                var(--season-color) 28%,
                rgba(4, 25, 51, 0.95)
              ),
              rgba(4, 25, 51, 0.96)
            );
          box-shadow:
            0 0 18px
            color-mix(
              in srgb,
              var(--season-color) 30%,
              transparent
            );
        }

        /* MACHINE */

        .machine {
          width: min(920px, 100%);
          margin: 0 auto;
          padding: 18px;
          border-radius: 24px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--season-color) 48%,
              rgba(77, 166, 235, 0.5)
            );
          background:
            linear-gradient(
              180deg,
              rgba(3, 22, 45, 0.97),
              rgba(2, 15, 31, 0.98)
            );
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.32),
            inset 0 0 35px rgba(0, 0, 0, 0.32);
        }

        .machine-name {
          text-align: center;
          margin: 0 0 12px;
          color: var(--season-color);
          font-size: 18px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-shadow: 0 0 14px color-mix(in srgb, var(--season-color) 35%, transparent);
        }

        .machine-frame {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 10px;
          border-radius: 18px;
          border: 1px solid rgba(110, 189, 255, 0.25);
          background: rgba(0, 9, 22, 0.68);
        }

        .reel {
          position: relative;
          height: calc(${CELL_HEIGHT}px * 3);
          overflow: hidden;
          border-radius: 13px;
          border: 1px solid rgba(113, 190, 255, 0.25);
          background:
            linear-gradient(
              180deg,
              rgba(3, 22, 42, 0.98),
              rgba(2, 14, 28, 0.98)
            );
        }

        .reel::before,
        .reel::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 30%;
          z-index: 4;
          pointer-events: none;
        }

        .reel::before {
          top: 0;
          background:
            linear-gradient(
              180deg,
              rgba(0, 8, 20, 0.92),
              transparent
            );
        }

        .reel::after {
          bottom: 0;
          background:
            linear-gradient(
              0deg,
              rgba(0, 8, 20, 0.92),
              transparent
            );
        }

        .reel-track {
          width: 100%;
          will-change: transform;
        }

        .reel-track.spinning .reel-cell img {
          filter: blur(1.4px) drop-shadow(0 5px 8px rgba(0,0,0,0.5));
          transform: scaleY(1.04);
        }

        .reel-cell {
          height: ${CELL_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .reel-cell img {
          width: 78px;
          height: 78px;
          object-fit: contain;
          image-rendering: pixelated;
          user-select: none;
          pointer-events: none;
          filter:
            drop-shadow(0 5px 8px rgba(0,0,0,0.5));
        }

        /*
          Center selection window.
        */

        .selection-window {
          position: absolute;
          z-index: 5;
          left: 0;
          right: 0;
          top: ${CELL_HEIGHT}px;
          height: ${CELL_HEIGHT}px;
          pointer-events: none;
          border-top: 2px solid var(--season-color);
          border-bottom: 2px solid var(--season-color);
          box-shadow:
            0 0 20px
            color-mix(
              in srgb,
              var(--season-color) 32%,
              transparent
            ),
            inset 0 0 20px
            color-mix(
              in srgb,
              var(--season-color) 9%,
              transparent
            );
        }

        .selection-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 6;
          color: var(--season-color);
          font-size: 22px;
          filter:
            drop-shadow(
              0 0 8px
              color-mix(
                in srgb,
                var(--season-color) 65%,
                transparent
              )
            );
        }

        .selection-arrow.left {
          left: 7px;
        }

        .selection-arrow.right {
          right: 7px;
        }

        /* MACHINE CONTROLS */

        .machine-controls {
          display: flex;
          justify-content: center;
          margin-top: 18px;
        }

        .shunt-button {
          appearance: none;
          min-width: 240px;
          min-height: 52px;
          border: 1px solid var(--season-color);
          border-radius: 14px;
          color: #071421;
          background: var(--season-color);
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 0.08em;
          cursor: pointer;
          box-shadow:
            0 0 22px
            color-mix(
              in srgb,
              var(--season-color) 28%,
              transparent
            );
          transition:
            transform 0.15s ease,
            filter 0.15s ease;
        }

        .shunt-button:hover:not(:disabled) {
          transform: translateY(-2px);
          filter: brightness(1.08);
        }

        .shunt-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .shunt-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        /* RESULT */

        .result {
          width: min(760px, 100%);
          margin: 30px auto 0;
          padding: 28px 22px;
          box-sizing: border-box;
          text-align: center;
          border-radius: 22px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--season-color) 38%,
              rgba(90, 171, 235, 0.4)
            );
          background:
            linear-gradient(
              180deg,
              rgba(4, 28, 54, 0.92),
              rgba(2, 17, 35, 0.97)
            );
        }

        .result-label {
          color: #83b7df;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .result-pokemon {
          width: 180px;
          height: 180px;
          object-fit: contain;
          image-rendering: pixelated;
          margin: 4px auto 0;
          filter:
            drop-shadow(
              0 0 20px
              color-mix(
                in srgb,
                var(--season-color) 35%,
                transparent
              )
            );
        }

        .result-number {
          margin-top: 4px;
          color: #8ec6f2;
          font-size: 14px;
          font-weight: 800;
        }

        .result-name {
          margin-top: 2px;
          font-size: clamp(28px, 5vw, 48px);
          font-weight: 950;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .result-description {
          margin-top: 4px;
          color: #8fb7d8;
          font-size: 14px;
        }

        /* LOCATIONS */

        .locations {
          margin-top: 24px;
          text-align: left;
        }

        .locations-title {
          margin-bottom: 10px;
          color: var(--season-color);
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .location-list {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .location-item {
          padding: 11px 13px;
          border-radius: 10px;
          border: 1px solid rgba(93, 174, 235, 0.22);
          background: rgba(4, 26, 49, 0.72);
          color: #cce7fb;
          font-size: 14px;
          font-weight: 700;
        }

        .empty-state {
          margin-top: 16px;
          color: #87aaca;
          font-size: 14px;
        }

        /* SEASONAL LOOKS */

        .season-spring .machine {
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.32),
            0 0 30px rgba(255, 143, 199, 0.08);
        }

        .season-summer .machine {
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.32),
            0 0 30px rgba(255, 216, 77, 0.08);
        }

        .season-autumn .machine {
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.32),
            0 0 30px rgba(255, 154, 69, 0.08);
        }

        .season-winter .machine {
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.32),
            0 0 30px rgba(114, 221, 255, 0.08);
        }

        /* MOBILE */

        @media (max-width: 700px) {
          .shunt-page {
            padding:
              20px 12px 60px;
          }

          .machine {
            padding: 10px;
            border-radius: 18px;
          }

          .machine-name {
            font-size: 15px;
            margin-bottom: 8px;
          }

          .machine-frame {
            gap: 6px;
            padding: 6px;
          }

          .reel {
            height: calc(${CELL_HEIGHT}px * 3);
          }

          .reel-cell img {
            width: 65px;
            height: 65px;
          }

          .season-filter {
            gap: 7px;
          }

          .season-button {
            padding: 0 12px;
            min-height: 39px;
            font-size: 12px;
          }

          .shunt-button {
            width: 100%;
            min-width: 0;
          }

          .result {
            padding:
              24px 16px;
          }

          .result-pokemon {
            width: 155px;
            height: 155px;
          }

          .location-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 430px) {
          .reel {
            height: calc(${CELL_HEIGHT}px * 3);
          }

          .reel-cell img {
            width: 58px;
            height: 58px;
          }

          .selection-arrow {
            font-size: 18px;
          }

          .result-pokemon {
            width: 140px;
            height: 140px;
          }
        }
      `}</style>

      <div className="shunt-content">

        {/* HEADER */}

        <header className="shunt-header">
          <p className="shunt-subtitle">
            Let Fate choose your next shiny hunt.
            Every result has a huntable location.
          </p>
        </header>

        {/* SEASON FILTER */}

        <div
          className="season-filter"
          aria-label="Season filter"
        >
          {SEASONS.map((seasonOption) => {
            const active =
              season === seasonOption;

            return (
              <button
                key={seasonOption}
                type="button"
                className={`season-button ${
                  active ? "active" : ""
                }`}
                onClick={() =>
                  changeSeason(seasonOption)
                }
                disabled={spinning}
                style={
                  {
                    "--season-color":
                      SEASON_COLORS[seasonOption],
                  } as React.CSSProperties
                }
              >
                <span>
                  {SEASON_ICONS[seasonOption]}
                </span>{" "}
                {seasonOption}
              </button>
            );
          })}
        </div>

        {/* MACHINE */}

        <section
          className="machine"
          aria-label="Shunt Machine"
        >
          <div className="machine-name">
            SHUNT MACHINE
          </div>

          <div className="machine-frame">

            {[0, 1, 2].map((reelIndex) => {
              const reel =
                reels[reelIndex] ?? [];

              const index =
                reelIndexes[reelIndex] ??
                START_INDEX;

              const duration =
                REEL_DURATIONS[reelIndex];

              const translate =
                CELL_HEIGHT -
                index * CELL_HEIGHT;

              return (
                <div
                  className="reel"
                  key={reelIndex}
                >
                  <div
                    className={`reel-track ${spinning ? "spinning" : ""}`}
                    style={{
                      transform:
                        `translateY(${translate}px)`,

                      transition: spinning
                        ? `
                          transform
                          ${duration}ms
                          cubic-bezier(
                            0.12,
                            0.78,
                            0.22,
                            1
                          )
                        `
                        : "none",
                    }}
                  >
                    {reel.map(
                      (pokemon, index) => (
                        <div
                          className="reel-cell"
                          key={`${reelIndex}-${index}`}
                        >
                          <img
                            src={getShinySprite(
                              pokemon.id
                            )}
                            alt={pokemon.name}
                            draggable={false}
                          />
                        </div>
                      )
                    )}
                  </div>

                  {reelIndex === 0 && (
                    <span className="selection-arrow left">
                      ▶
                    </span>
                  )}

                  {reelIndex === 2 && (
                    <span className="selection-arrow right">
                      ◀
                    </span>
                  )}
                </div>
              );
            })}

            <div className="selection-window" />
          </div>

          {/* CONTROLS */}

          <div className="machine-controls">
            <button
              type="button"
              className="shunt-button"
              onClick={shuntAgain}
              disabled={
                spinning ||
                eligiblePool.length === 0
              }
            >
              {spinning
                ? "FATE IS SPINNING..."
                : "🎰 SHUNT AGAIN"}
            </button>
          </div>

          {eligiblePool.length === 0 && (
            <div className="empty-state">
              No Pokémon with hunt locations were found
              for this season.
            </div>
          )}
        </section>

        {/* RESULT */}

        {selected && (
          <section
            className="result"
            aria-live="polite"
          >
            <div className="result-label">
              ✦ Fate Has Chosen ✦
            </div>

            {/* ANIMATED SHINY GIF */}

            <img
              className="result-pokemon"
              src={getShinyGif(selected.id)}
              alt={`Shiny ${selected.name}`}
              draggable={false}
            />

            <div className="result-number">
              #{String(selected.id).padStart(3, "0")}
            </div>

            <div className="result-name">
              {selected.name}
            </div>

            <div className="result-description">
              Your next shiny hunt.
            </div>

            {/* LOCATIONS */}

            {selectedLocations.length > 0 && (
              <div className="locations">
                <div className="locations-title">
                  Hunt Locations
                </div>

                <div className="location-list">
                  {selectedLocations.map(
                    (location, index) => (
                      <div
                        className="location-item"
                        key={`${location}-${index}`}
                      >
                        📍 {location}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}