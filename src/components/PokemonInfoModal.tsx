import { useEffect, useState } from "react";

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
};

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

type MoveDetail = {
  name: string;
  type: {
    name: string;
  };
  power: number | null;
  pp: number | null;
  accuracy: number | null;
};

type DetailedMove = {
  name: string;
  type: string;
  power: number | null;
  pp: number | null;
  accuracy: number | null;
  method: string;
  level: number;
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

    held_item: {
      name: string;
    } | null;

    trigger: {
      name: string;
    } | null;

    gender: number | null;

    known_move: {
      name: string;
    } | null;

    known_move_type: {
      name: string;
    } | null;

    location: {
      name: string;
    } | null;

    min_happiness: number | null;

    min_affection: number | null;

    min_beauty: number | null;

    time_of_day: string;

    turn_upside_down: boolean;

    relative_physical_stats: number | null;
  }[];
};

type ApiEvolution = {
  chain: EvolutionNode;
};

type TypeRelations = {
  double_damage_from: {
    name: string;
  }[];
  half_damage_from: {
    name: string;
  }[];
  no_damage_from: {
    name: string;
  }[];
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

function getEvolutionName(url: string) {
  const parts = url.split("/");
  return parts[parts.length - 2];
}

function getPokemonIdFromUrl(
  url: string
) {
  const parts = url
    .split("/")
    .filter(Boolean);

  return Number(
    parts[parts.length - 1]
  );
}

function getEvolutionRequirement(
  node: EvolutionNode
) {
  const details =
    node.evolution_details || [];

  if (!details.length) {
    return "Special";
  }

  return details
    .map((detail) => {
      const requirements: string[] = [];

      // Trigger
      if (detail.trigger?.name) {
        const trigger =
          detail.trigger.name;

        if (trigger === "trade") {
          requirements.push("Trade");
        } else if (
          trigger === "use-item"
        ) {
          // Item is displayed below.
        } else if (
          trigger !== "level-up"
        ) {
          requirements.push(
            formatName(trigger)
          );
        }
      }

      // Level
      if (detail.min_level !== null) {
        requirements.push(
          `Level ${detail.min_level}`
        );
      }

      // Evolution item
      if (detail.item?.name) {
        requirements.push(
          `Use ${formatName(
            detail.item.name
          )}`
        );
      }

      // Held item
      if (detail.held_item?.name) {
        requirements.push(
          `Hold ${formatName(
            detail.held_item.name
          )}`
        );
      }

      // Friendship
      if (
        detail.min_happiness !== null
      ) {
        requirements.push(
          `Friendship ${detail.min_happiness}+`
        );
      }

      // Affection
      if (
        detail.min_affection !== null
      ) {
        requirements.push(
          `Affection ${detail.min_affection}+`
        );
      }

      // Beauty
      if (
        detail.min_beauty !== null
      ) {
        requirements.push(
          `Beauty ${detail.min_beauty}+`
        );
      }

      // Time of day
      if (detail.time_of_day) {
        requirements.push(
          `During ${formatName(
            detail.time_of_day
          )}`
        );
      }

      // Gender
      if (detail.gender !== null) {
        if (detail.gender === 1) {
          requirements.push("Male");
        } else if (
          detail.gender === 2
        ) {
          requirements.push("Female");
        }
      }

      // Known move
      if (detail.known_move?.name) {
        requirements.push(
          `Know ${formatName(
            detail.known_move.name
          )}`
        );
      }

      // Known move type
      if (
        detail.known_move_type?.name
      ) {
        requirements.push(
          `Know a ${formatName(
            detail.known_move_type.name
          )}-type move`
        );
      }

      // Location
      if (detail.location?.name) {
        requirements.push(
          `At ${formatName(
            detail.location.name
          )}`
        );
      }

      // Special physical-stat requirement
      if (
        detail.relative_physical_stats !==
        null
      ) {
        if (
          detail.relative_physical_stats ===
          1
        ) {
          requirements.push(
            "Attack > Defense"
          );
        } else if (
          detail.relative_physical_stats ===
          -1
        ) {
          requirements.push(
            "Defense > Attack"
          );
        } else if (
          detail.relative_physical_stats ===
          0
        ) {
          requirements.push(
            "Attack = Defense"
          );
        }
      }

      // Turn upside down
      if (detail.turn_upside_down) {
        requirements.push(
          "Turn console upside down"
        );
      }

      return requirements.length
        ? requirements.join(" • ")
        : "Special";
    })
    .join(" / ");
}

function calculateTypeMatchups(
  types: string[],
  relations: Record<string, TypeRelations>
) {
  const allTypes = [
    "normal",
    "fire",
    "water",
    "electric",
    "grass",
    "ice",
    "fighting",
    "poison",
    "ground",
    "flying",
    "psychic",
    "bug",
    "rock",
    "ghost",
    "dragon",
    "dark",
    "steel",
    "fairy",
  ];

  return allTypes.map((attackType) => {
    let multiplier = 1;

    for (const defendingType of types) {
      const relation =
        relations[defendingType];

      if (!relation) continue;

      if (
        relation.double_damage_from.some(
          (type) =>
            type.name === attackType
        )
      ) {
        multiplier *= 2;
      }

      if (
        relation.half_damage_from.some(
          (type) =>
            type.name === attackType
        )
      ) {
        multiplier *= 0.5;
      }

      if (
        relation.no_damage_from.some(
          (type) =>
            type.name === attackType
        )
      ) {
        multiplier *= 0;
      }
    }

    return {
      type: attackType,
      multiplier,
    };
  });
}

function getMatchupLabel(
  multiplier: number
) {
  if (multiplier === 0) {
    return "Immune";
  }

  if (multiplier === 0.25) {
    return "¼×";
  }

  if (multiplier === 0.5) {
    return "½×";
  }

  if (multiplier === 1) {
    return "1×";
  }

  if (multiplier === 2) {
    return "2×";
  }

  if (multiplier === 4) {
    return "4×";
  }

  return `${multiplier}×`;
}


export default function PokemonInfoModal({
  pokemon,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<Tab>("Summary");

  const [data, setData] =
    useState<ApiPokemon | null>(null);

  const [species, setSpecies] =
    useState<ApiSpecies | null>(null);

  const [evolution, setEvolution] =
    useState<ApiEvolution | null>(null);

  const [typeRelations, setTypeRelations] =
    useState<Record<string, TypeRelations>>({});

const [locations, setLocations] =
  useState<any[]>([]);

const [moveDetails, setMoveDetails] =
  useState<DetailedMove[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    loadPokemon();
  }, [pokemon.id]);

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

const detailedMoves: DetailedMove[] = [];

for (const moveEntry of pokemonData.moves) {
  try {
    const moveResponse = await fetch(
      moveEntry.move.url
    );

    if (!moveResponse.ok) continue;

    const moveData: MoveDetail =
      await moveResponse.json();

    const relevantDetails =
      moveEntry.version_group_details
        .filter(
          (detail: any) =>
            [
              "level-up",
              "machine",
              "egg",
              "tutor",
            ].includes(
              detail.move_learn_method.name
            )
        );

    for (const detail of relevantDetails) {
detailedMoves.push({
  name: moveData.name,
  type: moveData.type.name,
  power: moveData.power,
  pp: moveData.pp,
  accuracy: moveData.accuracy,
  method:
    detail.move_learn_method.name,
  level:
    detail.level_learned_at,
});
    }
  } catch (err) {
    console.error(
      "Failed to load move:",
      moveEntry.move.name,
      err
    );
  }
}

setMoveDetails(detailedMoves);

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

try {
  const locationResponse =
    await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemon.id}/encounters`
    );

  if (locationResponse.ok) {
    const locationData =
      await locationResponse.json();

    setLocations(locationData);
  } else {
    setLocations([]);
  }
} catch {
  setLocations([]);
}
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load Pokémon information."
      );
    } finally {
      setLoading(false);
    }
  }

  const description =
    species?.flavor_text_entries
      ?.find(
        (entry) =>
          entry.language.name === "en"
      )
      ?.flavor_text || "No description available.";

  const shinySprite =
    `https://play.pokemonshowdown.com/sprites/ani-shiny/${pokemon.id}.gif`;

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

function renderEvolutionTree(
  node: EvolutionNode
): React.ReactNode {
  const renderNode = (
    currentNode: EvolutionNode,
    depth = 0
  ): React.ReactNode => {
    const name = getEvolutionName(
      currentNode.species.url
    );

    const evolutions =
      currentNode.evolves_to || [];

    return (
      <div
        key={`${name}-${depth}`}
        className="evolution-level"
      >
        <div className="evolution-card">
          <div className="evolution-number">
            #{name
              ? String(
                  getPokemonIdFromUrl(
                    currentNode.species.url
                  )
                ).padStart(3, "0")
              : "---"}
          </div>

          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getPokemonIdFromUrl(
              currentNode.species.url
            )}.png`}
            alt={formatName(name)}
            className="evolution-sprite"
          />

          <strong>
            {formatName(name)}
          </strong>
        </div>

        {evolutions.length > 0 && (
          <div className="evolution-branches">
            {evolutions.map(
              (
                nextEvolution,
                index
              ) => {
                const requirement =
                  getEvolutionRequirement(
                    nextEvolution
                  );

                return (
                  <div
                    key={`${name}-evolution-${index}`}
                    className="evolution-branch"
                  >
                    <div className="evolution-arrow">
                      <span className="evolution-line" />
                      <span className="evolution-requirement">
                        {requirement}
                      </span>
                      <span className="evolution-arrow-head">
                        →
                      </span>
                    </div>

                    <div className="evolution-next">
                      {renderNode(
                        nextEvolution,
                        depth + 1
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    );
  };

  return renderNode(node);
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
        <button
          className="pokemon-info-close"
          onClick={onClose}
        >
          ×
        </button>

        <header className="pokemon-info-header">
          <div>
            <div className="pokemon-info-number">
              #{String(pokemon.id).padStart(3, "0")}
            </div>

            <h2>
              {formatName(pokemon.name)}
            </h2>
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

    {(
      [
        "level-up",
        "machine",
        "egg",
        "tutor",
      ] as const
    ).map((method) => {
      const moves = moveDetails
        .filter(
          (move) => move.method === method
        )
        .sort((a, b) => {
          if (method === "level-up") {
            return a.level - b.level;
          }

          return a.name.localeCompare(b.name);
        });

      if (!moves.length) return null;

      return (
        <section
          key={method}
          className="pokemon-info-card"
        >
          <h3>
            {formatMoveMethod(method)}
          </h3>

          <div className="pokemon-moves-table">
            <div className="pokemon-moves-header">
              <span>
                {method === "level-up"
                  ? "Level"
                  : "—"}
              </span>

              <span>Move</span>
              <span>Type</span>
              <span>Power</span>
              <span>PP</span>
              <span>Acc.</span>
            </div>

            {moves.map((move, index) => (
              <div
                key={`${move.name}-${method}-${index}`}
                className="pokemon-move-row"
              >
                <span>
                  {method === "level-up"
                    ? move.level === 0
                      ? "Start"
                      : `Lv. ${move.level}`
                    : "—"}
                </span>

                <span className="move-name">
                  {formatName(move.name)}
                </span>

                <span>
                  {renderTypeBadge(move.type)}
                </span>

                <span>
                  {move.power ?? "—"}
                </span>

                <span>
                  {move.pp ?? "—"}
                </span>

                <span>
                  {move.accuracy ?? "—"}
                </span>
              </div>
            ))}
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

{activeTab === "Type Matchups" && (
  <div className="pokemon-tab-section">
    <h3>Type Matchups</h3>

    {data && (
      <>
        <div className="pokemon-type-matchup-grid">
          {calculateTypeMatchups(
            data.types
              .sort(
                (a, b) =>
                  a.slot - b.slot
              )
              .map(
                (type) =>
                  type.type.name
              ),
            typeRelations
          ).map((matchup) => (
            <div
              key={matchup.type}
              className={`type-matchup-card matchup-${String(
                matchup.multiplier
              ).replace(".", "-")}`}
            >
              <div
                className="type-matchup-name"
              >
                {renderTypeBadge(
                  matchup.type
                )}
              </div>

              <div className="type-matchup-value">
                {getMatchupLabel(
                  matchup.multiplier
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="type-matchup-legend">
          <span>
            <strong>4×</strong> Super Weak
          </span>

          <span>
            <strong>2×</strong> Weak
          </span>

          <span>
            <strong>1×</strong> Normal
          </span>

          <span>
            <strong>½×</strong> Resistant
          </span>

          <span>
            <strong>¼×</strong> Highly Resistant
          </span>

          <span>
            <strong>0×</strong> Immune
          </span>
        </div>
      </>
    )}
  </div>
)}

{activeTab === "Wild Locations" && (
  <div className="pokemon-tab-section">
    <h3>Wild Locations</h3>

    <section className="pokemon-info-card">
      {locations.length > 0 ? (
        <div className="pokemon-locations-table">
          <div className="pokemon-locations-header">
            <span>Region</span>
            <span>Location</span>
            <span>Method</span>
            <span>Levels</span>
            <span>Morning</span>
            <span>Day</span>
            <span>Night</span>
          </div>

          {locations.map(
            (entry: any, index: number) => {
              const areaName =
                formatName(
                  entry.location_area.name
                );

              const versionDetails =
                entry.version_details || [];

              const encounterDetails =
                versionDetails.flatMap(
                  (version: any) =>
                    version.encounter_details ||
                    []
                );

              const minLevel =
                encounterDetails.length
                  ? Math.min(
                      ...encounterDetails.map(
                        (detail: any) =>
                          detail.min_level
                      )
                    )
                  : null;

              const maxLevel =
                encounterDetails.length
                  ? Math.max(
                      ...encounterDetails.map(
                        (detail: any) =>
                          detail.max_level
                      )
                    )
                  : null;

              const levels =
                minLevel !== null &&
                maxLevel !== null
                  ? minLevel === maxLevel
                    ? `${minLevel}`
                    : `${minLevel}–${maxLevel}`
                  : "—";

              const methods =
                encounterDetails.length
                  ? Array.from(
                      new Set(
                        encounterDetails.map(
                          (detail: any) =>
                            formatName(
                              detail.method
                                ?.name || "Unknown"
                            )
                        )
                      )
                    ).join(", ")
                  : "—";

              const hasMorning =
                encounterDetails.some(
                  (detail: any) =>
                    detail.condition_values?.some(
                      (condition: any) =>
                        condition.name ===
                        "morning"
                    )
                );

              const hasDay =
                encounterDetails.some(
                  (detail: any) =>
                    detail.condition_values?.some(
                      (condition: any) =>
                        condition.name === "day"
                    )
                );

              const hasNight =
                encounterDetails.some(
                  (detail: any) =>
                    detail.condition_values?.some(
                      (condition: any) =>
                        condition.name ===
                        "night"
                    )
                );

              const region =
                versionDetails[0]
                  ?.version?.name
                  ? formatName(
                      versionDetails[0]
                        .version.name
                    )
                  : pokemon.region ||
                    "Unknown";

              return (
                <div
                  key={`${areaName}-${index}`}
                  className="pokemon-location-row"
                >
                  <span>
                    {region}
                  </span>

                  <span className="location-name">
                    {areaName}
                  </span>

                  <span>
                    {methods}
                  </span>

                  <span>
                    {levels}
                  </span>

                  <span
                    className={
                      hasMorning
                        ? "time-yes"
                        : "time-no"
                    }
                  >
                    {hasMorning
                      ? "✓"
                      : "—"}
                  </span>

                  <span
                    className={
                      hasDay
                        ? "time-yes"
                        : "time-no"
                    }
                  >
                    {hasDay
                      ? "✓"
                      : "—"}
                  </span>

                  <span
                    className={
                      hasNight
                        ? "time-yes"
                        : "time-no"
                    }
                  >
                    {hasNight
                      ? "✓"
                      : "—"}
                  </span>
                </div>
              );
            }
          )}
        </div>
      ) : (
        <div className="pokemon-no-locations">
          No standard encounter locations
          available.
        </div>
      )}

      <small>
        Encounter information is from the
        standard Pokémon API. PokeMMO encounter
        data may differ.
      </small>
    </section>
  </div>
)}

{activeTab === "Evolution Tree" && (
  <div className="pokemon-tab-section">
    <h3>Evolution Tree</h3>

    <section className="pokemon-info-card">
      {evolution ? (
        <div className="evolution-tree">
          {renderEvolutionTree(
            evolution.chain
          )}
        </div>
      ) : (
        <div className="pokemon-no-evolution">
          This Pokémon does not have an
          evolution chain.
        </div>
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