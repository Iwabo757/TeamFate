import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import monsters from "../data/monsters.json";

type Season =
  | "All Seasons"
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter";

type EncounterFilter =
  | "All"
  | "Single"
  | "Fishing"
  | "Horde";

type HordeFilter =
  | "All"
  | "Horde"
  | "No Horde";

type LureFilter =
  | "All"
  | "Lure"
  | "No Lure";

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

  lure?: boolean;
  is_lure?: boolean;
  requires_lure?: boolean;

  rarity_flags?: number;

  rarity_morning?: string;
  rarity_day?: string;
  rarity_night?: string;
};

type Monster = {
  id?: number;
  national_dex?: number;
  dex?: number;
  name?: string;

  locations?: MonsterLocation[];

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

const pokemonList =
  monsters as Monster[];

const SEASONS: Season[] = [
  "All Seasons",
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
];

const SEASON_ICONS: Record<
  Season,
  string
> = {
  "All Seasons": "✦",
  Spring: "🌸",
  Summer: "☀️",
  Autumn: "🍂",
  Winter: "❄️",
};

const SEASON_COLORS: Record<
  Season,
  string
> = {
  "All Seasons": "#7fc9ff",
  Spring: "#ff8fc7",
  Summer: "#ffd84d",
  Autumn: "#ff9a45",
  Winter: "#72ddff",
};

const ENCOUNTER_FILTERS: EncounterFilter[] = [
  "All",
  "Single",
  "Fishing",
  "Horde",
];

const HORDE_FILTERS: HordeFilter[] = [
  "All",
  "Horde",
  "No Horde",
];

const LURE_FILTERS: LureFilter[] = [
  "All",
  "Lure",
  "No Lure",
];

/*
 * Height of one slot.
 *
 * Three rows are visible:
 *
 * TOP
 * MIDDLE  <- winner
 * BOTTOM
 */
const CELL_HEIGHT = 96;

/*
 * The winning Pokémon is inserted at this
 * exact index on every reel.
 */
const START_INDEX = 2;
const STOP_INDEX = 46;

/*
 * Reel 1 stops first.
 * Reel 2 stops second.
 * Reel 3 stops last.
 */
const REEL_DURATIONS = [
  1450,
  2250,
  3250,
];

/* ============================================================
   BASIC HELPERS
============================================================ */

function getMonsterId(
  monster: Monster
): number | null {
  const id =
    monster.id ??
    monster.national_dex ??
    monster.dex;

  return typeof id === "number"
    ? id
    : null;
}

function getMonsterName(
  monster: Monster
): string {
  return (
    monster.name ??
    "Unknown Pokémon"
  );
}

function normalize(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

function seasonFromKey(
  value: string
): Season | null {
  const normalized =
    normalize(value);

  if (
    normalized === "spring"
  ) {
    return "Spring";
  }

  if (
    normalized === "summer"
  ) {
    return "Summer";
  }

  if (
    normalized === "autumn" ||
    normalized === "fall"
  ) {
    return "Autumn";
  }

  if (
    normalized === "winter"
  ) {
    return "Winter";
  }

  return null;
}

/* ============================================================
   LOCATION DATA
============================================================ */

function isHorde(location: MonsterLocation): boolean {
  if (
    location.is_horde_3x === true ||
    location.is_horde_5x === true
  ) {
    return true;
  }

  return normalize(location.type || "").includes("horde");
}

function isFishing(location: MonsterLocation): boolean {
  const type = normalize(location.type || "");

  return (
    type.includes("fish") ||
    type.includes("rod")
  );
}

function isLure(location: MonsterLocation): boolean {
  if (
    location.lure === true ||
    location.is_lure === true ||
    location.requires_lure === true
  ) {
    return true;
  }

  return normalize(location.type || "").includes("lure");
}

function isSingle(location: MonsterLocation): boolean {
  if (isHorde(location) || isFishing(location) || isLure(location)) {
    return false;
  }

  const type = normalize(location.type || "");

  if (!type) {
    return true;
  }

  return (
    type.includes("single") ||
    type.includes("grass") ||
    type.includes("walking") ||
    type.includes("cave") ||
    type.includes("surf") ||
    type.includes("water") ||
    type.includes("wild")
  );
}

function matchesEncounter(
  location: MonsterLocation,
  filter: EncounterFilter
): boolean {
  switch (filter) {
    case "Single":
      return isSingle(location);
    case "Fishing":
      return isFishing(location);
    case "Horde":
      return isHorde(location);
    case "All":
    default:
      return true;
  }
}

function matchesHorde(
  location: MonsterLocation,
  filter: HordeFilter
): boolean {
  switch (filter) {
    case "Horde":
      return isHorde(location);
    case "No Horde":
      return !isHorde(location);
    case "All":
    default:
      return true;
  }
}

function matchesLure(
  location: MonsterLocation,
  filter: LureFilter
): boolean {
  switch (filter) {
    case "Lure":
      return isLure(location);
    case "No Lure":
      return !isLure(location);
    case "All":
    default:
      return true;
  }
}

function getLocations(
  pokemon: Monster,
  selectedSeason: Season,
  encounterFilter: EncounterFilter,
  hordeFilter: HordeFilter,
  lureFilter: LureFilter
): MonsterLocation[] {
  if (!Array.isArray(pokemon.locations)) {
    return [];
  }

  const seen = new Set<string>();

  return pokemon.locations.filter((location) => {
    const name =
      location.location_name_full ||
      location.location_name;

    if (!name) {
      return false;
    }

    const locationSeason = seasonFromKey(
      location.season || ""
    );

    if (
      selectedSeason !== "All Seasons" &&
      locationSeason &&
      locationSeason !== selectedSeason
    ) {
      return false;
    }

    if (!matchesEncounter(location, encounterFilter)) {
      return false;
    }

    if (!matchesHorde(location, hordeFilter)) {
      return false;
    }

    if (!matchesLure(location, lureFilter)) {
      return false;
    }

    const key = [
      name,
      location.region_name || "",
      locationSeason || "",
      location.type || "",
      isHorde(location),
      isFishing(location),
      isLure(location),
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function hasValidLocation(
  pokemon: Monster,
  season: Season,
  encounterFilter: EncounterFilter,
  hordeFilter: HordeFilter,
  lureFilter: LureFilter
): boolean {
  return (
    getLocations(
      pokemon,
      season,
      encounterFilter,
      hordeFilter,
      lureFilter
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
   RANDOM
============================================================ */

function randomPokemon(
  pool: ReelMonster[],
  excludeId?: number
): ReelMonster {
  if (pool.length === 0) {
    throw new Error(
      "No shuntable Pokémon available."
    );
  }

  let candidates = pool;

  if (
    excludeId !== undefined &&
    pool.length > 1
  ) {
    candidates =
      pool.filter(
        (pokemon) =>
          pokemon.id !==
          excludeId
      );
  }

  return candidates[
    Math.floor(
      Math.random() *
        candidates.length
    )
  ];
}

/*
 * Builds a reel with the SAME winner
 * inserted at STOP_INDEX.
 *
 * This guarantees all three reels
 * land on the same Pokémon.
 */
function buildReel(
  pool: ReelMonster[],
  winner: ReelMonster
): ReelMonster[] {
  const reel: ReelMonster[] = [];

  for (
    let i = 0;
    i < STOP_INDEX;
    i++
  ) {
    reel.push(
      randomPokemon(pool)
    );
  }

  /*
   * EXACT WINNING POSITION.
   */
  reel.push(winner);

  /*
   * Extra cells prevent the reel from
   * ending visually at the bottom.
   */
  reel.push(
    randomPokemon(pool)
  );

  reel.push(
    randomPokemon(pool)
  );

  reel.push(
    randomPokemon(pool)
  );

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

    oscillator.type =
      "square";

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
      context.currentTime +
        0.08
    );

    oscillator.connect(gain);
    gain.connect(
      context.destination
    );

    oscillator.start();

    oscillator.stop(
      context.currentTime +
        0.08
    );

    window.setTimeout(() => {
      void context.close();
    }, 150);
  } catch {
    // Audio is optional.
  }
}

/* ============================================================
   COMPONENT
============================================================ */

export default function ShuntMachine() {
  const [season, setSeason] =
    useState<Season>(
      "All Seasons"
    );

  const [encounterFilter, setEncounterFilter] =
    useState<EncounterFilter>("All");

  const [hordeFilter, setHordeFilter] =
    useState<HordeFilter>("All");

  const [lureFilter, setLureFilter] =
    useState<LureFilter>("All");

  const [spinning, setSpinning] =
    useState(false);

  const [selected, setSelected] =
    useState<ReelMonster | null>(
      null
    );

  const [reels, setReels] =
    useState<ReelMonster[][]>([
      [],
      [],
      [],
    ]);

  /*
   * Forces a brand-new DOM reel every
   * time SHUNT AGAIN is pressed.
   */
  const [spinId, setSpinId] =
    useState(0);

  /*
   * True after the reel has finished.
   *
   * IMPORTANT:
   *
   * This is what keeps the winning
   * Pokémon physically locked in place.
   */
  const [reelLocked, setReelLocked] =
    useState(false);

  const resultTimer =
    useRef<number | null>(
      null
    );

  /* ==========================================================
     SHUNTABLE POOL
  ========================================================== */

  const shuntablePokemon =
    useMemo<ReelMonster[]>(() => {
      const seen =
        new Set<number>();

      const pool: ReelMonster[] =
        [];

      pokemonList.forEach(
        (pokemon) => {
          const id =
            getMonsterId(
              pokemon
            );

          const name =
            getMonsterName(
              pokemon
            );

          if (!id || !name) {
            return;
          }

          if (seen.has(id)) {
            return;
          }

          /*
           * Pokémon without a valid
           * hunt location can NEVER
           * be selected.
           */
          if (
            !hasValidLocation(
              pokemon,
              season,
              encounterFilter,
              hordeFilter,
              lureFilter
            )
          ) {
            return;
          }

          seen.add(id);

          pool.push({
            id,
            name,
          });
        }
      );

      return pool;
    }, [
      season,
      encounterFilter,
      hordeFilter,
      lureFilter,
    ]);

  /* ==========================================================
     SELECTED DATA
  ========================================================== */

  const selectedMonster =
    useMemo(() => {
      if (!selected) {
        return null;
      }

      return (
        pokemonList.find(
          (pokemon) =>
            getMonsterId(
              pokemon
            ) === selected.id
        ) ?? null
      );
    }, [selected]);

  const selectedLocations =
    useMemo(() => {
      if (
        !selectedMonster
      ) {
        return [];
      }

      return getLocations(
        selectedMonster,
        season,
        encounterFilter,
        hordeFilter,
        lureFilter
      );
    }, [
      selectedMonster,
      season,
      encounterFilter,
      hordeFilter,
      lureFilter,
    ]);

  /* ==========================================================
     INITIAL REELS
  ========================================================== */

  useEffect(() => {
    if (
      shuntablePokemon.length ===
      0
    ) {
      setReels([
        [],
        [],
        [],
      ]);

      return;
    }

    /*
     * Don't touch the reels while
     * the machine is spinning or
     * displaying a locked winner.
     */
    if (
      spinning ||
      reelLocked
    ) {
      return;
    }

    /*
     * Only create initial reels
     * when they are empty.
     */
    if (
      reels.some(
        (reel) =>
          reel.length === 0
      )
    ) {
      const winner =
        randomPokemon(
          shuntablePokemon
        );

      setReels([
        buildReel(
          shuntablePokemon,
          winner
        ),
        buildReel(
          shuntablePokemon,
          winner
        ),
        buildReel(
          shuntablePokemon,
          winner
        ),
      ]);
    }
  }, [
    shuntablePokemon,
    reels,
    spinning,
    reelLocked,
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
     FILTER RESET
  ========================================================== */

  function resetMachineForFilter(): void {
    if (spinning) {
      return;
    }

    setSelected(null);
    setReelLocked(false);
    setReels([[], [], []]);
  }

  function changeSeason(nextSeason: Season): void {
    if (spinning) {
      return;
    }

    setSeason(nextSeason);
    resetMachineForFilter();
  }

  function changeEncounter(nextFilter: EncounterFilter): void {
    if (spinning) {
      return;
    }

    setEncounterFilter(nextFilter);
    resetMachineForFilter();
  }

  function changeHorde(nextFilter: HordeFilter): void {
    if (spinning) {
      return;
    }

    setHordeFilter(nextFilter);
    resetMachineForFilter();
  }

  function changeLure(nextFilter: LureFilter): void {
    if (spinning) {
      return;
    }

    setLureFilter(nextFilter);
    resetMachineForFilter();
  }

  /* ==========================================================
     SHUNT AGAIN
  ========================================================== */

  function shuntAgain(): void {
    /*
     * Absolutely no new spin while
     * the previous spin is running.
     */
    if (spinning) {
      return;
    }

    if (
      shuntablePokemon.length ===
      0
    ) {
      return;
    }

    playClickSound();

    /*
     * Pick ONE winner.
     *
     * That exact Pokémon goes into
     * all three reels at STOP_INDEX.
     */
    const winner =
      randomPokemon(
        shuntablePokemon,
        selected?.id
      );

    const reelOne =
      buildReel(
        shuntablePokemon,
        winner
      );

    const reelTwo =
      buildReel(
        shuntablePokemon,
        winner
      );

    const reelThree =
      buildReel(
        shuntablePokemon,
        winner
      );

    /*
     * Hide the previous result.
     */
    setSelected(null);

    /*
     * IMPORTANT:
     *
     * Unlock the reels BEFORE replacing
     * them so React renders the new
     * spinning reel.
     */
    setReelLocked(false);

    /*
     * New reel data.
     */
    setReels([
      reelOne,
      reelTwo,
      reelThree,
    ]);

    /*
     * Force a new DOM animation instance.
     */
    setSpinId(
      (current) =>
        current + 1
    );

    /*
     * Start animation.
     */
    setSpinning(true);

    if (
      resultTimer.current !==
      null
    ) {
      window.clearTimeout(
        resultTimer.current
      );
    }

    /*
     * Wait for the THIRD reel.
     */
    resultTimer.current =
      window.setTimeout(
        () => {
          /*
           * FIRST lock the physical
           * reel position.
           */
          setReelLocked(true);

          /*
           * THEN stop the animation.
           *
           * Because reelLocked is true,
           * the inline transform below
           * keeps it exactly at STOP_INDEX.
           */
          setSpinning(false);

          /*
           * Show the exact same winner.
           */
          setSelected(winner);

          playClickSound();
        },
        REEL_DURATIONS[2] +
          100
      );
  }

  /* ==========================================================
     THEME
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

          padding:
            24px 14px 60px;

          color: #dceeff;

          overflow-x: hidden;

          border: 0 !important;
          outline: 0 !important;

          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(
                70,
                160,
                255,
                0.08
              ),
              transparent 42%
            );
        }

        .shunt-content {
          width:
            min(
              1060px,
              100%
            );

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

          gap: 8px;

          margin:
            0 auto 20px;
        }

        .season-button {
          appearance: none;

          border:
            1px solid
            rgba(
              105,
              183,
              255,
              0.42
            );

          background:
            rgba(
              4,
              25,
              51,
              0.84
            );

          color:
            #b9d9f6;

          border-radius: 11px;

          min-height: 40px;

          padding:
            0 15px;

          font-size: 13px;

          font-weight: 800;

          cursor: pointer;

          transition:
            transform
              0.15s ease,
            background
              0.15s ease,
            border-color
              0.15s ease;
        }

        .season-button:hover:not(
          :disabled
        ) {
          transform:
            translateY(-1px);

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
              rgba(
                20,
                66,
                105,
                0.96
              ),
              rgba(
                4,
                25,
                51,
                0.96
              )
            );

          box-shadow:
            0 0 18px
            color-mix(
              in srgb,
              var(--season-color)
                30%,
              transparent
            );
        }

        /* ======================================================
           FILTERS
        ====================================================== */

        .filter-section {
          margin:
            0 auto 10px;
          text-align: center;
        }

        .filter-title {
          margin-bottom: 5px;
          color: #7194b5;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .filter-row {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .filter-button {
          appearance: none;
          min-height: 31px;
          padding: 0 11px;
          border: 1px solid rgba(105, 183, 255, 0.28);
          border-radius: 9px;
          background: rgba(4, 25, 51, 0.72);
          color: #9fc2df;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;
        }

        .filter-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: var(--season-color);
        }

        .filter-button.active {
          border-color: var(--season-color);
          background: color-mix(
            in srgb,
            var(--season-color) 18%,
            rgba(4, 25, 51, 0.9)
          );
          color: #fff;
          box-shadow: 0 0 12px color-mix(
            in srgb,
            var(--season-color) 18%,
            transparent
          );
        }

        .filter-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        /* ======================================================
           MACHINE
        ====================================================== */

        .machine {
          width:
            min(
              900px,
              100%
            );

          margin:
            0 auto;

          padding:
            14px;

          box-sizing:
            border-box;

          border-radius:
            22px;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--season-color)
                48%,
              rgba(
                77,
                166,
                235,
                0.5
              )
            );

          background:
            linear-gradient(
              180deg,
              rgba(
                3,
                22,
                45,
                0.98
              ),
              rgba(
                2,
                15,
                31,
                0.99
              )
            );

          box-shadow:
            0 18px 50px
              rgba(
                0,
                0,
                0,
                0.32
              ),
            inset 0 0 35px
              rgba(
                0,
                0,
                0,
                0.32
              );
        }

        /* ======================================================
           MACHINE NAME
        ====================================================== */

        .machine-name {
          text-align:
            center;

          margin:
            0 0 10px;

          color:
            var(--season-color);

          font-size:
            17px;

          font-weight:
            950;

          letter-spacing:
            0.18em;

          text-transform:
            uppercase;

          text-shadow:
            0 0 14px
            color-mix(
              in srgb,
              var(--season-color)
                35%,
              transparent
            );
        }

        /* ======================================================
           REEL FRAME
        ====================================================== */

        .machine-frame {
          position:
            relative;

          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap:
            8px;

          padding:
            8px;

          border-radius:
            17px;

          border:
            1px solid
            rgba(
              110,
              189,
              255,
              0.25
            );

          background:
            rgba(
              0,
              9,
              22,
              0.68
            );
        }

        /* ======================================================
           REEL
        ====================================================== */

        .reel {
          position:
            relative;

          height:
            calc(
              ${CELL_HEIGHT}px *
              3
            );

          overflow:
            hidden;

          border-radius:
            12px;

          border:
            1px solid
            rgba(
              113,
              190,
              255,
              0.25
            );

          background:
            linear-gradient(
              180deg,
              rgba(
                3,
                22,
                42,
                0.98
              ),
              rgba(
                2,
                14,
                28,
                0.98
              )
            );
        }

        .reel::before,
        .reel::after {
          content: "";

          position:
            absolute;

          left: 0;
          right: 0;

          height:
            30%;

          z-index:
            4;

          pointer-events:
            none;
        }

        .reel::before {
          top: 0;

          background:
            linear-gradient(
              180deg,
              rgba(
                0,
                8,
                20,
                0.92
              ),
              transparent
            );
        }

        .reel::after {
          bottom: 0;

          background:
            linear-gradient(
              0deg,
              rgba(
                0,
                8,
                20,
                0.92
              ),
              transparent
            );
        }

        /* ======================================================
           REEL TRACK
        ====================================================== */

        .reel-track {
          width: 100%;

          will-change:
            transform;

          /*
           * NORMAL STATE.
           *
           * This transform is used when
           * the machine is sitting still.
           */
          transform:
            translateY(
              var(--reel-end)
            );
        }

        /*
         * While spinning, the animation overrides
         * the normal transform.
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
         * Motion blur during spin.
         */
        .reel-track.spinning
          .reel-cell img {
          filter:
            blur(
              1.7px
            )
            drop-shadow(
              0 5px 8px
              rgba(
                0,
                0,
                0,
                0.5
              )
            );

          transform:
            scaleY(
              1.06
            );
        }

        .reel-cell {
          height:
            ${CELL_HEIGHT}px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          box-sizing:
            border-box;
        }

        .reel-cell img {
          width:
            70px;

          height:
            70px;

          object-fit:
            contain;

          image-rendering:
            pixelated;

          user-select:
            none;

          pointer-events:
            none;

          filter:
            drop-shadow(
              0 5px 8px
              rgba(
                0,
                0,
                0,
                0.5
              )
            );
        }

        /* ======================================================
           WINNING WINDOW
        ====================================================== */

        .selection-window {
          position:
            absolute;

          z-index:
            5;

          left:
            8px;

          right:
            8px;

          top:
            calc(
              8px +
              ${CELL_HEIGHT}px
            );

          height:
            ${CELL_HEIGHT}px;

          pointer-events:
            none;

          border-top:
            2px solid
            var(--season-color);

          border-bottom:
            2px solid
            var(--season-color);

          border-radius:
            10px;

          box-shadow:
            0 0 20px
            color-mix(
              in srgb,
              var(--season-color)
                32%,
              transparent
            ),

            inset
              0 0 20px
              color-mix(
                in srgb,
                var(--season-color)
                  9%,
                transparent
              );
        }

        /* ======================================================
           ARROWS
        ====================================================== */

        .selection-arrow {
          position:
            absolute;

          top:
            50%;

          transform:
            translateY(
              -50%
            );

          z-index:
            7;

          color:
            var(--season-color);

          font-size:
            21px;

          filter:
            drop-shadow(
              0 0 8px
              color-mix(
                in srgb,
                var(--season-color)
                  65%,
                transparent
              )
            );

          pointer-events:
            none;
        }

        .selection-arrow.left {
          left:
            7px;
        }

        .selection-arrow.right {
          right:
            7px;
        }

        /* ======================================================
           BUTTON
        ====================================================== */

        .machine-controls {
          display:
            flex;

          justify-content:
            center;

          margin-top:
            14px;
        }

        .shunt-button {
          appearance:
            none;

          min-width:
            240px;

          min-height:
            50px;

          border:
            1px solid
            var(--season-color);

          border-radius:
            13px;

          color:
            #071421;

          background:
            var(--season-color);

          font-size:
            15px;

          font-weight:
            950;

          letter-spacing:
            0.08em;

          cursor:
            pointer;

          box-shadow:
            0 0 22px
            color-mix(
              in srgb,
              var(--season-color)
                28%,
              transparent
            );

          transition:
            transform
              0.15s ease,
            filter
              0.15s ease;
        }

        .shunt-button:hover:not(
          :disabled
        ) {
          transform:
            translateY(
              -2px
            );

          filter:
            brightness(
              1.08
            );
        }

        .shunt-button:active:not(
          :disabled
        ) {
          transform:
            translateY(
              1px
            );
        }

        .shunt-button:disabled {
          cursor:
            not-allowed;

          opacity:
            0.55;
        }

        .empty-state {
          margin-top:
            14px;

          text-align:
            center;

          color:
            #87aaca;

          font-size:
            14px;
        }

        /* ======================================================
           RESULT
        ====================================================== */

        .result {
          width:
            min(
              760px,
              100%
            );

          margin:
            24px auto 0;

          padding:
            25px 20px;

          box-sizing:
            border-box;

          text-align:
            center;

          border-radius:
            20px;

          border:
            1px solid
            color-mix(
              in srgb,
              var(--season-color)
                38%,
              rgba(
                90,
                171,
                235,
                0.4
              )
            );

          background:
            linear-gradient(
              180deg,
              rgba(
                4,
                28,
                54,
                0.94
              ),
              rgba(
                2,
                17,
                35,
                0.98
              )
            );
        }

        .result-label {
          color:
            #83b7df;

          font-size:
            12px;

          font-weight:
            900;

          letter-spacing:
            0.24em;

          text-transform:
            uppercase;
        }

        .result-pokemon {
          width:
            175px;

          height:
            175px;

          object-fit:
            contain;

          image-rendering:
            pixelated;

          margin:
            2px auto 0;

          filter:
            drop-shadow(
              0 0 20px
              color-mix(
                in srgb,
                var(--season-color)
                  35%,
                transparent
              )
            );
        }

        .result-number {
          margin-top:
            3px;

          color:
            #8ec6f2;

          font-size:
            14px;

          font-weight:
            800;
        }

        .result-name {
          margin-top:
            2px;

          font-size:
            clamp(
              28px,
              5vw,
              46px
            );

          font-weight:
            950;

          font-style:
            italic;

          text-transform:
            uppercase;

          letter-spacing:
            0.05em;
        }

        .result-description {
          margin-top:
            4px;

          color:
            #8fb7d8;

          font-size:
            14px;
        }

        /* ======================================================
           LOCATIONS
        ====================================================== */

        .locations {
          margin-top:
            22px;

          text-align:
            left;
        }

        .locations-title {
          margin-bottom:
            9px;

          color:
            var(--season-color);

          font-size:
            12px;

          font-weight:
            950;

          letter-spacing:
            0.18em;

          text-transform:
            uppercase;
        }

        .location-list {
          display:
            grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap:
            8px;
        }

        .location-item {
          padding:
            10px 12px;

          border-radius:
            10px;

          border:
            1px solid
            rgba(
              93,
              174,
              235,
              0.22
            );

          background:
            rgba(
              4,
              26,
              49,
              0.72
            );

          color:
            #cce7fb;

          font-size:
            14px;

          font-weight:
            700;
        }

        /* ======================================================
           SEASON GLOW
        ====================================================== */

        .season-spring .machine {
          box-shadow:
            0 18px 50px
              rgba(
                0,
                0,
                0,
                0.32
              ),
            0 0 35px
              rgba(
                255,
                143,
                199,
                0.12
              );
        }

        .season-summer .machine {
          box-shadow:
            0 18px 50px
              rgba(
                0,
                0,
                0,
                0.32
              ),
            0 0 35px
              rgba(
                255,
                216,
                77,
                0.12
              );
        }

        .season-autumn .machine {
          box-shadow:
            0 18px 50px
              rgba(
                0,
                0,
                0,
                0.32
              ),
            0 0 35px
              rgba(
                255,
                154,
                69,
                0.12
              );
        }

        .season-winter .machine {
          box-shadow:
            0 18px 50px
              rgba(
                0,
                0,
                0,
                0.32
              ),
            0 0 35px
              rgba(
                114,
                221,
                255,
                0.12
              );
        }

        /* ======================================================
           MOBILE
        ====================================================== */

        @media (
          max-width: 700px
        ) {
          .shunt-page {
            padding:
              18px 10px 50px;
          }

          .season-filter {
            gap:
              6px;

            margin-bottom:
              16px;
          }

          .season-button {
            min-height:
              38px;

            padding:
              0 11px;

            font-size:
              12px;
          }

          .filter-row {
            gap: 5px;
          }

          .filter-button {
            min-height: 30px;
            padding: 0 9px;
            font-size: 10px;
          }

          .machine {
            padding:
              9px;

            border-radius:
              17px;
          }

          .machine-name {
            font-size:
              14px;

            margin-bottom:
              8px;
          }

          .machine-frame {
            gap:
              5px;

            padding:
              5px;
          }

          .reel-cell img {
            width:
              60px;

            height:
              60px;
          }

          .selection-window {
            left:
              5px;

            right:
              5px;

            top:
              calc(
                5px +
                ${CELL_HEIGHT}px
              );
          }

          .selection-arrow {
            font-size:
              17px;
          }

          .shunt-button {
            width:
              100%;

            min-width:
              0;
          }

          .result {
            padding:
              22px 14px;
          }

          .result-pokemon {
            width:
              150px;

            height:
              150px;
          }

          .location-list {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 430px
        ) {
          .reel-cell img {
            width:
              54px;

            height:
              54px;
          }

          .result-pokemon {
            width:
              135px;

            height:
              135px;
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
                  key={
                    seasonOption
                  }
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
                  disabled={
                    spinning
                  }
                  style={
                    {
                      "--season-color":
                        SEASON_COLORS[
                          seasonOption
                        ],
                    } as CSSProperties
                  }
                >
                  {
                    SEASON_ICONS[
                      seasonOption
                    ]
                  }{" "}
                  {seasonOption}
                </button>
              );
            }
          )}
        </div>

        {/* ====================================================
            ENCOUNTER FILTER
        ==================================================== */}

        <div className="filter-section" aria-label="Encounter filter">
          <div className="filter-title">Encounter</div>
          <div className="filter-row">
            {ENCOUNTER_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-button ${
                  encounterFilter === filter ? "active" : ""
                }`}
                onClick={() => changeEncounter(filter)}
                disabled={spinning}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* ====================================================
            HORDE FILTER
        ==================================================== */}

        <div className="filter-section" aria-label="Horde filter">
          <div className="filter-title">Horde</div>
          <div className="filter-row">
            {HORDE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-button ${
                  hordeFilter === filter ? "active" : ""
                }`}
                onClick={() => changeHorde(filter)}
                disabled={spinning}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* ====================================================
            LURE FILTER
        ==================================================== */}

        <div className="filter-section" aria-label="Lure filter">
          <div className="filter-title">Lure</div>
          <div className="filter-row">
            {LURE_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-button ${
                  lureFilter === filter ? "active" : ""
                }`}
                onClick={() => changeLure(filter)}
                disabled={spinning}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* ====================================================
            MACHINE
        ==================================================== */}

        <section
          className="machine"
          aria-label="Shunt Machine"
        >
          <div className="machine-name">
            Find Your Next Shiny Hunt
          </div>

          <div className="machine-frame">

            {[0, 1, 2].map(
              (reelIndex) => {
                const reel =
                  reels[
                    reelIndex
                  ] ?? [];

                /*
                 * Start position.
                 */
                const startY =
                  CELL_HEIGHT -
                  START_INDEX *
                    CELL_HEIGHT;

                /*
                 * Winning position.
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
                    key={
                      reelIndex
                    }
                  >

                    <div
                      /*
                       * NEW KEY EVERY SPIN.
                       *
                       * This forces the browser
                       * to create a new animation.
                       */
                      key={
                        `track-${spinId}-${reelIndex}`
                      }

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
                           * THIS IS THE IMPORTANT FIX.
                           *
                           * When the animation is over,
                           * keep the transform explicitly
                           * at the winning position.
                           */
                          transform:
                            reelLocked &&
                            !spinning
                              ? `translateY(${endY}px)`
                              : undefined,

                          animationName:
                            spinning
                              ? "shunt-reel-spin"
                              : "none",

                          animationFillMode:
                            "forwards",

                          animationTimingFunction:
                            "cubic-bezier(0.08, 0.72, 0.18, 1)",
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

                    {reelIndex ===
                      0 && (
                      <span className="selection-arrow left">
                        ▶
                      </span>
                    )}

                    {reelIndex ===
                      2 && (
                      <span className="selection-arrow right">
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
              SHUNT AGAIN
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
                shuntablePokemon.length ===
                  0
              }
            >
              {spinning
                ? "FATE IS SPINNING..."
                : "🎰 SHUNT AGAIN"}
            </button>

          </div>

          {shuntablePokemon.length ===
            0 && (
            <div className="empty-state">
              No Pokémon with hunt
              locations match the
              selected filters.
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

            {/* SHINY GIF */}

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
              ).padStart(
                3,
                "0"
              )}
            </div>

            <div className="result-name">
              {selected.name}
            </div>

            <div className="result-description">
              Your next shiny hunt.
            </div>

            {/* ==================================================
                LOCATIONS
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
                          `${location.location_name_full || location.location_name}-${index}`
                        }
                      >
                        📍{" "}
                        {location.location_name_full ||
                          location.location_name}
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