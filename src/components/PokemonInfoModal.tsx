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

export default function PokemonInfoModal({
  pokemon,
  onClose,
  defaultTab = "Summary",
}: Props) {
  const [activeTab, setActiveTab] =
    useState<Tab>(defaultTab);

  const [data, setData] =
    useState<ApiPokemon | null>(null);

  const [species, setSpecies] =
    useState<ApiSpecies | null>(null);

  const [evolution, setEvolution] =
    useState<ApiEvolution | null>(null);

  const [typeRelations, setTypeRelations] =
    useState<Record<string, TypeRelations>>({});

  const [locations, setLocations] =
    useState<string[]>([]);

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

      try {
        const locationResponse =
          await fetch(
            `https://pokeapi.co/api/v2/pokemon/${pokemon.id}/encounters`
          );

        if (locationResponse.ok) {
          const locationData =
            await locationResponse.json();

          setLocations(
            locationData.map(
              (entry: any) =>
                formatName(
                  entry.location_area.name
                )
            )
          );
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

    if (details.min_level) {
      return `Level ${details.min_level}`;
    }

    if (details.item) {
      return formatName(details.item.name);
    }

    if (details.trigger) {
      return formatName(details.trigger.name);
    }

    return "Special";
  }

  function renderEvolutionTree(root: EvolutionNode) {
    const stages = getEvolutionStages(root);

    return (
      <div className="evolution-tree evolution-tree-horizontal">
        {stages.map((stage, stageIndex) => (
          <div
            key={`stage-${stageIndex}`}
            className="evolution-stage"
          >
            {stageIndex > 0 && (
              <div
                className="evolution-arrow"
                aria-hidden="true"
              >
                →
              </div>
            )}

            <div className="evolution-stage-list">
              {stage.map((node) => {
                const name = getEvolutionName(
                  node.species.url
                );

                const pokemonId =
                  getEvolutionName(node.species.url);

                const staticSprite =
                  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`;

                const animatedSprite =
                  `https://play.pokemonshowdown.com/sprites/ani-shiny/${getShowdownSpriteName(
                    name
                  )}.gif`;

                const evolutionMethod =
                  getEvolutionMethod(node);

                return (
                  <div
                    key={`${stageIndex}-${name}`}
                    className="evolution-card"
                  >
                    <img
                      src={staticSprite}
                      alt={`Shiny ${formatName(name)}`}
                      className="evolution-sprite"
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

                    {evolutionMethod && (
                      <span>
                        {evolutionMethod}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
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
          .pokemon-info-modal {
            width: min(1120px, 94vw);
            max-height: 94vh;
            display: flex;
            flex-direction: column;
          }

          .pokemon-info-tabs {
            flex-wrap: nowrap;
            overflow-x: auto;
          }

          .pokemon-info-content {
            flex: 1;
            min-height: 0;
          }

          .pokemon-summary {
            display: grid;
            grid-template-columns: minmax(210px, 0.75fr) minmax(0, 2.25fr);
            gap: 18px;
            align-items: stretch;
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
            max-width: 220px;
            max-height: 220px;
            object-fit: contain;
          }

          .pokemon-summary-right {
            display: grid;
            grid-template-columns: 1.1fr 1.15fr 1fr;
            gap: 12px;
            align-items: stretch;
          }

          .pokemon-summary-right .pokemon-info-card {
            margin: 0;
            padding: 14px;
          }

          .pokemon-summary-right .pokemon-info-card h3 {
            margin-top: 0;
            margin-bottom: 8px;
          }

          .pokemon-summary-right .pokemon-info-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .pokemon-summary-right .ability-list {
            gap: 6px;
          }

          .evolution-tree-horizontal {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            width: 100%;
            overflow-x: auto;
            padding: 12px 4px;
          }

          .evolution-stage {
            display: flex;
            align-items: center;
            gap: 14px;
            flex: 0 0 auto;
          }

          .evolution-arrow {
            font-size: 2rem;
            line-height: 1;
            font-weight: 800;
            opacity: 0.8;
          }

          .evolution-stage-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .evolution-card {
            min-width: 130px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }

          .evolution-sprite {
            width: 96px;
            height: 96px;
            object-fit: contain;
            image-rendering: pixelated;
            cursor: pointer;
            transition: transform 0.15s ease;
          }

          .evolution-sprite:hover {
            transform: scale(1.08);
          }

          @media (max-width: 900px) {
            .pokemon-info-modal {
              width: min(96vw, 720px);
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

            .evolution-tree-horizontal {
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

                    {[
                      "level-up",
                      "machine",
                      "egg",
                      "tutor",
                    ].map((method) => {
                      const moves =
                        data.moves.filter(
                          (move) =>
                            move.version_group_details.some(
                              (detail) =>
                                detail
                                  .move_learn_method
                                  .name ===
                                method
                            )
                        );

                      if (!moves.length)
                        return null;

                      return (
                        <section
                          key={method}
                          className="pokemon-info-card"
                        >
                          <h3>
                            {formatMoveMethod(
                              method
                            )}
                          </h3>

                          <div className="move-grid">
                            {moves.map(
                              (move) => (
                                <div
                                  key={
                                    move.move
                                      .name
                                  }
                                  className="move-card"
                                >
                                  {formatName(
                                    move
                                      .move
                                      .name
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
                    <section className="pokemon-info-card">
                      <h3>
                        Encounter Locations
                      </h3>

                      {locations.length > 0 ? (
                        <div className="location-grid">
                          {Array.from(
                            new Set(locations)
                          ).map(
                            (location) => (
                              <div
                                key={
                                  location
                                }
                                className="location-card"
                              >
                                {location}
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p>
                          No standard encounter
                          locations available.
                        </p>
                      )}

                      <small>
                        Encounter data is based
                        on the standard Pokémon
                        API and may differ from
                        PokeMMO.
                      </small>
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