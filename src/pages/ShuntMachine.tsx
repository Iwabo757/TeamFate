import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import monsters from "../data/monsters.json";

type Season = "All Seasons" | "Spring" | "Summer" | "Autumn" | "Winter";
type EncounterFilter = "All" | "Single" | "Fishing";
type HordeFilter = "All" | "Horde" | "No Horde";
type LureFilter = "All" | "Lure" | "No Lure";

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
};

type ReelMonster = { id: number; name: string };

const pokemonList = monsters as Monster[];

const SEASONS: Season[] = ["All Seasons", "Spring", "Summer", "Autumn", "Winter"];
const ENCOUNTERS: EncounterFilter[] = ["All", "Single", "Fishing"];
const HORDE_FILTERS: HordeFilter[] = ["All", "Horde", "No Horde"];
const LURE_FILTERS: LureFilter[] = ["All", "Lure", "No Lure"];

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

const CELL_HEIGHT = 96;
const START_INDEX = 2;
const STOP_INDEX = 46;
const REEL_DURATIONS = [1450, 2250, 3250];

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

function getMonsterId(monster: Monster): number | null {
  const id = monster.id ?? monster.national_dex ?? monster.dex;
  return typeof id === "number" ? id : null;
}

function getMonsterName(monster: Monster): string {
  return monster.name ?? "Unknown Pokémon";
}

function seasonFromKey(value: unknown): Season | null {
  const valueNormalized = normalize(value);
  if (valueNormalized === "spring") return "Spring";
  if (valueNormalized === "summer") return "Summer";
  if (valueNormalized === "autumn" || valueNormalized === "fall") return "Autumn";
  if (valueNormalized === "winter") return "Winter";
  return null;
}

function getLocationName(location: MonsterLocation): string {
  return location.location_name_full || location.location_name || "";
}

function isHorde(location: MonsterLocation): boolean {
  if (location.is_horde_3x === true || location.is_horde_5x === true) return true;
  return normalize(location.type).includes("horde");
}

function isFishing(location: MonsterLocation): boolean {
  const type = normalize(location.type);
  return type.includes("fish") || type.includes("rod");
}

/*
 * Your monsters.json marks lure encounters in the rarity fields:
 * rarity_morning / rarity_day / rarity_night = "Lure".
 * We also support explicit lure fields if they are present.
 */
function isLure(location: MonsterLocation): boolean {
  if (
    location.lure === true ||
    location.is_lure === true ||
    location.requires_lure === true
  ) {
    return true;
  }

  return [
    location.rarity_morning,
    location.rarity_day,
    location.rarity_night,
  ].some((rarity) => normalize(rarity) === "lure");
}

function isSingle(location: MonsterLocation): boolean {
  if (isHorde(location) || isFishing(location) || isLure(location)) return false;

  const type = normalize(location.type);
  if (!type) return true;

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

function matchesEncounter(location: MonsterLocation, filter: EncounterFilter): boolean {
  if (filter === "Single") return isSingle(location);
  if (filter === "Fishing") return isFishing(location);
  return true;
}

function matchesHorde(location: MonsterLocation, filter: HordeFilter): boolean {
  if (filter === "Horde") return isHorde(location);
  if (filter === "No Horde") return !isHorde(location);
  return true;
}

function matchesLure(location: MonsterLocation, filter: LureFilter): boolean {
  if (filter === "Lure") return isLure(location);
  if (filter === "No Lure") return !isLure(location);
  return true;
}

function getFilteredLocations(
  pokemon: Monster,
  season: Season,
  encounter: EncounterFilter,
  horde: HordeFilter,
  lure: LureFilter
): MonsterLocation[] {
  if (!Array.isArray(pokemon.locations)) return [];

  const seen = new Set<string>();

  return pokemon.locations.filter((location) => {
    const name = getLocationName(location);
    if (!name) return false;

    const locationSeason = seasonFromKey(location.season);

    if (
      season !== "All Seasons" &&
      locationSeason &&
      locationSeason !== season
    ) {
      return false;
    }

    if (!matchesEncounter(location, encounter)) return false;
    if (!matchesHorde(location, horde)) return false;
    if (!matchesLure(location, lure)) return false;

    const key = [
      location.region_name ?? "",
      name,
      locationSeason ?? "",
      normalize(location.type),
      isHorde(location),
      isLure(location),
    ].join("|");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getShinySprite(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
}

function getShinyGif(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/${id}.gif`;
}

function randomPokemon(pool: ReelMonster[], excludeId?: number): ReelMonster {
  if (!pool.length) throw new Error("No shuntable Pokémon available.");

  const candidates =
    excludeId !== undefined && pool.length > 1
      ? pool.filter((pokemon) => pokemon.id !== excludeId)
      : pool;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildReel(pool: ReelMonster[], winner: ReelMonster): ReelMonster[] {
  const reel: ReelMonster[] = [];

  for (let i = 0; i < STOP_INDEX; i++) {
    reel.push(randomPokemon(pool));
  }

  // The exact same winner occupies the middle-row stop position on every reel.
  reel.push(winner);

  reel.push(randomPokemon(pool));
  reel.push(randomPokemon(pool));
  reel.push(randomPokemon(pool));

  return reel;
}

function playClickSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(180, context.currentTime);
    gain.gain.setValueAtTime(0.07, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);

    window.setTimeout(() => void context.close(), 150);
  } catch {
    // Audio is optional.
  }
}

export default function ShuntMachine() {
  const [season, setSeason] = useState<Season>("All Seasons");
  const [encounterFilter, setEncounterFilter] = useState<EncounterFilter>("All");
  const [hordeFilter, setHordeFilter] = useState<HordeFilter>("All");
  const [lureFilter, setLureFilter] = useState<LureFilter>("All");

  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState<ReelMonster | null>(null);
  const [reels, setReels] = useState<ReelMonster[][]>([[], [], []]);
  const [spinId, setSpinId] = useState(0);
  const [reelLocked, setReelLocked] = useState(false);
  const resultTimer = useRef<number | null>(null);

  const shuntablePokemon = useMemo<ReelMonster[]>(() => {
    const seen = new Set<number>();
    const pool: ReelMonster[] = [];

    for (const pokemon of pokemonList) {
      const id = getMonsterId(pokemon);
      const name = getMonsterName(pokemon);
      if (!id || !name || seen.has(id)) continue;

      const locations = getFilteredLocations(
        pokemon,
        season,
        encounterFilter,
        hordeFilter,
        lureFilter
      );

      if (!locations.length) continue;

      seen.add(id);
      pool.push({ id, name });
    }

    return pool;
  }, [season, encounterFilter, hordeFilter, lureFilter]);

  const selectedMonster = useMemo(() => {
    if (!selected) return null;
    return pokemonList.find((pokemon) => getMonsterId(pokemon) === selected.id) ?? null;
  }, [selected]);

  const selectedLocations = useMemo(() => {
    if (!selectedMonster) return [];

    return getFilteredLocations(
      selectedMonster,
      season,
      encounterFilter,
      hordeFilter,
      lureFilter
    );
  }, [selectedMonster, season, encounterFilter, hordeFilter, lureFilter]);

  useEffect(() => {
    return () => {
      if (resultTimer.current !== null) {
        window.clearTimeout(resultTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (spinning || reelLocked || !shuntablePokemon.length) return;
    if (!reels.some((reel) => reel.length === 0)) return;

    const winner = randomPokemon(shuntablePokemon);

    setReels([
      buildReel(shuntablePokemon, winner),
      buildReel(shuntablePokemon, winner),
      buildReel(shuntablePokemon, winner),
    ]);
  }, [shuntablePokemon, reels, spinning, reelLocked]);

  function resetMachineForFilter(): void {
    if (spinning) return;
    setSelected(null);
    setReelLocked(false);
    setReels([[], [], []]);
  }

  function changeSeason(value: Season): void {
    if (spinning) return;
    setSeason(value);
    resetMachineForFilter();
  }

  function changeEncounter(value: EncounterFilter): void {
    if (spinning) return;
    setEncounterFilter(value);
    resetMachineForFilter();
  }

  function changeHorde(value: HordeFilter): void {
    if (spinning) return;
    setHordeFilter(value);
    resetMachineForFilter();
  }

  function changeLure(value: LureFilter): void {
    if (spinning) return;
    setLureFilter(value);
    resetMachineForFilter();
  }

  function shuntAgain(): void {
    if (spinning || !shuntablePokemon.length) return;

    playClickSound();

    const winner = randomPokemon(shuntablePokemon, selected?.id);

    const nextReels = [
      buildReel(shuntablePokemon, winner),
      buildReel(shuntablePokemon, winner),
      buildReel(shuntablePokemon, winner),
    ];

    setSelected(null);
    setReelLocked(false);
    setReels(nextReels);

    // New key = fresh CSS animation instance every time.
    setSpinId((value) => value + 1);
    setSpinning(true);

    if (resultTimer.current !== null) {
      window.clearTimeout(resultTimer.current);
    }

    resultTimer.current = window.setTimeout(() => {
      // Lock the exact winning transform before removing the animation class.
      setReelLocked(true);
      setSpinning(false);
      setSelected(winner);
      playClickSound();
    }, REEL_DURATIONS[2] + 100);
  }

  const seasonColor = SEASON_COLORS[season];
  const seasonClass = season.toLowerCase().replace(/\s+/g, "-");

  const FilterRow = <T extends string>({
    title,
    values,
    value,
    onChange,
  }: {
    title: string;
    values: T[];
    value: T;
    onChange: (value: T) => void;
  }) => (
    <div className="filter-section">
      <div className="filter-title">{title}</div>
      <div className="filter-row">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            className={`filter-button ${value === option ? "active" : ""}`}
            onClick={() => onChange(option)}
            disabled={spinning}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={`shunt-page season-${seasonClass}`}
      style={{ "--season-color": seasonColor } as CSSProperties}
    >
      <style>{`
        .shunt-page{width:100%;min-height:100vh;box-sizing:border-box;padding:18px 12px 55px;color:#dceeff;overflow-x:hidden;background:radial-gradient(circle at 50% 15%,rgba(70,160,255,.08),transparent 42%)}
        .shunt-content{width:min(1060px,100%);margin:auto}
        .season-filter,.filter-row{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:7px}
        .season-filter{margin:0 auto 10px}
        .season-button,.filter-button{appearance:none;border:1px solid rgba(105,183,255,.35);background:rgba(4,25,51,.84);color:#b9d9f6;border-radius:10px;min-height:38px;padding:0 13px;font-size:12px;font-weight:850;cursor:pointer;transition:.15s ease}
        .season-button:hover:not(:disabled),.filter-button:hover:not(:disabled){transform:translateY(-1px);border-color:var(--season-color)}
        .season-button.active,.filter-button.active{color:#fff;border-color:var(--season-color);background:linear-gradient(180deg,rgba(20,66,105,.96),rgba(4,25,51,.96));box-shadow:0 0 18px color-mix(in srgb,var(--season-color) 25%,transparent)}
        .filter-section{margin:8px auto}
        .filter-title{text-align:center;margin-bottom:5px;color:#7899b8;font-size:9px;font-weight:950;letter-spacing:2px;text-transform:uppercase}
        .machine{width:min(900px,100%);margin:14px auto 0;padding:14px;box-sizing:border-box;border-radius:22px;border:1px solid color-mix(in srgb,var(--season-color) 48%,rgba(77,166,235,.5));background:linear-gradient(180deg,rgba(3,22,45,.98),rgba(2,15,31,.99));box-shadow:0 18px 50px rgba(0,0,0,.32),inset 0 0 35px rgba(0,0,0,.32)}
        .machine-name{text-align:center;margin:0 0 10px;color:var(--season-color);font-size:17px;font-weight:950;letter-spacing:.18em;text-transform:uppercase;text-shadow:0 0 14px color-mix(in srgb,var(--season-color) 35%,transparent)}
        .machine-frame{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:8px;border-radius:17px;border:1px solid rgba(110,189,255,.25);background:rgba(0,9,22,.68)}
        .reel{position:relative;height:${CELL_HEIGHT * 3}px;overflow:hidden;border-radius:12px;border:1px solid rgba(113,190,255,.25);background:linear-gradient(180deg,rgba(3,22,42,.98),rgba(2,14,28,.98))}
        .reel:before,.reel:after{content:"";position:absolute;left:0;right:0;height:30%;z-index:4;pointer-events:none}
        .reel:before{top:0;background:linear-gradient(180deg,rgba(0,8,20,.92),transparent)}
        .reel:after{bottom:0;background:linear-gradient(0deg,rgba(0,8,20,.92),transparent)}
        .reel-track{width:100%;will-change:transform;transform:translateY(var(--reel-end))}
        .reel-track.spinning{animation-name:shunt-reel-spin;animation-fill-mode:forwards;animation-timing-function:cubic-bezier(.08,.72,.18,1)}
        @keyframes shunt-reel-spin{from{transform:translateY(var(--reel-start))}to{transform:translateY(var(--reel-end))}}
        .reel-track.spinning .reel-cell img{filter:blur(1.7px) drop-shadow(0 5px 8px rgba(0,0,0,.5));transform:scaleY(1.06)}
        .reel-cell{height:${CELL_HEIGHT}px;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
        .reel-cell img{width:70px;height:70px;object-fit:contain;image-rendering:pixelated;user-select:none;pointer-events:none;filter:drop-shadow(0 5px 8px rgba(0,0,0,.5))}
        .selection-window{position:absolute;z-index:5;left:8px;right:8px;top:calc(8px + ${CELL_HEIGHT}px);height:${CELL_HEIGHT}px;pointer-events:none;border-top:2px solid var(--season-color);border-bottom:2px solid var(--season-color);border-radius:10px;box-shadow:0 0 20px color-mix(in srgb,var(--season-color) 32%,transparent),inset 0 0 20px color-mix(in srgb,var(--season-color) 9%,transparent)}
        .selection-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:7;color:var(--season-color);font-size:21px;filter:drop-shadow(0 0 8px color-mix(in srgb,var(--season-color) 65%,transparent));pointer-events:none}.selection-arrow.left{left:7px}.selection-arrow.right{right:7px}
        .machine-controls{display:flex;justify-content:center;margin-top:14px}.shunt-button{appearance:none;min-width:240px;min-height:50px;border:1px solid var(--season-color);border-radius:13px;color:#071421;background:var(--season-color);font-size:15px;font-weight:950;letter-spacing:.08em;cursor:pointer;box-shadow:0 0 22px color-mix(in srgb,var(--season-color) 28%,transparent);transition:.15s ease}.shunt-button:hover:not(:disabled){transform:translateY(-2px);filter:brightness(1.08)}.shunt-button:disabled{cursor:not-allowed;opacity:.55}
        .empty-state{margin-top:14px;text-align:center;color:#87aaca;font-size:14px}
        .result{width:min(760px,100%);margin:24px auto 0;padding:25px 20px;box-sizing:border-box;text-align:center;border-radius:20px;border:1px solid color-mix(in srgb,var(--season-color) 38%,rgba(90,171,235,.4));background:linear-gradient(180deg,rgba(4,28,54,.94),rgba(2,17,35,.98))}
        .result-label{color:#83b7df;font-size:12px;font-weight:900;letter-spacing:.24em;text-transform:uppercase}.result-pokemon{width:175px;height:175px;object-fit:contain;image-rendering:pixelated;margin:2px auto 0;filter:drop-shadow(0 0 20px color-mix(in srgb,var(--season-color) 35%,transparent))}.result-number{margin-top:3px;color:#8ec6f2;font-size:14px;font-weight:800}.result-name{margin-top:2px;font-size:clamp(28px,5vw,46px);font-weight:950;font-style:italic;text-transform:uppercase;letter-spacing:.05em}.result-description{margin-top:4px;color:#8fb7d8;font-size:14px}
        .locations{margin-top:22px;text-align:left}.locations-title{margin-bottom:9px;color:var(--season-color);font-size:12px;font-weight:950;letter-spacing:.18em;text-transform:uppercase}.location-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.location-item{padding:10px 12px;border-radius:10px;border:1px solid rgba(93,174,235,.22);background:rgba(4,26,49,.72);color:#cce7fb;font-size:13px;font-weight:700}
        .location-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.tag{padding:3px 7px;border-radius:5px;border:1px solid rgba(105,183,255,.22);background:rgba(40,100,150,.16);color:#9fd3f8;font-size:9px;font-weight:900}
        @media(max-width:700px){.shunt-page{padding:12px 8px 45px}.season-button,.filter-button{min-height:35px;padding:0 9px;font-size:10px}.machine{padding:9px;border-radius:17px}.machine-name{font-size:13px}.machine-frame{gap:5px;padding:5px}.reel-cell img{width:60px;height:60px}.selection-window{left:5px;right:5px;top:calc(5px + ${CELL_HEIGHT}px)}.selection-arrow{font-size:17px}.shunt-button{width:100%;min-width:0}.result{padding:22px 14px}.result-pokemon{width:150px;height:150px}.location-list{grid-template-columns:1fr}}
        @media(max-width:430px){.reel-cell img{width:54px;height:54px}.result-pokemon{width:135px;height:135px}}
      `}</style>

      <div className="shunt-content">
        <div className="season-filter" aria-label="Season filter">
          {SEASONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`season-button ${season === option ? "active" : ""}`}
              onClick={() => changeSeason(option)}
              disabled={spinning}
              style={{ "--season-color": SEASON_COLORS[option] } as CSSProperties}
            >
              {SEASON_ICONS[option]} {option}
            </button>
          ))}
        </div>

        <FilterRow
          title="Encounter"
          values={ENCOUNTERS}
          value={encounterFilter}
          onChange={changeEncounter}
        />

        <FilterRow
          title="Horde"
          values={HORDE_FILTERS}
          value={hordeFilter}
          onChange={changeHorde}
        />

        <FilterRow
          title="Lure"
          values={LURE_FILTERS}
          value={lureFilter}
          onChange={changeLure}
        />

        <section className="machine" aria-label="Shunt Machine">
          <div className="machine-name">Find Your Next Shiny Hunt</div>

          <div className="machine-frame">
            {[0, 1, 2].map((reelIndex) => {
              const reel = reels[reelIndex] ?? [];
              const startY = CELL_HEIGHT - START_INDEX * CELL_HEIGHT;
              const endY = CELL_HEIGHT - STOP_INDEX * CELL_HEIGHT;
              const duration = REEL_DURATIONS[reelIndex];

              return (
                <div className="reel" key={reelIndex}>
                  <div
                    key={`track-${spinId}-${reelIndex}`}
                    className={`reel-track ${spinning ? "spinning" : ""}`}
                    style={{
                      "--reel-start": `${startY}px`,
                      "--reel-end": `${endY}px`,
                      animationDuration: `${duration}ms`,
                      animationName: spinning ? "shunt-reel-spin" : "none",
                      animationFillMode: "forwards",
                      animationTimingFunction: "cubic-bezier(.08,.72,.18,1)",
                      transform:
                        reelLocked && !spinning
                          ? `translateY(${endY}px)`
                          : undefined,
                    } as CSSProperties}
                  >
                    {reel.map((pokemon, index) => (
                      <div
                        className="reel-cell"
                        key={`${spinId}-${reelIndex}-${index}-${pokemon.id}`}
                      >
                        <img src={getShinySprite(pokemon.id)} alt={pokemon.name} draggable={false} />
                      </div>
                    ))}
                  </div>

                  {reelIndex === 0 && <span className="selection-arrow left">▶</span>}
                  {reelIndex === 2 && <span className="selection-arrow right">◀</span>}
                </div>
              );
            })}

            <div className="selection-window" />
          </div>

          <div className="machine-controls">
            <button
              type="button"
              className="shunt-button"
              onClick={shuntAgain}
              disabled={spinning || shuntablePokemon.length === 0}
            >
              {spinning ? "FATE IS SPINNING..." : "🎰 SHUNT AGAIN"}
            </button>
          </div>

          {!shuntablePokemon.length && (
            <div className="empty-state">
              No Pokémon match the selected filters.
            </div>
          )}
        </section>

        {selected && (
          <section className="result" aria-live="polite">
            <div className="result-label">✦ Fate Has Chosen ✦</div>

            <img
              className="result-pokemon"
              src={getShinyGif(selected.id)}
              alt={`Shiny ${selected.name}`}
              draggable={false}
              onError={(event) => {
                event.currentTarget.src = getShinySprite(selected.id);
              }}
            />

            <div className="result-number">#{String(selected.id).padStart(3, "0")}</div>
            <div className="result-name">{selected.name}</div>
            <div className="result-description">Your next shiny hunt.</div>

            {selectedLocations.length > 0 && (
              <div className="locations">
                <div className="locations-title">Hunt Locations</div>

                <div className="location-list">
                  {selectedLocations.map((location, index) => (
                    <div
                      className="location-item"
                      key={`${getLocationName(location)}-${index}`}
                    >
                      📍 {getLocationName(location)}

                      <div className="location-meta">
                        {location.region_name && <span className="tag">{location.region_name}</span>}
                        {location.season && <span className="tag">{location.season}</span>}
                        {isHorde(location) && <span className="tag">HORDE</span>}
                        {isFishing(location) && <span className="tag">FISHING</span>}
                        {isLure(location) && <span className="tag">LURE</span>}
                        {location.type && <span className="tag">{location.type}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}