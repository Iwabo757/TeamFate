import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";

import monsters from "../data/monsters.json";

/* ============================================================
   TYPES
============================================================ */

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

  rarity_flags?: number;

  rarity_morning?: string;
  rarity_day?: string;
  rarity_night?: string;

  /* Allows the machine to work if the
     JSON later gets an explicit lure field. */
  lure?: boolean;
  is_lure?: boolean;
  requires_lure?: boolean;
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

/* ============================================================
   DATA
============================================================ */

const pokemonList =
  monsters as Monster[];

const SEASONS: Season[] = [
  "All Seasons",
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
];

const ENCOUNTER_FILTERS: EncounterFilter[] =
  [
    "All",
    "Single",
    "Fishing",
    "Horde",
  ];

const HORDE_FILTERS: HordeFilter[] =
  [
    "All",
    "Horde",
    "No Horde",
  ];

const LURE_FILTERS: LureFilter[] = [
  "All",
  "Lure",
  "No Lure",
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

/* ============================================================
   SLOT MACHINE SETTINGS
============================================================ */

const CELL_HEIGHT = 96;

/*
 * Winner is placed at this exact index.
 *
 * The animation moves the reel until this
 * index is positioned in the center window.
 */
const STOP_INDEX = 46;

/*
 * Each reel deliberately takes longer than
 * the previous one.
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
  value: unknown
): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

/* ============================================================
   SEASONS
============================================================ */

function seasonFromKey(
  value: unknown
): Season | null {
  const normalized =
    normalize(value);

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

  return null;
}

/* ============================================================
   LOCATIONS
============================================================ */

function getAllLocations(
  pokemon: Monster
): MonsterLocation[] {
  if (
    !Array.isArray(
      pokemon.locations
    )
  ) {
    return [];
  }

  return pokemon.locations;
}

function getLocationName(
  location: MonsterLocation
): string {
  return (
    location.location_name_full ||
    location.location_name ||
    ""
  );
}

function getLocationSeason(
  location: MonsterLocation
): Season | null {
  return seasonFromKey(
    location.season
  );
}

/* ============================================================
   HORDE
============================================================ */

function isHorde(
  location: MonsterLocation
): boolean {
  if (
    location.is_horde_3x === true ||
    location.is_horde_5x === true
  ) {
    return true;
  }

  const type =
    normalize(location.type);

  return type.includes("horde");
}

/* ============================================================
   FISHING
============================================================ */

function isFishing(
  location: MonsterLocation
): boolean {
  const type =
    normalize(location.type);

  return (
    type.includes("fish") ||
    type.includes("rod")
  );
}

/* ============================================================
   LURE
============================================================ */

function isLure(
  location: MonsterLocation
): boolean {
  /*
   * Support explicit JSON fields if they
   * are added later.
   */
  if (
    location.lure === true ||
    location.is_lure === true ||
    location.requires_lure === true
  ) {
    return true;
  }

  /*
   * Current data appears to use `type`.
   * This catches types containing "lure".
   */
  const type =
    normalize(location.type);

  return type.includes("lure");
}

/* ============================================================
   SINGLE ENCOUNTER
============================================================ */

function isSingle(
  location: MonsterLocation
): boolean {
  /*
   * Anything explicitly identified as
   * horde, fishing, or lure isn't single.
   */
  if (isHorde(location)) {
    return false;
  }

  if (isFishing(location)) {
    return false;
  }

  if (isLure(location)) {
    return false;
  }

  const type =
    normalize(location.type);

  /*
   * If there is no encounter type,
   * treat it as a normal single location.
   */
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

/* ============================================================
   ENCOUNTER FILTER
============================================================ */

function matchesEncounter(
  location: MonsterLocation,
  filter: EncounterFilter
): boolean {
  switch (filter) {
    case "All":
      return true;

    case "Single":
      return isSingle(location);

    case "Fishing":
      return isFishing(location);

    case "Horde":
      return isHorde(location);

    default:
      return true;
  }
}

/* ============================================================
   HORDE FILTER
============================================================ */

function matchesHorde(
  location: MonsterLocation,
  filter: HordeFilter
): boolean {
  switch (filter) {
    case "All":
      return true;

    case "Horde":
      return isHorde(location);

    case "No Horde":
      return !isHorde(location);

    default:
      return true;
  }
}

/* ============================================================
   LURE FILTER
============================================================ */

function matchesLure(
  location: MonsterLocation,
  filter: LureFilter
): boolean {
  switch (filter) {
    case "All":
      return true;

    case "Lure":
      return isLure(location);

    case "No Lure":
      return !isLure(location);

    default:
      return true;
  }
}

/* ============================================================
   FILTERED LOCATIONS
============================================================ */

function getFilteredLocations(
  pokemon: Monster,
  season: Season,
  encounter: EncounterFilter,
  horde: HordeFilter,
  lure: LureFilter
): MonsterLocation[] {
  const locations =
    getAllLocations(pokemon);

  const seen = new Set<string>();

  return locations.filter(
    (location) => {
      const name =
        getLocationName(location);

      if (!name) {
        return false;
      }

      /*
       * Season filtering.
       *
       * Locations with no season are treated
       * as available in all seasons, matching
       * your current machine behavior.
       */
      const locationSeason =
        getLocationSeason(location);

      if (
        season !== "All Seasons" &&
        locationSeason &&
        locationSeason !== season
      ) {
        return false;
      }

      if (
        !matchesEncounter(
          location,
          encounter
        )
      ) {
        return false;
      }

      if (
        !matchesHorde(
          location,
          horde
        )
      ) {
        return false;
      }

      if (
        !matchesLure(
          location,
          lure
        )
      ) {
        return false;
      }

      /*
       * Prevent duplicate locations.
       */
      const key = [
        location.region_name ?? "",
        name,
        locationSeason ?? "",
        normalize(location.type),
        isHorde(location),
        isLure(location),
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
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
          pokemon.id !== excludeId
      );
  }

  return candidates[
    Math.floor(
      Math.random() *
        candidates.length
    )
  ];
}

/* ============================================================
   BUILD REEL
============================================================ */

function buildReel(
  pool: ReelMonster[],
  winner: ReelMonster
): ReelMonster[] {
  const reel: ReelMonster[] = [];

  /*
   * Everything before the winner is
   * random.
   */
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
   * EXACT SAME WINNER ON ALL REELS.
   */
  reel.push(winner);

  /*
   * Extra cells after the winner.
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

    window.setTimeout(() => {
      void context.close();
    }, 150);
  } catch {
    /* Sound is optional. */
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

  const [
    encounterFilter,
    setEncounterFilter,
  ] = useState<EncounterFilter>(
    "All"
  );

  const [
    hordeFilter,
    setHordeFilter,
  ] = useState<HordeFilter>(
    "All"
  );

  const [
    lureFilter,
    setLureFilter,
  ] = useState<LureFilter>(
    "All"
  );

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

  const [spinId, setSpinId] =
    useState(0);

  const [reelLocked, setReelLocked] =
    useState(false);

  const resultTimer =
    useRef<number | null>(null);

  /* ==========================================================
     SHUNTABLE POOL
  ========================================================== */

  const shuntablePokemon =
    useMemo<ReelMonster[]>(() => {
      const seen =
        new Set<number>();

      const pool: ReelMonster[] = [];

      pokemonList.forEach(
        (pokemon) => {
          const id =
            getMonsterId(pokemon);

          const name =
            getMonsterName(pokemon);

          if (!id || !name) {
            return;
          }

          if (seen.has(id)) {
            return;
          }

          /*
           * A Pokémon is eligible only if
           * at least ONE location satisfies
           * EVERY active filter.
           */
          const validLocations =
            getFilteredLocations(
              pokemon,
              season,
              encounterFilter,
              hordeFilter,
              lureFilter
            );

          if (
            validLocations.length ===
            0
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
     SELECTED MONSTER
  ========================================================== */

  const selectedMonster =
    useMemo(() => {
      if (!selected) {
        return null;
      }

      return (
        pokemonList.find(
          (pokemon) =>
            getMonsterId(pokemon) ===
            selected.id
        ) ?? null
      );
    }, [selected]);

  /* ==========================================================
     SELECTED LOCATIONS
  ========================================================== */

  const selectedLocations =
    useMemo(() => {
      if (!selectedMonster) {
        return [];
      }

      return getFilteredLocations(
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

    if (
      spinning ||
      reelLocked
    ) {
      return;
    }

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
     RESET AFTER FILTER CHANGE
  ========================================================== */

  function resetForFilter(): void {
    if (spinning) {
      return;
    }

    setSelected(null);
    setReelLocked(false);

    setReels([
      [],
      [],
      [],
    ]);
  }

  function changeSeason(
    nextSeason: Season
  ): void {
    if (spinning) {
      return;
    }

    setSeason(nextSeason);

    resetForFilter();
  }

  function changeEncounter(
    next: EncounterFilter
  ): void {
    if (spinning) {
      return;
    }

    setEncounterFilter(next);

    resetForFilter();
  }

  function changeHorde(
    next: HordeFilter
  ): void {
    if (spinning) {
      return;
    }

    setHordeFilter(next);

    resetForFilter();
  }

  function changeLure(
    next: LureFilter
  ): void {
    if (spinning) {
      return;
    }

    setLureFilter(next);

    resetForFilter();
  }

  /* ==========================================================
     SHUNT
  ========================================================== */

  function shunt(): void {
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
     * Select ONE Pokémon.
     *
     * This exact Pokémon is inserted into
     * all three reels.
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

    setSelected(null);

    setReelLocked(false);

    setReels([
      reelOne,
      reelTwo,
      reelThree,
    ]);

    /*
     * New key forces the CSS animation
     * to restart every single time.
     */
    setSpinId(
      (current) =>
        current + 1
    );

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
     * The third reel is the slowest,
     * so we wait for it to finish.
     */
    resultTimer.current =
      window.setTimeout(
        () => {
          /*
           * Lock physical position first.
           */
          setReelLocked(true);

          /*
           * Then stop animation.
           */
          setSpinning(false);

          /*
           * Show the same winner that
           * was placed into every reel.
           */
          setSelected(winner);

          playClickSound();
        },
        REEL_DURATIONS[2] + 100
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

        * {
          box-sizing: border-box;
        }

        .shunt-page {
          width: 100%;
          min-height: 100vh;

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
           FILTER GROUPS
        ====================================================== */

        .filter-group {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;

          gap: 7px;

          margin-bottom: 10px;
        }

        .filter-label {
          width: 100%;

          text-align: center;

          margin-bottom: 2px;

          color: #7899b8;

          font-size: 10px;

          font-weight: 900;

          letter-spacing: 2px;

          text-transform:
            uppercase;
        }

        .filter-button {
          appearance: none;

          border:
            1px solid
            rgba(
              105,
              183,
              255,
              0.35
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

          border-radius:
            10px;

          min-height:
            36px;

          padding:
            0 13px;

          font-size:
            12px;

          font-weight:
            800;

          cursor:
            pointer;

          transition:
            transform
              .15s ease,
            background
              .15s ease,
            border-color
              .15s ease;
        }

        .filter-button:hover:not(
          :disabled
        ) {
          transform:
            translateY(-1px);

          border-color:
            var(--season-color);
        }

        .filter-button.active {
          color:
            #fff;

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
            0 0 16px
            color-mix(
              in srgb,
              var(--season-color)
                28%,
              transparent
            );
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
            18px auto 0;

          padding:
            18px 20px 22px;

          border:
            2px solid
            rgba(
              94,
              177,
              239,
              0.55
            );

          border-radius:
            26px;

          background:
            linear-gradient(
              180deg,
              rgba(
                8,
                35,
                65,
                0.98
              ),
              rgba(
                2,
                16,
                34,
                0.99
              )
            );

          box-shadow:
            0 25px 70px
            rgba(
              0,
              0,
              0,
              0.38
            ),
            inset 0 0 40px
            rgba(
              50,
              140,
              220,
              0.08
            );
        }

        .machine-name {
          text-align:
            center;

          margin-bottom:
            12px;

          color:
            var(--season-color);

          font-size:
            18px;

          font-weight:
            950;

          letter-spacing:
            2px;

          text-transform:
            uppercase;

          text-shadow:
            0 0 15px
            color-mix(
              in srgb,
              var(--season-color)
                35%,
              transparent
            );
        }

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

          border:
            2px solid
            rgba(
              105,
              183,
              255,
              0.4
            );

          border-radius:
            20px;

          background:
            #010b16;

          overflow:
            hidden;
        }

        .reel {
          position:
            relative;

          height:
            300px;

          overflow:
            hidden;

          border:
            1px solid
            rgba(
              120,
              190,
              240,
              0.28
            );

          border-radius:
            14px;

          background:
            linear-gradient(
              180deg,
              rgba(
                0,
                14,
                28,
                0.98
              ),
              rgba(
                3,
                25,
                45,
                0.9
              ),
              rgba(
                0,
                14,
                28,
                0.98
              )
            );
        }

        .reel-track {
          position:
            absolute;

          left:
            0;

          right:
            0;

          top:
            0;

          display:
            flex;

          flex-direction:
            column;

          will-change:
            transform;
        }

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

        .reel-cell {
          height:
            ${CELL_HEIGHT}px;

          min-height:
            ${CELL_HEIGHT}px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;
        }

        .reel-cell img {
          width:
            76px;

          height:
            76px;

          object-fit:
            contain;

          image-rendering:
            pixelated;

          user-select:
            none;

          pointer-events:
            none;
        }

        .selection-window {
          position:
            absolute;

          left:
            6px;

          right:
            6px;

          top:
            calc(
              50% -
              48px
            );

          height:
            96px;

          border:
            2px solid
            var(--season-color);

          border-radius:
            14px;

          box-shadow:
            0 0 20px
            color-mix(
              in srgb,
              var(--season-color)
                35%,
              transparent
            ),
            inset 0 0 18px
            rgba(
              100,
              200,
              255,
              0.06
            );

          pointer-events:
            none;

          z-index:
            5;
        }

        .selection-arrow {
          position:
            absolute;

          top:
            50%;

          transform:
            translateY(-50%);

          color:
            var(--season-color);

          font-size:
            20px;

          font-weight:
            900;

          text-shadow:
            0 0 10px
            var(--season-color);

          z-index:
            6;

          pointer-events:
            none;
        }

        .selection-arrow.left {
          left:
            10px;
        }

        .selection-arrow.right {
          right:
            10px;

          transform:
            translateY(-50%)
            rotate(180deg);
        }

        /* ======================================================
           BUTTON
        ====================================================== */

        .shunt-button,
        .result-shunt-again {
          display:
            block;

          margin:
            16px auto 0;

          min-width:
            190px;

          min-height:
            46px;

          padding:
            0 25px;

          border:
            2px solid
            var(--season-color);

          border-radius:
            999px;

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

          color:
            #fff;

          font-size:
            14px;

          font-weight:
            950;

          letter-spacing:
            1px;

          cursor:
            pointer;

          box-shadow:
            0 0 20px
            color-mix(
              in srgb,
              var(--season-color)
                30%,
              transparent
            );

          transition:
            transform
              .15s ease,
            filter
              .15s ease;
        }

        .shunt-button:hover:not(
          :disabled
        ),
        .result-shunt-again:hover {
          transform:
            translateY(-2px);

          filter:
            brightness(1.15);
        }

        .shunt-button:disabled {
          opacity:
            0.55;

          cursor:
            not-allowed;
        }

        /* ======================================================
           RESULT
        ====================================================== */

        .result {
          width:
            min(
              900px,
              100%
            );

          margin:
            24px auto 0;

          padding:
            24px;

          text-align:
            center;

          border:
            2px solid
            var(--season-color);

          border-radius:
            24px;

          background:
            linear-gradient(
              180deg,
              rgba(
                8,
                35,
                65,
                0.98
              ),
              rgba(
                2,
                16,
                34,
                0.99
              )
            );

          box-shadow:
            0 20px 60px
            rgba(
              0,
              0,
              0,
              0.3
            );
        }

        .result-label {
          color:
            var(--season-color);

          font-size:
            11px;

          font-weight:
            950;

          letter-spacing:
            3px;

          text-transform:
            uppercase;
        }

        .result-pokemon {
          width:
            180px;

          height:
            180px;

          margin:
            8px auto;

          object-fit:
            contain;

          image-rendering:
            pixelated;

          filter:
            drop-shadow(
              0 0 18px
              color-mix(
                in srgb,
                var(--season-color)
                  40%,
                transparent
              )
            );
        }

        .result-number {
          color:
            #7899b8;

          font-size:
            12px;

          font-weight:
            800;

          letter-spacing:
            2px;
        }

        .result h2 {
          margin:
            4px 0 8px;

          color:
            #edf7ff;

          font-size:
            clamp(
              28px,
              5vw,
              42px
            );

          font-weight:
            950;

          font-style:
            italic;

          letter-spacing:
            2px;
        }

        .result-description {
          margin:
            0;

          color:
            #8ea9c4;

          font-size:
            14px;
        }

        .result-divider {
          height:
            1px;

          margin:
            18px 0;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                110,
                190,
                240,
                0.4
              ),
              transparent
            );
        }

        .locations-title {
          margin-bottom:
            12px;

          color:
            var(--season-color);

          font-size:
            12px;

          font-weight:
            950;

          letter-spacing:
            2px;
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
            9px;

          text-align:
            left;
        }

        .location-card {
          padding:
            12px;

          border:
            1px solid
            rgba(
              105,
              183,
              255,
              0.22
            );

          border-radius:
            12px;

          background:
            rgba(
              4,
              25,
              51,
              0.7
            );
        }

        .location-main strong {
          display:
            block;

          color:
            #e7f5ff;

          font-size:
            14px;
        }

        .location-main span {
          display:
            block;

          margin-top:
            3px;

          color:
            #7295b4;

          font-size:
            11px;

          font-weight:
            700;
        }

        .location-details {
          display:
            flex;

          flex-wrap:
            wrap;

          gap:
            5px;

          margin-top:
            8px;
        }

        .location-tag {
          padding:
            3px 7px;

          border:
            1px solid
            rgba(
              105,
              183,
              255,
              0.25
            );

          border-radius:
            5px;

          color:
            #9fd3f8;

          background:
            rgba(
              40,
              100,
              150,
              0.18
            );

          font-size:
            9px;

          font-weight:
            900;
        }

        /* ======================================================
           EMPTY
        ====================================================== */

        .empty-message {
          margin:
            16px auto 0;

          max-width:
            500px;

          padding:
            12px;

          text-align:
            center;

          border:
            1px solid
            rgba(
              255,
              100,
              100,
              0.35
            );

          border-radius:
            12px;

          color:
            #ffb5b5;

          background:
            rgba(
              90,
              20,
              20,
              0.25
            );

          font-size:
            13px;

          font-weight:
            700;
        }

        /* ======================================================
           HELP
        ====================================================== */

        .machine-help {
          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              1fr
            );

          gap:
            10px;

          width:
            min(
              900px,
              100%
            );

          margin:
            18px auto 0;
        }

        .machine-help > div {
          padding:
            14px;

          text-align:
            center;

          border:
            1px solid
            rgba(
              105,
              183,
              255,
              0.2
            );

          border-radius:
            14px;

          background:
            rgba(
              4,
              25,
              51,
              0.5
            );
        }

        .machine-help span {
          display:
            block;

          margin-bottom:
            5px;

          font-size:
            20px;
        }

        .machine-help strong {
          display:
            block;

          color:
            #dceeff;

          font-size:
            11px;

          letter-spacing:
            1px;
        }

        .machine-help p {
          margin:
            5px 0 0;

          color:
            #7899b8;

          font-size:
            11px;

          line-height:
            1.4;
        }

        /* ======================================================
           REEL ANIMATION
        ====================================================== */

        @keyframes shunt-reel-spin {
          from {
            transform:
              translateY(
                calc(
                  ${CELL_HEIGHT}px -
                  ${STOP_INDEX}px *
                  ${CELL_HEIGHT}px
                )
              );
          }

          to {
            transform:
              translateY(
                calc(
                  ${CELL_HEIGHT}px -
                  ${STOP_INDEX}px *
                  ${CELL_HEIGHT}px
                )
              );
          }
        }

        /* ======================================================
           MOBILE
        ====================================================== */

        @media (
          max-width: 700px
        ) {
          .shunt-page {
            padding:
              12px 8px 45px;
          }

          .filter-group {
            gap:
              5px;
          }

          .filter-button {
            min-height:
              34px;

            padding:
              0 10px;

            font-size:
              11px;
          }

          .machine {
            padding:
              10px;

            border-radius:
              18px;
          }

          .machine-name {
            font-size:
              14px;

            margin-bottom:
              8px;
          }

          .machine-frame {
            gap:
              4px;

            padding:
              4px;
          }

          .reel {
            height:
              225px;

            border-radius:
              10px;
          }

          .reel-cell {
            height:
              72px;

            min-height:
              72px;
          }

          .reel-cell img {
            width:
              58px;

            height:
              58px;
          }

          .selection-window {
            top:
              calc(
                50% -
                36px
              );

            height:
              72px;
          }

          .selection-arrow {
            font-size:
              15px;
          }

          .result {
            padding:
              18px 12px;
          }

          .result-pokemon {
            width:
              145px;

            height:
              145px;
          }

          .location-list {
            grid-template-columns:
              1fr;
          }

          .machine-help {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 430px
        ) {
          .filter-button {
            padding:
              0 8px;

            font-size:
              10px;
          }

          .reel {
            height:
              190px;
          }

          .reel-cell {
            height:
              62px;

            min-height:
              62px;
          }

          .reel-cell img {
            width:
              50px;

            height:
              50px;
          }

          .selection-window {
            top:
              calc(
                50% -
                31px
              );

            height:
              62px;
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
            FILTERS
        ==================================================== */}

        <div
          className="filter-group"
          aria-label="Season filter"
        >
          <div className="filter-label">
            Season
          </div>

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
                  className={`filter-button ${
                    active
                      ? "active"
                      : ""
                  }`}
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

        <div
          className="filter-group"
          aria-label="Encounter filter"
        >
          <div className="filter-label">
            Encounter
          </div>

          {ENCOUNTER_FILTERS.map(
            (filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-button ${
                  encounterFilter ===
                  filter
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  changeEncounter(
                    filter
                  )
                }
                disabled={
                  spinning
                }
              >
                {filter}
              </button>
            )
          )}
        </div>

        <div
          className="filter-group"
          aria-label="Horde filter"
        >
          <div className="filter-label">
            Horde
          </div>

          {HORDE_FILTERS.map(
            (filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-button ${
                  hordeFilter ===
                  filter
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  changeHorde(
                    filter
                  )
                }
                disabled={
                  spinning
                }
              >
                {filter}
              </button>
            )
          )}
        </div>

        <div
          className="filter-group"
          aria-label="Lure filter"
        >
          <div className="filter-label">
            Lure
          </div>

          {LURE_FILTERS.map(
            (filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-button ${
                  lureFilter ===
                  filter
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  changeLure(
                    filter
                  )
                }
                disabled={
                  spinning
                }
              >
                {filter}
              </button>
            )
          )}
        </div>

        {/* ====================================================
            MACHINE
        ==================================================== */}

        <section
          className="machine"
          aria-label="Find Your Next Shiny Hunt"
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
                      key={`track-${spinId}-${reelIndex}`}
                      className={`reel-track ${
                        spinning
                          ? "spinning"
                          : ""
                      }`}
                      style={
                        {
                          animationDuration:
                            `${duration}ms`,

                          animationName:
                            spinning
                              ? "shunt-reel-spin"
                              : "none",

                          animationFillMode:
                            "forwards",

                          animationTimingFunction:
                            "cubic-bezier(0.08, 0.72, 0.18, 1)",

                          transform:
                            reelLocked &&
                            !spinning
                              ? `translateY(${endY}px)`
                              : undefined,
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
                            key={`${pokemon.id}-${index}`}
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
                  </div>
                );
              }
            )}

            <div className="selection-window" />

            <div className="selection-arrow left">
              ▶
            </div>

            <div className="selection-arrow right">
              ▶
            </div>
          </div>

          {/* ==================================================
              SPIN BUTTON
          ================================================== */}

          {!selected && (
            <button
              type="button"
              className="shunt-button"
              onClick={shunt}
              disabled={
                spinning ||
                shuntablePokemon.length ===
                  0
              }
            >
              {spinning
                ? "FATE IS CHOOSING..."
                : "🎰 SHUNT"}
            </button>
          )}

          {shuntablePokemon.length ===
            0 && (
            <div className="empty-message">
              No Pokémon match the
              selected filters.
            </div>
          )}
        </section>

        {/* ====================================================
            RESULT
        ==================================================== */}

        {selected &&
          selectedMonster && (
            <section className="result">

              <div className="result-label">
                ✦ FATE HAS CHOSEN ✦
              </div>

              <img
                className="result-pokemon"
                src={getShinyGif(
                  selected.id
                )}
                alt={`${selected.name} shiny`}
                onError={(event) => {
                  event.currentTarget.src =
                    getShinySprite(
                      selected.id
                    );
                }}
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

              <h2>
                SHINY{" "}
                {selected.name.toUpperCase()}
              </h2>

              <p className="result-description">
                Fate has chosen your
                next target.
              </p>

              <div className="result-divider" />

              <div className="locations-title">
                📍 HUNT LOCATIONS
              </div>

              <div className="location-list">

                {selectedLocations.map(
                  (
                    location,
                    index
                  ) => {
                    const locationName =
                      getLocationName(
                        location
                      );

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
                            <span className="location-tag">
                              🍂{" "}
                              {
                                location.season
                              }
                            </span>
                          )}

                          {location.type && (
                            <span className="location-tag">
                              🎯{" "}
                              {
                                location.type
                              }
                            </span>
                          )}

                          {isHorde(
                            location
                          ) && (
                            <span className="location-tag">
                              👥 HORDE
                            </span>
                          )}

                          {isFishing(
                            location
                          ) && (
                            <span className="location-tag">
                              🎣 FISHING
                            </span>
                          )}

                          {isLure(
                            location
                          ) && (
                            <span className="location-tag">
                              🧲 LURE
                            </span>
                          )}

                          {location.min_level !==
                            undefined &&
                            location.max_level !==
                              undefined && (
                              <span className="location-tag">
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

              <button
                type="button"
                className="result-shunt-again"
                onClick={
                  shunt
                }
                disabled={
                  spinning
                }
              >
                🎰 SHUNT AGAIN
              </button>

            </section>
          )}

        {/* ====================================================
            HELP
        ==================================================== */}

        {!selected &&
          !spinning && (
            <div className="machine-help">

              <div>
                <span>
                  🎰
                </span>

                <strong>
                  LET FATE DECIDE
                </strong>

                <p>
                  Press SHUNT to
                  randomly choose
                  your next shiny
                  target.
                </p>
              </div>

              <div>
                <span>
                  📍
                </span>

                <strong>
                  LOCATION GUARANTEED
                </strong>

                <p>
                  Every Pokémon
                  selected has a
                  location matching
                  your filters.
                </p>
              </div>

              <div>
                <span>
                  ✨
                </span>

                <strong>
                  FILTER YOUR FATE
                </strong>

                <p>
                  Combine season,
                  encounter, horde,
                  and lure filters.
                </p>
              </div>

            </div>
          )}

      </div>
    </div>
  );
}