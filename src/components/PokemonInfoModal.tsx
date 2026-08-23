import { useEffect, useState } from "react";
import monstersData from "../data/monsters.json";

type DexPokemon = {
  id: number;
  name: string;
  region?: string;
  caught: boolean;
  owners: Record<string, number>;
  screenshots: string[];
  totalCopies: number;
};

type Props = {
  pokemon: DexPokemon;
  onClose: () => void;
  onPokemonClick?: (pokemonId: number) => void;
  defaultTab?: Tab;
};

function getShowdownSpriteName(name: string) {
  return name
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]/g, "");
}

type ApiPokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  abilities: {
    ability: {
      name: string;
    };
    is_hidden: boolean;
  }[];
  types: {
    slot: number;
    type: {
      name: string;
    };
  }[];
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
  moves: {
    move: {
      name: string;
    };
    version_group_details: {
      level_learned_at: number;
      move_learn_method: {
        name: string;
      };
      version_group: {
        name: string;
      };
    }[];
  }[];
};

type ApiSpecies = {
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
  capture_rate: number;
  gender_rate: number;
  growth_rate: {
    name: string;
  };
  egg_groups: {
    name: string;
  }[];
  evolution_chain: {
    url: string;
  };
};

type EvolutionNode = {
  species: {
    name: string;
    url: string;
  };
  evolves_to: EvolutionNode[];
  evolution_details: {
    min_level: number | null;
    item: {
      name: string;
    } | null;
    trigger: {
      name: string;
    } | null;
  }[];
};

type ApiEvolution = {
  chain: EvolutionNode;
};

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
  season: string;
  is_horde_3x: boolean;
  is_horde_5x: boolean;
  rarity_flags: number;
  rarity_morning: string;
  rarity_day: string;
  rarity_night: string;
};

type Monster = {
  id?: number;
  pokemon_id?: number;
  dex_number?: number;
  national_id?: number;
  name: string;
  locations?: MonsterLocation[];
};

const tabs = [
  "Summary",
  "Moves",
  "Base Stats",
  "Type Matchups",
  "Wild Locations",
  "Evolution Tree",
  "Team Fate",
] as const;

type Tab = (typeof tabs)[number];

const typeColors: Record<string, string> = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  electric: "#f8d030",
  grass: "#78c850",
  ice: "#98d8d8",
  fighting: "#c03028",
  poison: "#a040a0",
  ground: "#e0c068",
  flying: "#a890f0",
  psychic: "#f85888",
  bug: "#a8b820",
  rock: "#b8a038",
  ghost: "#705898",
  dragon: "#7038f8",
  dark: "#705848",
  steel: "#b8b8d0",
  fairy: "#ee99ac",
};

function formatName(name: string) {
  return name
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

function formatMoveMethod(name: string) {
  if (name === "level-up") return "Level Up";
  if (name === "machine") return "TM / HM";
  if (name === "egg") return "Egg";
  if (name === "tutor") return "Tutor";
  return formatName(name);
}

function getMoveLearnDetail(
  versionDetails: {
    level_learned_at: number;
    move_learn_method: {
      name: string;
    };
    version_group: {
      name: string;
    };
  }[],
  method: string
) {
  const matching = versionDetails.filter(
    (detail) =>
      detail.move_learn_method.name === method
  );

  if (!matching.length) {
    return null;
  }

  for (const versionGroup of [
    "black-white",
    "black-2-white-2",
  ]) {
    const detail = matching.find(
      (entry) =>
        entry.version_group.name === versionGroup
    );

    if (detail) {
      return detail;
    }
  }

  return matching
    .slice()
    .sort(
      (a, b) =>
        b.level_learned_at - a.level_learned_at
    )[0];
}

function formatStatName(name: string) {
  const names: Record<string, string> = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Attack",
    "special-defense": "Sp. Defense",
    speed: "Speed",
  };

  return names[name] || formatName(name);
}

function cleanFlavorText(text: string) {
  return text.replace(/\n|\f/g, " ");
}

function getEvolutionId(url: string) {
  const parts = url.split("/").filter(Boolean);
  const value = parts[parts.length - 1];
  const id = Number(value);

  return Number.isFinite(id) ? id : null;
}

type TypeRelations = {
  double_damage_from: { name: string }[];
  half_damage_from: { name: string }[];
  no_damage_from: { name: string }[];
};

export default function PokemonInfoModal({
  pokemon,
  onClose,
  onPokemonClick,
  defaultTab = "Summary",
}: Props) {
  const [activeTab, setActiveTab] =
    useState<Tab>(defaultTab);

  const [selectedSeason, setSelectedSeason] =
    useState<string>("Spring");

  const [data, setData] =
    useState<ApiPokemon | null>(null);

  const [species, setSpecies] =
    useState<ApiSpecies | null>(null);

  const [evolution, setEvolution] =
    useState<ApiEvolution | null>(null);

  const [typeRelations, setTypeRelations] =
    useState<Record<string, TypeRelations>>({});


  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    loadPokemon();
  }, [pokemon.id]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [pokemon.id, defaultTab]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function loadPokemon() {
    setLoading(true);
    setError(null);

    try {
      const [
        pokemonResponse,
        speciesResponse,
      ] = await Promise.all([
        fetch(
          `https://pokeapi.co/api/v2/pokemon/${pokemon.id}`
        ),
        fetch(
          `https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}`
        ),
      ]);

      if (
        !pokemonResponse.ok ||
        !speciesResponse.ok
      ) {
        throw new Error(
          "Unable to load Pokémon information."
        );
      }

      const pokemonData =
        await pokemonResponse.json();

      const speciesData =
        await speciesResponse.json();

      setData(pokemonData);
      setSpecies(speciesData);

      if (speciesData.evolution_chain?.url) {
        const evolutionResponse =
          await fetch(
            speciesData.evolution_chain.url
          );

        if (evolutionResponse.ok) {
          setEvolution(
            await evolutionResponse.json()
          );
        }
      }

      const relations: Record<
        string,
        TypeRelations
      > = {};

      for (const type of pokemonData.types) {
        const response = await fetch(
          `https://pokeapi.co/api/v2/type/${type.type.name}`
        );

        if (response.ok) {
          const typeData =
            await response.json();

          relations[type.type.name] =
            typeData.damage_relations;
        }
      }

      setTypeRelations(relations);

    } catch (err) {
      console.error(err);
      setError(
        "Unable to load Pokémon information."
      );
    } finally {
      setLoading(false);
    }
  }

  const monsterLocations = (() => {
    const monsters = monstersData as Monster[];

    const currentMonster = monsters.find((monster) => {
      const monsterId =
        monster.id ??
        monster.pokemon_id ??
        monster.dex_number ??
        monster.national_id;

      return (
        monsterId === pokemon.id ||
        monster.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "") ===
          pokemon.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
      );
    });

    return currentMonster?.locations || [];
  })();

  const seasonOrder = [
    "Spring",
    "Summer",
    "Autumn",
    "Winter",
  ];

  const availableSeasons = seasonOrder.filter(
    (season) =>
      monsterLocations.some(
        (location) => location.season === season
      )
  );

  const effectiveSeasons =
    availableSeasons.length > 0
      ? availableSeasons
      : seasonOrder;

  useEffect(() => {
    if (
      !effectiveSeasons.includes(
        selectedSeason
      )
    ) {
      setSelectedSeason(effectiveSeasons[0]);
    }
  }, [
    pokemon.id,
    selectedSeason,
    effectiveSeasons.join("|"),
  ]);

  const filteredMonsterLocations =
    monsterLocations.filter(
      (location) =>
        location.season === "Any" ||
        location.season === selectedSeason
    );

  const description =
    species?.flavor_text_entries
      ?.find(
        (entry) =>
          entry.language.name === "en"
      )
      ?.flavor_text || "No description available.";

  const shinySprite =
    `https://play.pokemonshowdown.com/sprites/ani-shiny/${getShowdownSpriteName(
      pokemon.name
    )}.gif`;

  const fallbackSprite =
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.id}.png`;

  const weaknesses = new Set<string>();
  const resistances = new Set<string>();
  const immunities = new Set<string>();

  Object.values(typeRelations).forEach(
    (relation) => {
      relation.double_damage_from.forEach(
        (type) => weaknesses.add(type.name)
      );

      relation.half_damage_from.forEach(
        (type) => resistances.add(type.name)
      );

      relation.no_damage_from.forEach(
        (type) => immunities.add(type.name)
      );
    }
  );

  const totalStats =
    data?.stats.reduce(
      (total, stat) =>
        total + stat.base_stat,
      0
    ) || 0;

  function renderTypeBadge(type: string) {
    return (
      <span
        key={type}
        className="pokemon-type-badge"
        style={{
          background:
            typeColors[type] || "#555",
        }}
      >
        {formatName(type)}
      </span>
    );
  }

  function getEvolutionStages(root: EvolutionNode) {
    const stages: EvolutionNode[][] = [];

    function walk(node: EvolutionNode, depth: number) {
      if (!stages[depth]) {
        stages[depth] = [];
      }

      stages[depth].push(node);

      node.evolves_to.forEach((child) =>
        walk(child, depth + 1)
      );
    }

    walk(root, 0);
    return stages;
  }

  function getEvolutionMethod(node: EvolutionNode) {
    const details = node.evolution_details?.[0];

    if (!details) {
      return null;
    }

    if (details.item) {
      return `Use ${formatName(details.item.name)}`;
    }

    if (details.min_level) {
      return `Level ${details.min_level}`;
    }

    if (details.trigger?.name === "level-up") {
      return "Level Up";
    }

    if (details.trigger) {
      return formatName(details.trigger.name);
    }

    return "Special";
  }

  function renderEvolutionCard(
    node: EvolutionNode,
    stageIndex: number
  ) {
    const name = node.species.name;
    const pokemonId = getEvolutionId(
      node.species.url
    );

    const staticSprite = pokemonId
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/0.png`;

    const animatedSprite =
      `https://play.pokemonshowdown.com/sprites/ani-shiny/${getShowdownSpriteName(
        name
      )}.gif`;

    return (
      <button
        type="button"
        key={`${stageIndex}-${name}`}
        className="evolution-card-reference"
        onClick={() => {
          if (pokemonId && onPokemonClick) {
            onPokemonClick(pokemonId);
          }

          setActiveTab("Summary");
        }}
        title={`View ${formatName(name)} summary`}
      >
        <img
          src={staticSprite}
          alt={`Shiny ${formatName(name)}`}
          className="evolution-sprite-reference"
          onMouseEnter={(event) => {
            event.currentTarget.src =
              animatedSprite;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.src =
              staticSprite;
          }}
          onError={(event) => {
            event.currentTarget.src =
              staticSprite;
          }}
        />

        <strong>
          {formatName(name)}
        </strong>

        {pokemonId && (
          <span className="evolution-dex-number">
            #{String(pokemonId).padStart(3, "0")}
          </span>
        )}
      </button>
    );
  }

  function renderEvolutionTree(root: EvolutionNode) {
    const stages = getEvolutionStages(root);

    return (
      <div className="evolution-tree-reference">
        {stages.map((stage, stageIndex) => (
          <>
            {stageIndex > 0 && (
              <div
                key={`connectors-${stageIndex}`}
                className="evolution-connectors-reference"
              >
                {stage.map((node) => {
                  const method =
                    getEvolutionMethod(node);

                  return (
                    <div
                      key={`connector-${stageIndex}-${node.species.name}`}
                      className="evolution-connector-reference"
                    >
                      <span className="evolution-arrow-reference">
                        →
                      </span>

                      {method && (
                        <span className="evolution-requirement-reference">
                          ▥ {method}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div
              key={`stage-${stageIndex}`}
              className="evolution-stage-list-reference"
            >
              {stage.map((node) =>
                renderEvolutionCard(
                  node,
                  stageIndex
                )
              )}
            </div>
          </>
        ))}
      </div>
    );
  }

  function getSeasonClass(season: string) {
    return season.toLowerCase();
  }

  function getRarityClass(value: string) {
    const normalized = value.toLowerCase();

    if (normalized.includes("special")) return "special";
    if (normalized.includes("10")) return "very-common";
    if (normalized.includes("20")) return "common";
    if (normalized.includes("30")) return "uncommon";
    if (normalized.includes("40")) return "rare";

    return "default";
  }

  function getMethodIcon(method: string) {
    const normalized = method.toLowerCase();

    if (normalized.includes("grass")) return "🌿";
    if (normalized.includes("water")) return "💧";
    if (normalized.includes("surf")) return "🌊";
    if (normalized.includes("fish")) return "🎣";
    if (normalized.includes("cave")) return "🪨";

    return "✦";
  }

  return (
    <div
      className="pokemon-info-overlay"
      onClick={onClose}
    >
      <div
        className="pokemon-info-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <style>{`
          .pokemon-info-overlay {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: grid;
            place-items: center;
            padding: 18px;
            background: rgba(1, 8, 18, 0.72);
            backdrop-filter: blur(8px);
          }

          .pokemon-info-modal {
            width: min(1120px, 94vw);
            height: min(900px, 94vh);
            max-height: 94vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .pokemon-info-header {
            flex: 0 0 auto;
            padding-top: 8px !important;
            padding-bottom: 6px !important;
          }

          .pokemon-info-header h2 {
            margin: 0 !important;
            line-height: 1 !important;
          }

          .pokemon-info-number {
            margin-top: 3px !important;
            line-height: 1 !important;
          }

          .pokemon-info-tabs {
            flex: 0 0 58px;
            height: 58px;
            min-height: 58px;
            display: flex;
            flex-wrap: nowrap;
            overflow: hidden;
          }

          .pokemon-info-tabs button {
            flex: 1 1 0;
            min-width: 0;
            height: 58px;
            min-height: 58px;
            padding: 0 8px;
            white-space: nowrap;
            font-size: clamp(0.78rem, 1.1vw, 1rem);
          }

          .pokemon-info-content {
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
            display: flex;
          }

          .pokemon-tab-section {
            flex: 1 1 auto;
            height: 100%;
            min-height: 0;
            overflow: hidden;
          }

          .pokemon-summary {
            display: grid;
            grid-template-columns: minmax(210px, 0.75fr) minmax(0, 2.25fr);
            gap: 18px;
            min-height: 0;
          }

          .pokemon-summary-left {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-width: 0;
          }

          .pokemon-large-sprite {
            width: min(220px, 18vw);
            height: min(220px, 18vw);
            object-fit: contain;
          }

          .pokemon-summary-right {
            display: grid;
            grid-template-columns: 1.1fr 1.15fr 1fr;
            gap: 12px;
          }

          .pokemon-summary-right .pokemon-info-card {
            margin: 0;
            padding: 14px;
          }

          .pokemon-summary-right .pokemon-info-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .pokemon-summary-right .ability-list {
            gap: 6px;
          }

          .move-level-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            width: 100%;
          }

          .move-level-list .move-card {
            width: 100%;
            min-height: 42px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .move-name {
            min-width: 0;
          }

          .move-level {
            flex: 0 0 auto;
            font-weight: 700;
            white-space: nowrap;
          }

          /* Evolution Tree */
          .evolution-tree-reference {
            display: flex;
            align-items: stretch;
            justify-content: center;
            width: 100%;
            height: 100%;
            min-height: 0;
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
            gap: clamp(6px, 0.9vw, 14px);
            padding: 8px;
            overflow: hidden;
          }

          .evolution-stage-list-reference {
            flex: 1 1 0;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: stretch;
            gap: 6px;
          }

          .evolution-card-reference {
            appearance: none;
            width: 100%;
            min-width: 0;
            min-height: 0;
            flex: 1 1 0;
            box-sizing: border-box;
            padding: clamp(7px, 0.8vw, 12px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            border: 1px solid rgba(54, 132, 202, 0.32);
            border-radius: 12px;
            background: linear-gradient(
              145deg,
              rgba(12, 31, 55, 0.98),
              rgba(8, 23, 42, 0.98)
            );
            color: inherit;
            font: inherit;
            cursor: pointer;
            overflow: hidden;
          }

          .evolution-card-reference:hover,
          .evolution-card-reference:focus-visible {
            transform: translateY(-2px);
            border-color: #1487ff;
            outline: none;
          }

          .evolution-sprite-reference {
            width: clamp(40px, 4.6vw, 64px);
            height: clamp(40px, 4.6vw, 64px);
            object-fit: contain;
            image-rendering: pixelated;
            flex: 0 0 auto;
          }

          .evolution-card-reference strong {
            width: 100%;
            min-width: 0;
            overflow-wrap: anywhere;
            text-align: center;
            font-size: clamp(0.78rem, 1.15vw, 1.05rem);
            line-height: 1.05;
          }

          .evolution-dex-number {
            color: #b9c5d6;
            font-size: clamp(0.7rem, 0.9vw, 0.86rem);
            font-weight: 700;
          }

          .evolution-connectors-reference {
            flex: 0 1 clamp(76px, 9vw, 130px);
            min-width: 0;
            max-width: clamp(76px, 9vw, 130px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
          }

          .evolution-connector-reference {
            flex: 1 1 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            min-width: 0;
            width: 100%;
          }

          .evolution-arrow-reference {
            flex: 0 0 auto;
            color: #d9e2ee;
            font-size: clamp(1.45rem, 2vw, 2.2rem);
            line-height: 1;
            white-space: nowrap;
          }

          .evolution-requirement-reference {
            min-width: 0;
            max-width: 100%;
            color: #d8e1ec;
            font-size: clamp(0.62rem, 0.8vw, 0.82rem);
            font-weight: 800;
            line-height: 1.1;
            text-align: center;
            overflow-wrap: anywhere;
          }

          /* Wild Locations */
          .wild-locations-reference-card {
            width: 100%;
            height: 100%;
            min-height: 0;
            max-width: 100%;
            min-width: 0;
            padding: 18px 22px 12px;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
          }

          .wild-locations-reference-card > h3,
          .season-reference-label,
          .season-reference-buttons,
          .wild-reference-legend,
          .no-season-locations {
            flex: 0 0 auto;
          }

          .season-reference-label {
            margin: 4px 0 8px;
            color: #aebbcf;
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .season-reference-buttons {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 10px;
          }

          .season-reference-button {
            min-width: 0;
            min-height: 42px;
            padding: 6px 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            border: 1px solid rgba(142, 169, 199, 0.3);
            border-radius: 10px;
            background: rgba(7, 24, 44, 0.85);
            color: #d7e1ef;
            font: inherit;
            font-size: clamp(0.76rem, 1vw, 0.94rem);
            font-weight: 900;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            cursor: pointer;
          }

          .season-reference-icon {
            font-size: 1.12rem;
            line-height: 1;
          }

          .season-reference-button.spring { border-color: #d968aa; color: #f4a0d1; }
          .season-reference-button.summer { border-color: #ffae00; color: #ffd23f; }
          .season-reference-button.autumn { border-color: #ff8500; color: #ffad4f; }
          .season-reference-button.winter { border-color: #2cc8e8; color: #79ddf5; }

          .season-reference-button.active.spring { background: rgba(146, 42, 101, 0.22); box-shadow: 0 0 0 1px rgba(217, 104, 170, 0.28); }
          .season-reference-button.active.summer { background: rgba(117, 77, 0, 0.38); box-shadow: 0 0 14px rgba(255, 174, 0, 0.35); }
          .season-reference-button.active.autumn { background: rgba(121, 59, 0, 0.24); box-shadow: 0 0 0 1px rgba(255, 133, 0, 0.28); }
          .season-reference-button.active.winter { background: rgba(0, 104, 135, 0.22); box-shadow: 0 0 0 1px rgba(44, 200, 232, 0.3); }

          /* Only this table box scrolls vertically. */
          .wild-reference-table-wrap {
            flex: 1 1 auto;
            width: 100%;
            min-width: 0;
            min-height: 0;
            max-width: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            overscroll-behavior: contain;
            scrollbar-gutter: stable;
            border: 1px solid rgba(50, 103, 150, 0.4);
            border-radius: 12px;
          }

          .wild-reference-table {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            background: rgba(5, 18, 34, 0.42);
          }

          .wild-reference-table thead th {
            position: sticky;
            top: 0;
            z-index: 10;
            background: rgba(19, 49, 80, 0.98);
            box-shadow: 0 1px 0 rgba(70, 125, 175, 0.45);
          }

          .wild-reference-table th,
          .wild-reference-table td {
            min-width: 0;
            box-sizing: border-box;
            padding: clamp(7px, 0.8vw, 12px) clamp(4px, 0.8vw, 12px);
            color: #d6dce6;
            text-align: center;
            white-space: normal;
            overflow-wrap: anywhere;
            border-top: 1px solid rgba(55, 91, 125, 0.38);
          }

          .wild-reference-table th {
            color: #aebed4;
            font-size: clamp(0.68rem, 1vw, 0.84rem);
            font-weight: 900;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }

          .wild-reference-table th:nth-child(1),
          .wild-reference-table td:nth-child(1) { width: 12%; }
          .wild-reference-table th:nth-child(2),
          .wild-reference-table td:nth-child(2) { width: 24%; }
          .wild-reference-table th:nth-child(3),
          .wild-reference-table td:nth-child(3) { width: 14%; }
          .wild-reference-table th:nth-child(4),
          .wild-reference-table td:nth-child(4) { width: 10%; }
          .wild-reference-table th:nth-child(5),
          .wild-reference-table td:nth-child(5),
          .wild-reference-table th:nth-child(6),
          .wild-reference-table td:nth-child(6),
          .wild-reference-table th:nth-child(7),
          .wild-reference-table td:nth-child(7) { width: 10%; }
          .wild-reference-table th:nth-child(8),
          .wild-reference-table td:nth-child(8) { width: 10%; }

          .wild-region-cell,
          .wild-location-cell {
            text-align: left !important;
          }

          .wild-region-cell {
            font-size: clamp(0.78rem, 1.2vw, 1.02rem);
          }

          .region-ball {
            display: inline-block;
            margin-right: 6px;
            color: #f0f3f7;
            font-size: 1.1rem;
          }

          .wild-location-cell {
            font-weight: 900;
          }

          .wild-method {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-width: 0;
          }

          .wild-method > span {
            color: #5fd13f;
            font-size: 1.1rem;
          }

          .rarity.very-common { color: #ff9d3f; font-weight: 800; }
          .rarity.common { color: #e9d54b; font-weight: 800; }
          .rarity.uncommon { color: #61b7ef; font-weight: 800; }
          .rarity.rare { color: #df8ed2; font-weight: 800; }
          .rarity.special { color: #df9ce3; font-weight: 800; }
          .rarity.default { color: #aeb7c3; }

          .horde-value { color: #ef90ad; font-weight: 900; }
          .horde-3x { color: #ef90ad; }
          .horde-5x { color: #ff6f91; }

          .wild-reference-legend {
            width: 100%;
            min-width: 0;
            max-width: 100%;
            box-sizing: border-box;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 8px 16px;
            margin-top: 10px;
            padding: 8px 12px;
            border: 1px solid rgba(50, 103, 150, 0.4);
            border-radius: 12px;
            color: #aeb7c3;
            font-size: clamp(0.68rem, 1vw, 0.88rem);
            overflow: hidden;
          }

          .wild-reference-legend i {
            width: 1px;
            height: 14px;
            background: rgba(126, 156, 190, 0.5);
            flex: 0 0 auto;
          }

          @media (max-width: 900px) {
            .pokemon-info-modal {
              width: min(96vw, 720px);
              height: 96vh;
              max-height: 96vh;
            }

            .pokemon-summary {
              grid-template-columns: 1fr;
            }

            .pokemon-large-sprite {
              width: 180px;
              height: 180px;
            }

            .pokemon-summary-right {
              grid-template-columns: 1fr;
            }

            .pokemon-info-tabs,
            .pokemon-info-tabs button {
              height: 50px;
              min-height: 50px;
            }

            .season-reference-buttons {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px;
            }

            .evolution-tree-reference {
              gap: 6px;
              padding-left: 4px;
              padding-right: 4px;
            }

            .evolution-connectors-reference {
              flex-basis: clamp(60px, 10vw, 90px);
              max-width: clamp(60px, 10vw, 90px);
            }

            .evolution-card-reference,
            .evolution-connector-reference {
              min-height: 0;
            }

            .evolution-card-reference {
              padding: 7px 5px;
            }

            .evolution-sprite-reference {
              width: clamp(44px, 7vw, 64px);
              height: clamp(44px, 7vw, 64px);
            }

            .evolution-card-reference strong {
              font-size: clamp(0.72rem, 1.8vw, 0.98rem);
            }

            .wild-reference-table th,
            .wild-reference-table td {
              padding: 8px 4px;
              font-size: clamp(0.64rem, 1.35vw, 0.9rem);
            }
          }

          @media (max-width: 640px) {
            .pokemon-info-tabs button {
              font-size: 0.68rem;
              padding: 0 4px;
            }

            .evolution-tree-reference {
              gap: 4px;
              padding: 3px;
            }

            .evolution-connectors-reference {
              flex: 0 1 52px;
              max-width: 52px;
              gap: 5px;
            }

            .evolution-card-reference,
            .evolution-connector-reference {
              min-height: 0;
            }

            .evolution-card-reference {
              border-radius: 9px;
              padding: 5px 3px;
            }

            .evolution-sprite-reference {
              width: 42px;
              height: 42px;
            }

            .evolution-card-reference strong {
              font-size: 0.68rem;
            }

            .evolution-dex-number {
              font-size: 0.62rem;
            }

            .evolution-arrow-reference {
              font-size: 1.25rem;
            }

            .evolution-requirement-reference {
              font-size: 0.58rem;
            }

            .wild-locations-reference-card {
              padding-left: 10px;
              padding-right: 10px;
            }

            .wild-reference-legend {
              justify-content: flex-start;
            }
          }
        `}</style>
        <button
          className="pokemon-info-close"
          onClick={onClose}
        >
          ×
        </button>

        <header className="pokemon-info-header">
          <div>
            <h2>
              {formatName(pokemon.name)}
            </h2>

            <div className="pokemon-info-number">
              #{String(pokemon.id).padStart(3, "0")}
            </div>
          </div>

          <span
            className={
              pokemon.caught
                ? "pokemon-status captured"
                : "pokemon-status missing"
            }
          >
            {pokemon.caught
              ? "Captured"
              : "Missing"}
          </span>
        </header>

        <nav className="pokemon-info-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={
                activeTab === tab
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab(tab)
              }
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="pokemon-info-content">
          {loading && (
            <div className="pokemon-info-loading">
              Loading Pokémon information...
            </div>
          )}

          {error && (
            <div className="pokemon-info-error">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            data &&
            species && (
              <>
                {activeTab === "Summary" && (
                  <div className="pokemon-summary">
                    <div className="pokemon-summary-left">
                      <img
                        src={shinySprite}
                        alt={pokemon.name}
                        className="pokemon-large-sprite"
                        onError={(e) => {
                          e.currentTarget.src =
                            fallbackSprite;
                        }}
                      />

                      <div className="pokemon-types">
                        {data.types.map(
                          (entry) =>
                            renderTypeBadge(
                              entry.type.name
                            )
                        )}
                      </div>
                    </div>

                    <div className="pokemon-summary-right">
                      <section className="pokemon-info-card">
                        <h3>Description</h3>
                        <p>
                          {cleanFlavorText(
                            description
                          )}
                        </p>
                      </section>

                      <section className="pokemon-info-card">
                        <h3>Measurements</h3>

                        <div className="pokemon-info-grid">
                          <div>
                            <span>Height</span>
                            <strong>
                              {(
                                data.height /
                                10
                              ).toFixed(1)}{" "}
                              m
                            </strong>
                          </div>

                          <div>
                            <span>Weight</span>
                            <strong>
                              {(
                                data.weight /
                                10
                              ).toFixed(1)}{" "}
                              kg
                            </strong>
                          </div>

                          <div>
                            <span>Base EXP</span>
                            <strong>
                              {
                                data.base_experience
                              }
                            </strong>
                          </div>

                          <div>
                            <span>Catch Rate</span>
                            <strong>
                              {
                                species.capture_rate
                              }
                            </strong>
                          </div>

                          <div>
                            <span>Growth</span>
                            <strong>
                              {formatName(
                                species
                                  .growth_rate
                                  .name
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>Region</span>
                            <strong>
                              {pokemon.region ||
                                "Unknown"}
                            </strong>
                          </div>
                        </div>
                      </section>

                      <section className="pokemon-info-card">
                        <h3>Abilities</h3>

                        <div className="ability-list">
                          {data.abilities.map(
                            (ability) => (
                              <div
                                key={
                                  ability.ability
                                    .name
                                }
                              >
                                {formatName(
                                  ability
                                    .ability
                                    .name
                                )}

                                {ability.is_hidden && (
                                  <span>
                                    Hidden
                                  </span>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </section>

                      <section className="pokemon-info-card">
                        <h3>Egg Groups</h3>

                        <div className="tag-list">
                          {species.egg_groups.map(
                            (group) => (
                              <span
                                key={
                                  group.name
                                }
                              >
                                {formatName(
                                  group.name
                                )}
                              </span>
                            )
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                )}

                {activeTab === "Moves" && (
                  <div className="pokemon-tab-section">
                    <h3>Moves</h3>

                    {[
                      "level-up",
                      "machine",
                      "egg",
                      "tutor",
                    ].map((method) => {
                      const moves = data.moves
                        .map((move) => ({
                          move,
                          learnDetail: getMoveLearnDetail(
                            move.version_group_details,
                            method
                          ),
                        }))
                        .filter(
                          (entry) =>
                            entry.learnDetail !== null
                        )
                        .sort((a, b) => {
                          if (method === "level-up") {
                            return (
                              (a.learnDetail
                                ?.level_learned_at || 0) -
                              (b.learnDetail
                                ?.level_learned_at || 0)
                            );
                          }

                          return a.move.move.name.localeCompare(
                            b.move.move.name
                          );
                        });

                      if (!moves.length) {
                        return null;
                      }

                      return (
                        <section
                          key={method}
                          className="pokemon-info-card"
                        >
                          <h3>
                            {formatMoveMethod(method)}
                          </h3>

                          <div
                            className={
                              method === "level-up"
                                ? "move-level-list"
                                : "move-grid"
                            }
                          >
                            {moves.map(
                              ({
                                move,
                                learnDetail,
                              }) => (
                                <div
                                  key={move.move.name}
                                  className="move-card"
                                >
                                  <span className="move-name">
                                    {formatName(
                                      move.move.name
                                    )}
                                  </span>

                                  {method === "level-up" && (
                                    <span className="move-level">
                                      Lv.{" "}
                                      {
                                        learnDetail
                                          ?.level_learned_at
                                      }
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}

                {activeTab === "Base Stats" && (
                  <div className="pokemon-tab-section">
                    <section className="pokemon-info-card">
                      <h3>Base Stats</h3>

                      {data.stats.map(
                        (stat) => (
                          <div
                            key={
                              stat.stat.name
                            }
                            className="stat-row"
                          >
                            <div className="stat-name">
                              {formatStatName(
                                stat.stat.name
                              )}
                            </div>

                            <div className="stat-value">
                              {
                                stat.base_stat
                              }
                            </div>

                            <div className="stat-bar">
                              <div
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (stat.base_stat /
                                      255) *
                                      100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}

                      <div className="stat-total">
                        Base Stat Total:{" "}
                        <strong>
                          {totalStats}
                        </strong>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab ===
                  "Type Matchups" && (
                  <div className="pokemon-tab-section">
                    <section className="pokemon-info-card">
                      <h3>Weak To</h3>

                      <div className="type-matchup-list">
                        {Array.from(
                          weaknesses
                        ).map(
                          renderTypeBadge
                        )}
                      </div>
                    </section>

                    <section className="pokemon-info-card">
                      <h3>Resists</h3>

                      <div className="type-matchup-list">
                        {Array.from(
                          resistances
                        ).map(
                          renderTypeBadge
                        )}
                      </div>
                    </section>

                    <section className="pokemon-info-card">
                      <h3>Immune To</h3>

                      <div className="type-matchup-list">
                        {Array.from(
                          immunities
                        ).map(
                          renderTypeBadge
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab ===
                  "Wild Locations" && (
                  <div className="pokemon-tab-section">
                    <section className="pokemon-info-card wild-locations-reference-card">
                      <h3>Wild Locations</h3>

                      {monsterLocations.length > 0 ? (
                        <>
                          <div className="season-reference-label">
                            Season Filter
                          </div>

                          <div
                            className="season-reference-buttons"
                            role="group"
                            aria-label="Choose season"
                          >
                            {effectiveSeasons.map((season) => (
                              <button
                                type="button"
                                key={season}
                                aria-pressed={
                                  selectedSeason === season
                                }
                                className={`season-reference-button ${getSeasonClass(
                                  season
                                )} ${
                                  selectedSeason === season
                                    ? "active"
                                    : ""
                                }`}
                                onClick={() =>
                                  setSelectedSeason(season)
                                }
                              >
                                <span className="season-reference-icon">
                                  {season === "Spring"
                                    ? "✿"
                                    : season === "Summer"
                                    ? "☀"
                                    : season === "Autumn"
                                    ? "♧"
                                    : "❄"}
                                </span>
                                {season}
                              </button>
                            ))}
                          </div>

                          <div className="wild-reference-table-wrap">
                            <table className="wild-reference-table">
                              <thead>
                                <tr>
                                  <th>Region</th>
                                  <th>Location</th>
                                  <th>Method</th>
                                  <th>Levels</th>
                                  <th>Morning</th>
                                  <th>Day</th>
                                  <th>Night</th>
                                  <th>Horde</th>
                                </tr>
                              </thead>

                              <tbody>
                                {filteredMonsterLocations.map(
                                  (location, index) => (
                                    <tr
                                      key={`${location.location_id}-${location.type}-${location.season}-${index}`}
                                    >
                                      <td className="wild-region-cell">
                                        <span className="region-ball">
                                          ◓
                                        </span>
                                        {location.region_name}
                                      </td>
                                      <td className="wild-location-cell">
                                        {location.location_name_full}
                                      </td>
                                      <td>
                                        <span className="wild-method">
                                          <span>
                                            {getMethodIcon(
                                              location.type
                                            )}
                                          </span>
                                          {formatName(location.type)}
                                        </span>
                                      </td>
                                      <td>
                                        {location.min_level ===
                                        location.max_level
                                          ? location.min_level
                                          : `${location.min_level}-${location.max_level}`}
                                      </td>
                                      <td
                                        className={`rarity ${getRarityClass(
                                          location.rarity_morning
                                        )}`}
                                      >
                                        {location.rarity_morning}
                                      </td>
                                      <td
                                        className={`rarity ${getRarityClass(
                                          location.rarity_day
                                        )}`}
                                      >
                                        {location.rarity_day}
                                      </td>
                                      <td
                                        className={`rarity ${getRarityClass(
                                          location.rarity_night
                                        )}`}
                                      >
                                        {location.rarity_night}
                                      </td>
                                      <td className="horde-value">
                                        {location.is_horde_5x
                                          ? "5×"
                                          : location.is_horde_3x
                                          ? "3×"
                                          : "—"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>

                          {filteredMonsterLocations.length === 0 && (
                            <p className="no-season-locations">
                              No locations are available for this season.
                            </p>
                          )}

                          <div className="wild-reference-legend">
                            <span>-- = Not Available</span>
                            <i />
                            <span className="very-common">
                              10% = Rare
                            </span>
                            <i />
                            <span className="common">
                              20% = Uncommon
                            </span>
                            <i />
                            <span className="uncommon">
                              30% = Common
                            </span>
                            <i />
                            <span className="rare">
                              40% = Very Common
                            </span>
                            <i />
                            <span className="special">
                              Special = Special Encounter
                            </span>
                            <i />
                            <span className="horde-value horde-3x">
                              3× = Horde (3 Pokémon)
                            </span>
                            <i />
                            <span className="horde-value horde-5x">
                              5× = Horde (5 Pokémon)
                            </span>
                          </div>
                        </>
                      ) : (
                        <p>
                          This Pokémon has no recorded
                          PokeMMO wild locations.
                        </p>
                      )}
                    </section>
                  </div>
                )}

                {activeTab ===
                  "Evolution Tree" && (
                  <div className="pokemon-tab-section">
                    <section className="pokemon-info-card">
                      <h3>
                        Evolution Tree
                      </h3>

                      {evolution ? (
                        renderEvolutionTree(
                          evolution.chain
                        )
                      ) : (
                        <p>
                          No evolution data
                          available.
                        </p>
                      )}
                    </section>
                  </div>
                )}

                {activeTab ===
                  "Team Fate" && (
                  <div className="pokemon-tab-section">
                    <section className="pokemon-info-card">
                      <h3>
                        Team Fate Collection
                      </h3>

                      <div className="pokemon-info-grid">
                        <div>
                          <span>Status</span>
                          <strong>
                            {pokemon.caught
                              ? "Captured"
                              : "Not Captured"}
                          </strong>
                        </div>

                        <div>
                          <span>Total Copies</span>
                          <strong>
                            {
                              pokemon.totalCopies
                            }
                          </strong>
                        </div>

                        <div>
                          <span>Region</span>
                          <strong>
                            {pokemon.region ||
                              "Unknown"}
                          </strong>
                        </div>
                      </div>
                    </section>

                    <section className="pokemon-info-card">
                      <h3>Owners</h3>

                      {Object.keys(
                        pokemon.owners
                      ).length > 0 ? (
                        <div className="owner-list">
                          {Object.entries(
                            pokemon.owners
                          ).map(
                            ([
                              owner,
                              count,
                            ]) => (
                              <div
                                key={owner}
                                className="owner-row"
                              >
                                <span>
                                  {owner}
                                </span>

                                <strong>
                                  ×{count}
                                </strong>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p>
                          No Team Fate owners
                          yet.
                        </p>
                      )}
                    </section>

                    <section className="pokemon-info-card">
                      <h3>
                        Shiny Screenshots
                      </h3>

                      {pokemon.screenshots
                        .length > 0 ? (
                        <div className="pokemon-gallery">
                          {pokemon.screenshots.map(
                            (
                              screenshot,
                              index
                            ) => (
                              <img
                                key={index}
                                src={
                                  screenshot
                                }
                                alt={`Shiny screenshot ${
                                  index + 1
                                }`}
                                onClick={() =>
                                  window.open(
                                    screenshot,
                                    "_blank"
                                  )
                                }
                              />
                            )
                          )}
                        </div>
                      ) : (
                        <p>
                          No screenshots uploaded
                          yet.
                        </p>
                      )}
                    </section>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
}