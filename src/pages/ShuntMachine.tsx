import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import monsters from "../data/monsters.json";

type Season =
  | "All Seasons"
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter";

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

/*
 * HEIGHT OF ONE SLOT.
 *
 * Three cells are visible:
 *
 *       TOP
 *     MIDDLE  <- selected row
 *     BOTTOM
 */
const CELL_HEIGHT = 96;

/*
 * Reel starts here.
 *
 * STOP_INDEX contains the final selected Pokémon.
 */
const START_INDEX = 2;
const STOP_INDEX = 46;

/*
 * Each reel gets progressively longer.
 *
 * Reel 1 stops first.
 * Reel 2 stops second.
 * Reel 3 stops last.
 */
const REEL_DURATIONS = [
  1450,
  2250,
  3250,
];

const allMonsters = monsters as Monster[];

/* ============================================================
   DATA HELPERS
============================================================ */

function getMonsterId(monster: Monster): number | null {
  const id =
    monster.id ??
    monster.national_dex ??
    monster.dex;

  return typeof id === "number" ? id : null;
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
  if (
    normalized === "autumn" ||
    normalized === "fall"
  ) {
    return "Autumn";
  }

  if (normalized === "winter") return "Winter";

  return null;
}

/* ============================================================
   LOCATION EXTRACTION

   This supports the structures already used by monsters.json.
============================================================ */

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

  function collectMonsterSeasons(
    value: unknown
  ): void {
    if (!value) return;

    if (typeof value === "string") {
      const season = seasonFromKey(value);

      if (season) {
        monsterSeasons.add(season);
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach(collectMonsterSeasons);
      return;
    }

    if (typeof value === "object") {
      Object.entries(
        value as Record<string, unknown>
      ).forEach(([key, child]) => {
        const season = seasonFromKey(key);

        if (season) {
          monsterSeasons.add(season);
        }

        collectMonsterSeasons(child);
      });
    }
  }

  collectMonsterSeasons(monster.seasons);
  collectMonsterSeasons(monster.season);

  function collect(
    value: unknown,
    inheritedSeason: Season | null = null,
    parentKey = ""
  ): void {
    if (
      value === null ||
      value === undefined
    ) {
      return;
    }

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

      if (ignored.includes(normalize(text))) {
        return;
      }

      const key = normalize(parentKey);

      const looksLikeLocation =
        key.includes("location") ||
        key.includes("route") ||
        key.includes("area") ||
        key.includes("place") ||
        key === "name" ||
        key === "map";

      const seasonMatches =
        selectedSeason === "All Seasons" ||
        inheritedSeason === selectedSeason ||
        monsterSeasons.has(selectedSeason);

      if (
        looksLikeLocation &&
        seasonMatches
      ) {
        results.add(text);
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) =>
        collect(
          item,
          inheritedSeason,
          parentKey
        )
      );

      return;
    }

    if (typeof value === "object") {
      Object.entries(
        value as Record<string, unknown>
      ).forEach(([key, child]) => {
        const detectedSeason =
          seasonFromKey(key);

        collect(
          child,
          detectedSeason ?? inheritedSeason,
          key
        );
      });
    }
  }

  sources.forEach((source) => {
    collect(source);
  });

  /*
   * Fallback for simple structures:
   *
   * locations: [
   *   "Route 1",
   *   "Viridian Forest"
   * ]
   */
  if (
    selectedSeason === "All Seasons" &&
    results.size === 0
  ) {
    function simpleCollect(
      value: unknown
    ): void {
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

      if (
        typeof value === "object" &&
        value !== null
      ) {
        Object.entries(
          value as Record<string, unknown>
        ).forEach(([key, child]) => {
          const normalizedKey =
            normalize(key);

          if (
            normalizedKey.includes(
              "location"
            ) ||
            normalizedKey.includes("route") ||
            normalizedKey.includes("area") ||
            normalizedKey === "name"
          ) {
            simpleCollect(child);
          }
        });
      }
    }

    sources.forEach(simpleCollect);
  }

  return [...results];
}

function hasHuntLocation(
  monster: Monster,
  season: Season
): boolean {
  return (
    extractLocations(
      monster,
      season
    ).length > 0
  );
}

/* ============================================================
   SPRITES
============================================================ */

function getShinySprite(
  id: number
): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
}

function getShinyGif(
  id: number
): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/${id}.gif`;
}

/* ============================================================
   RANDOM HELPERS
============================================================ */

function randomMonster(
  pool: ReelMonster[],
  excludeId?: number
): ReelMonster {
  if (pool.length === 0) {
    throw new Error(
      "Cannot select from an empty Pokémon pool."
    );
  }

  let candidates = pool;

  if (
    excludeId !== undefined &&
    pool.length > 1
  ) {
    candidates = pool.filter(
      (pokemon) =>
        pokemon.id !== excludeId
    );
  }

  return candidates[
    Math.floor(
      Math.random() * candidates.length
    )
  ];
}

/*
 * Build one reel.
 *
 * IMPORTANT:
 *
 * The target is placed at STOP_INDEX.
 *
 * ALL THREE reels receive the SAME target
 * at the SAME index.
 *
 * Therefore the center row of all three
 * reels MUST match.
 */
function buildReel(
  pool: ReelMonster[],
  target: ReelMonster
): ReelMonster[] {
  const reel: ReelMonster[] = [];

  for (
    let index = 0;
    index < STOP_INDEX;
    index++
  ) {
    reel.push(randomMonster(pool));
  }

  /*
   * EXACT FINAL TARGET POSITION
   */
  reel.push(target);

  /*
   * Extra cells below the target so the
   * reel has enough content to animate.
   */
  reel.push(randomMonster(pool));
  reel.push(randomMonster(pool));
  reel.push(randomMonster(pool));

  return reel;
}

/* ============================================================
   SOUND
============================================================ */

function playClickSound(): void {
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

    const context =
      new AudioContextClass();

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = "square";

    oscillator.frequency.setValueAtTime(
      180,
      context.currentTime
    );

    gain.gain.setValueAtTime(
      0.07,
      context.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + 0.08
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();

    oscillator.stop(
      context.currentTime + 0.08
    );

    window.setTimeout(() => {
      void context.close();
    }, 150);
  } catch {
    /*
     * Audio is optional.
     */
  }
}

/* ============================================================
   COMPONENT
============================================================ */

export default function ShuntMachine() {
  const [season, setSeason] =
    useState<Season>("All Seasons");

  const [spinning, setSpinning] =
    useState(false);

  const [selected, setSelected] =
    useState<ReelMonster | null>(null);

  const [reels, setReels] =
    useState<ReelMonster[][]>([
      [],
      [],
      [],
    ]);

  /*
   * This number is intentionally changed on
   * EVERY spin.
   *
   * Changing the key forces the browser to
   * create a brand-new CSS animation.
   *
   * This fixes:
   *
   * "first spin works, SHUNT AGAIN doesn't roll."
   */
  const [spinId, setSpinId] =
    useState(0);

  /*
   * Used only for cleanup.
   */
  const resultTimer =
    useRef<number | null>(null);

  /* ==========================================================
     ELIGIBLE POOL
  ========================================================== */

  const eligiblePool =
    useMemo<ReelMonster[]>(() => {
      const seen = new Set<number>();

      const pool: ReelMonster[] = [];

      allMonsters.forEach((monster) => {
        const id =
          getMonsterId(monster);

        const name =
          getMonsterName(monster);

        if (!id || !name) {
          return;
        }

        if (seen.has(id)) {
          return;
        }

        /*
         * A Pokémon WITHOUT location data
         * can NEVER enter the machine.
         */
        if (
          !hasHuntLocation(
            monster,
            season
          )
        ) {
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

  /* ==========================================================
     SELECTED POKÉMON DATA
  ========================================================== */

  const selectedMonsterData =
    useMemo(() => {
      if (!selected) {
        return null;
      }

      return allMonsters.find(
        (monster) =>
          getMonsterId(monster) ===
          selected.id
      ) ?? null;
    }, [selected]);

  const selectedLocations =
    useMemo(() => {
      if (!selectedMonsterData) {
        return [];
      }

      return extractLocations(
        selectedMonsterData,
        season
      );
    }, [
      selectedMonsterData,
      season,
    ]);

  /* ==========================================================
     INITIAL MACHINE
  ========================================================== */

  useEffect(() => {
    if (
      eligiblePool.length === 0
    ) {
      setReels([
        [],
        [],
        [],
      ]);

      return;
    }

    /*
     * Only populate empty reels.
     *
     * We do NOT want this effect to
     * interfere with an active spin.
     */
    if (
      reels.some(
        (reel) => reel.length === 0
      )
    ) {
      const target =
        randomMonster(
          eligiblePool
        );

      setReels([
        buildReel(
          eligiblePool,
          target
        ),
        buildReel(
          eligiblePool,
          target
        ),
        buildReel(
          eligiblePool,
          target
        ),
      ]);
    }
  }, [
    eligiblePool,
    reels,
  ]);

  /* ==========================================================
     CLEANUP
  ========================================================== */

  useEffect(() => {
    return () => {
      if (
        resultTimer.current !==
        null
      ) {
        window.clearTimeout(
          resultTimer.current
        );
      }
    };
  }, []);

  /* ==========================================================
     CHANGE SEASON
  ========================================================== */

  function changeSeason(
    nextSeason: Season
  ): void {
    if (spinning) {
      return;
    }

    setSeason(nextSeason);

    setSelected(null);

    setReels([
      [],
      [],
      [],
    ]);
  }

  /* ==========================================================
     SHUNT AGAIN
  ========================================================== */

  function shuntAgain(): void {
    if (spinning) {
      return;
    }

    if (
      eligiblePool.length === 0
    ) {
      return;
    }

    playClickSound();

    /*
     * Pick ONE Pokémon.
     *
     * This is the ONLY Pokémon that will
     * appear in the center of all three reels.
     */
    const target =
      randomMonster(
        eligiblePool,
        selected?.id
      );

    /*
     * Every reel gets the SAME target
     * at STOP_INDEX.
     */
    const firstReel =
      buildReel(
        eligiblePool,
        target
      );

    const secondReel =
      buildReel(
        eligiblePool,
        target
      );

    const thirdReel =
      buildReel(
        eligiblePool,
        target
      );

    /*
     * Remove the previous result while
     * the machine is spinning.
     */
    setSelected(null);

    /*
     * Replace every reel with brand-new
     * data BEFORE starting the animation.
     */
    setReels([
      firstReel,
      secondReel,
      thirdReel,
    ]);

    /*
     * MOST IMPORTANT FIX:
     *
     * A new animation ID is created every
     * single time SHUNT AGAIN is pressed.
     */
    setSpinId(
      (current) => current + 1
    );

    setSpinning(true);

    /*
     * The final reel determines when the
     * result is revealed.
     */
    if (
      resultTimer.current !== null
    ) {
      window.clearTimeout(
        resultTimer.current
      );
    }

    resultTimer.current =
      window.setTimeout(() => {
        setSpinning(false);

        /*
         * The exact same target that was
         * placed into all three reels.
         */
        setSelected(target);

        playClickSound();
      }, REEL_DURATIONS[2] + 100);
  }

  /* ==========================================================
     SEASON THEME
  ========================================================== */

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
          "--season-color":
            seasonColor,
        } as CSSProperties
      }
    >
      <style>{`

        /* ======================================================
           PAGE
        ====================================================== */

        .shunt-page {
          width: 100%;
          min-height: 100vh;
          box-sizing: border-box;
          padding: 28px 16px 70px;
          color: #dceeff;
          overflow-x: hidden;
          border: 0 !important;
          outline: 0 !important;
          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(70, 160, 255, 0.08),
              transparent 42%
            );
        }

        /*
         * No decorative full-width bars.
         * This keeps the Shunt Machine page from
         * creating extra blue lines.
         */

        .shunt-content {
          width: min(1060px, 100%);
          margin: 0 auto;
        }

        /* ======================================================
           SEASON FILTER
        ====================================================== */

        .season-filter {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
          margin: 0 auto 22px;
        }

        .season-button {
          appearance: none;
          border: 1px solid
            rgba(105, 183, 255, 0.42);
          background:
            rgba(4, 25, 51, 0.84);
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

        .season-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color:
            var(--season-color);
        }

        .season-button.active {
          color: #fff;
          border-color:
            var(--season-color);
          background:
            linear-gradient(
              180deg,
              rgba(20, 66, 105, 0.96),
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

        /* ======================================================
           MACHINE
        ====================================================== */

        .machine {
          width: min(900px, 100%);
          margin: 0 auto;
          padding: 14px;
          box-sizing: border-box;
          border-radius: 22px;
          border: 1px solid
            color-mix(
              in srgb,
              var(--season-color) 48%,
              rgba(77, 166, 235, 0.5)
            );
          background:
            linear-gradient(
              180deg,
              rgba(3, 22, 45, 0.98),
              rgba(2, 15, 31, 0.99)
            );
          box-shadow:
            0 18px 50px
            rgba(0, 0, 0, 0.32),
            inset 0 0 35px
            rgba(0, 0, 0, 0.32);
        }

        /*
         * Machine name is INSIDE the machine.
         * There is no separate page title.
         */

        .machine-name {
          text-align: center;
          margin: 0 0 10px;
          color: var(--season-color);
          font-size: 17px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-shadow:
            0 0 14px
            color-mix(
              in srgb,
              var(--season-color) 35%,
              transparent
            );
        }

        /* ======================================================
           REEL FRAME
        ====================================================== */

        .machine-frame {
          position: relative;
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 8px;
          padding: 8px;
          border-radius: 17px;
          border: 1px solid
            rgba(110, 189, 255, 0.25);
          background:
            rgba(0, 9, 22, 0.68);
        }

        /* ======================================================
           INDIVIDUAL REEL
        ====================================================== */

        .reel {
          position: relative;
          height:
            calc(${CELL_HEIGHT}px * 3);
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid
            rgba(113, 190, 255, 0.25);
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

        /* ======================================================
           REEL TRACK
        ====================================================== */

        .reel-track {
          width: 100%;
          will-change: transform;
        }

        /*
         * THIS IS THE IMPORTANT ANIMATION FIX.
         *
         * The browser creates a brand-new animation
         * every time spinId changes.
         */
        .reel-track.spinning {
          animation-name:
            shunt-reel-spin;
          animation-fill-mode:
            forwards;
          animation-timing-function:
            cubic-bezier(
              0.08,
              0.72,
              0.18,
              1
            );
        }

        /*
         * Real movement from START to STOP.
         */
        @keyframes shunt-reel-spin {
          from {
            transform:
              translateY(
                var(--reel-start)
              );
          }

          to {
            transform:
              translateY(
                var(--reel-end)
              );
          }
        }

        /*
         * Motion blur while rolling.
         */
        .reel-track.spinning
          .reel-cell img {
          filter:
            blur(1.6px)
            drop-shadow(
              0 5px 8px
              rgba(0, 0, 0, 0.5)
            );

          transform:
            scaleY(1.06);
        }

        .reel-cell {
          height:
            ${CELL_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        /*
         * SHINY SPRITES ONLY
         */
        .reel-cell img {
          width: 70px;
          height: 70px;
          object-fit: contain;
          image-rendering: pixelated;
          user-select: none;
          pointer-events: none;
          filter:
            drop-shadow(
              0 5px 8px
              rgba(0, 0, 0, 0.5)
            );
        }

        /* ======================================================
           CENTER SELECTION WINDOW
        ====================================================== */

        .selection-window {
          position: absolute;
          z-index: 5;
          left: 8px;
          right: 8px;
          top:
            calc(
              8px +
              ${CELL_HEIGHT}px
            );
          height:
            ${CELL_HEIGHT}px;
          pointer-events: none;

          border-top:
            2px solid
            var(--season-color);

          border-bottom:
            2px solid
            var(--season-color);

          border-radius: 10px;

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

        /* ======================================================
           SIDE ARROWS
        ====================================================== */

        .selection-arrow {
          position: absolute;
          top: 50%;
          transform:
            translateY(-50%);
          z-index: 7;
          color:
            var(--season-color);
          font-size: 21px;
          filter:
            drop-shadow(
              0 0 8px
              color-mix(
                in srgb,
                var(--season-color) 65%,
                transparent
              )
            );
          pointer-events: none;
        }

        .selection-arrow.left {
          left: 7px;
        }

        .selection-arrow.right {
          right: 7px;
        }

        /* ======================================================
           CONTROLS
        ====================================================== */

        .machine-controls {
          display: flex;
          justify-content: center;
          margin-top: 14px;
        }

        .shunt-button {
          appearance: none;
          min-width: 240px;
          min-height: 50px;
          border:
            1px solid
            var(--season-color);
          border-radius: 13px;
          color: #071421;
          background:
            var(--season-color);
          font-size: 15px;
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
          transform:
            translateY(-2px);
          filter:
            brightness(1.08);
        }

        .shunt-button:active:not(:disabled) {
          transform:
            translateY(1px);
        }

        .shunt-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .empty-state {
          margin-top: 14px;
          text-align: center;
          color: #87aaca;
          font-size: 14px;
        }

        /* ======================================================
           RESULT
        ====================================================== */

        .result {
          width: min(760px, 100%);
          margin: 24px auto 0;
          padding: 25px 20px;
          box-sizing: border-box;
          text-align: center;
          border-radius: 20px;

          border: 1px solid
            color-mix(
              in srgb,
              var(--season-color) 38%,
              rgba(90, 171, 235, 0.4)
            );

          background:
            linear-gradient(
              180deg,
              rgba(4, 28, 54, 0.94),
              rgba(2, 17, 35, 0.98)
            );
        }

        .result-label {
          color: #83b7df;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        /*
         * SHINY ANIMATED GIF
         */
        .result-pokemon {
          width: 175px;
          height: 175px;
          object-fit: contain;
          image-rendering: pixelated;
          margin: 2px auto 0;

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
          margin-top: 3px;
          color: #8ec6f2;
          font-size: 14px;
          font-weight: 800;
        }

        .result-name {
          margin-top: 2px;
          font-size:
            clamp(28px, 5vw, 46px);
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

        /* ======================================================
           LOCATIONS
        ====================================================== */

        .locations {
          margin-top: 22px;
          text-align: left;
        }

        .locations-title {
          margin-bottom: 9px;
          color:
            var(--season-color);
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
          padding: 10px 12px;
          border-radius: 10px;
          border:
            1px solid
            rgba(93, 174, 235, 0.22);
          background:
            rgba(4, 26, 49, 0.72);
          color: #cce7fb;
          font-size: 14px;
          font-weight: 700;
        }

        /* ======================================================
           SEASONAL MACHINE GLOW
        ====================================================== */

        .season-spring .machine {
          box-shadow:
            0 18px 50px
            rgba(0, 0, 0, 0.32),
            0 0 35px
            rgba(255, 143, 199, 0.12);
        }

        .season-summer .machine {
          box-shadow:
            0 18px 50px
            rgba(0, 0, 0, 0.32),
            0 0 35px
            rgba(255, 216, 77, 0.12);
        }

        .season-autumn .machine {
          box-shadow:
            0 18px 50px
            rgba(0, 0, 0, 0.32),
            0 0 35px
            rgba(255, 154, 69, 0.12);
        }

        .season-winter .machine {
          box-shadow:
            0 18px 50px
            rgba(0, 0, 0, 0.32),
            0 0 35px
            rgba(114, 221, 255, 0.12);
        }

        /* ======================================================
           MOBILE
        ====================================================== */

        @media (max-width: 700px) {

          .shunt-page {
            padding:
              18px 10px 55px;
          }

          .season-filter {
            gap: 6px;
            margin-bottom: 16px;
          }

          .season-button {
            min-height: 38px;
            padding: 0 11px;
            font-size: 12px;
          }

          .machine {
            padding: 9px;
            border-radius: 17px;
          }

          .machine-name {
            font-size: 14px;
            margin-bottom: 8px;
          }

          .machine-frame {
            gap: 5px;
            padding: 5px;
          }

          .reel {
            height:
              calc(${CELL_HEIGHT}px * 3);
          }

          .reel-cell img {
            width: 60px;
            height: 60px;
          }

          .selection-window {
            left: 5px;
            right: 5px;
            top:
              calc(
                5px +
                ${CELL_HEIGHT}px
              );
          }

          .selection-arrow {
            font-size: 17px;
          }

          .shunt-button {
            width: 100%;
            min-width: 0;
          }

          .result {
            padding:
              22px 14px;
          }

          .result-pokemon {
            width: 150px;
            height: 150px;
          }

          .location-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 430px) {

          .reel {
            height:
              calc(${CELL_HEIGHT}px * 3);
          }

          .reel-cell img {
            width: 54px;
            height: 54px;
          }

          .result-pokemon {
            width: 135px;
            height: 135px;
          }
        }

      `}</style>

      <div className="shunt-content">

        {/* ====================================================
            SEASON FILTER
        ==================================================== */}

        <div
          className="season-filter"
          aria-label="Season filter"
        >
          {SEASONS.map(
            (seasonOption) => {
              const active =
                season ===
                seasonOption;

              return (
                <button
                  key={seasonOption}
                  type="button"
                  className={
                    `season-button ${
                      active
                        ? "active"
                        : ""
                    }`
                  }
                  onClick={() =>
                    changeSeason(
                      seasonOption
                    )
                  }
                  disabled={spinning}
                  style={
                    {
                      "--season-color":
                        SEASON_COLORS[
                          seasonOption
                        ],
                    } as CSSProperties
                  }
                >
                  <span>
                    {
                      SEASON_ICONS[
                        seasonOption
                      ]
                    }
                  </span>{" "}
                  {seasonOption}
                </button>
              );
            }
          )}
        </div>

        {/* ====================================================
            MACHINE
        ==================================================== */}

        <section
          className="machine"
          aria-label="Shunt Machine"
        >

          <div className="machine-name">
            SHUNT MACHINE
          </div>

          <div className="machine-frame">

            {[0, 1, 2].map(
              (reelIndex) => {

                const reel =
                  reels[
                    reelIndex
                  ] ?? [];

                /*
                 * Starting transform.
                 *
                 * This shows the first three
                 * cells before the animation.
                 */
                const startY =
                  CELL_HEIGHT -
                  START_INDEX *
                    CELL_HEIGHT;

                /*
                 * Final transform.
                 *
                 * The target is at STOP_INDEX.
                 */
                const endY =
                  CELL_HEIGHT -
                  STOP_INDEX *
                    CELL_HEIGHT;

                const duration =
                  REEL_DURATIONS[
                    reelIndex
                  ];

                return (
                  <div
                    className="reel"
                    key={reelIndex}
                  >

                    <div
                      key={`track-${spinId}-${reelIndex}`}
                      className={
                        `reel-track ${
                          spinning
                            ? "spinning"
                            : ""
                        }`
                      }
                      style={
                        {
                          "--reel-start":
                            `${startY}px`,

                          "--reel-end":
                            `${endY}px`,

                          animationDuration:
                            `${duration}ms`,

                          /*
                           * This forces a completely
                           * fresh animation every spin.
                           */
animationName:
  spinning
    ? "shunt-reel-spin"
    : "none",
                        } as CSSProperties
                      }
                    >

                      {reel.map(
                        (
                          pokemon,
                          index
                        ) => (
                          <div
                            className="reel-cell"
                            key={
                              `${spinId}-${reelIndex}-${index}-${pokemon.id}`
                            }
                          >
                            <img
                              src={getShinySprite(
                                pokemon.id
                              )}
                              alt={
                                pokemon.name
                              }
                              draggable={
                                false
                              }
                            />
                          </div>
                        )
                      )}

                    </div>

                    {reelIndex === 0 && (
                      <span
                        className={
                          "selection-arrow left"
                        }
                      >
                        ▶
                      </span>
                    )}

                    {reelIndex === 2 && (
                      <span
                        className={
                          "selection-arrow right"
                        }
                      >
                        ◀
                      </span>
                    )}

                  </div>
                );
              }
            )}

            <div
              className="selection-window"
            />

          </div>

          {/* ==================================================
              BUTTON
          ================================================== */}

          <div className="machine-controls">

            <button
              type="button"
              className="shunt-button"
              onClick={
                shuntAgain
              }
              disabled={
                spinning ||
                eligiblePool.length ===
                  0
              }
            >
              {spinning
                ? "FATE IS SPINNING..."
                : "🎰 SHUNT AGAIN"}
            </button>

          </div>

          {eligiblePool.length ===
            0 && (
            <div className="empty-state">
              No Pokémon with hunt
              locations were found
              for this season.
            </div>
          )}

        </section>

        {/* ====================================================
            RESULT
        ==================================================== */}

        {selected && (
          <section
            className="result"
            aria-live="polite"
          >

            <div className="result-label">
              ✦ Fate Has Chosen ✦
            </div>

            {/* SHINY ANIMATED GIF */}

            <img
              className="result-pokemon"
              src={getShinyGif(
                selected.id
              )}
              alt={
                `Shiny ${selected.name}`
              }
              draggable={false}
            />

            <div className="result-number">
              #
              {String(
                selected.id
              ).padStart(3, "0")}
            </div>

            <div className="result-name">
              {selected.name}
            </div>

            <div className="result-description">
              Your next shiny hunt.
            </div>

            {/* ==================================================
                HUNT LOCATIONS
            ================================================== */}

            {selectedLocations.length >
              0 && (
              <div className="locations">

                <div className="locations-title">
                  Hunt Locations
                </div>

                <div className="location-list">

                  {selectedLocations.map(
                    (
                      location,
                      index
                    ) => (
                      <div
                        className="location-item"
                        key={
                          `${location}-${index}`
                        }
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