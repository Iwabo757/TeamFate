import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import HomeTicker from "../components/HomeTicker";
import { getAlteringCaveData } from "../lib/alteringCave";

type GameTime = {
  hours: number;
  minutes: number;
  seconds: number;
};

type AlteringCaveData = Awaited<
  ReturnType<typeof getAlteringCaveData>
>;

type HomePokemon = {
  id: number;
  name: string;
  region?: string | null;
  caught: boolean;
  owners: string[];
};

function getPokeMMOTime(): GameTime {
  const now = new Date();

  const gameDayMilliseconds =
    24 * 60 * 60 * 1000;

  const gameMilliseconds =
    (now.getTime() * 4) %
    gameDayMilliseconds;

  const hours = Math.floor(
    gameMilliseconds /
      (60 * 60 * 1000)
  );

  const minutes = Math.floor(
    (gameMilliseconds %
      (60 * 60 * 1000)) /
      (60 * 1000)
  );

  const seconds = Math.floor(
    (gameMilliseconds %
      (60 * 1000)) /
      1000
  );

  return {
    hours,
    minutes,
    seconds,
  };
}

function normalizePokemonName(
  name: string
): string {
  return name
    .replace(/\s*\([^)]*\)/g, "")
    .trim()
    .toLowerCase();
}

export default function Home() {
  const [memberCount, setMemberCount] =
    useState(0);

  const [shinyCount, setShinyCount] =
    useState(0);

  const [gameTime, setGameTime] =
    useState<GameTime>(() =>
      getPokeMMOTime()
    );

  const [alteringCave, setAlteringCave] =
    useState<AlteringCaveData | null>(
      null
    );

  const [
    alteringCaveLoading,
    setAlteringCaveLoading,
  ] = useState(true);

  const [topHunter, setTopHunter] =
    useState({
      name: "None",
      count: 0,
    });

  const [welcome, setWelcome] =
    useState({
      title: "",
      message: "",
    });

  const [pokemonMap, setPokemonMap] =
    useState<
      Record<string, HomePokemon>
    >({});

  const [
    selectedPokemon,
    setSelectedPokemon,
  ] = useState<HomePokemon | null>(
    null
  );

  /* =========================================
     LIVE POKEMMO TIME
  ========================================= */

  useEffect(() => {
    const updateGameTime = () => {
      setGameTime(
        getPokeMMOTime()
      );
    };

    updateGameTime();

    const timer = window.setInterval(
      updateGameTime,
      1000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /* =========================================
     LOAD ALTERING CAVE
  ========================================= */

  useEffect(() => {
    let mounted = true;

    async function loadAlteringCave() {
      try {
        const data =
          await getAlteringCaveData();

        if (!mounted) {
          return;
        }

        setAlteringCave(data);
      } catch (error) {
        console.error(
          "Failed to load Altering Cave:",
          error
        );
      } finally {
        if (mounted) {
          setAlteringCaveLoading(false);
        }
      }
    }

    loadAlteringCave();

    const refreshTimer =
      window.setInterval(
        loadAlteringCave,
        60000
      );

    return () => {
      mounted = false;

      window.clearInterval(
        refreshTimer
      );
    };
  }, []);

  /* =========================================
     LOAD POKEMON MAP
  ========================================= */

  useEffect(() => {
    loadPokemonMap();
  }, []);

  async function loadPokemonMap() {
    try {
      const {
        data: pokemonData,
        error: pokemonError,
      } = await supabase
        .from("pokemon")
        .select(
          "id, name, region"
        );

      if (pokemonError) {
        throw pokemonError;
      }

      const {
        data: catches,
        error: catchesError,
      } = await supabase
        .from("shiny_catches")
        .select(`
          pokemon_id,
          profile_id,
          profiles (
            nickname
          )
        `);

      if (catchesError) {
        throw catchesError;
      }

      const ownersByPokemon:
        Record<number, string[]> = {};

      catches?.forEach(
        (catchEntry: any) => {
          const pokemonId =
            Number(
              catchEntry.pokemon_id
            );

          const owner =
            catchEntry.profiles
              ?.nickname ??
            "Unknown";

          if (
            !ownersByPokemon[
              pokemonId
            ]
          ) {
            ownersByPokemon[
              pokemonId
            ] = [];
          }

          ownersByPokemon[
            pokemonId
          ].push(owner);
        }
      );

      const nextPokemonMap:
        Record<string, HomePokemon> =
        {};

      pokemonData?.forEach(
        (pokemon: any) => {
          const pokemonId =
            Number(pokemon.id);

          const owners =
            ownersByPokemon[
              pokemonId
            ] ?? [];

          nextPokemonMap[
            normalizePokemonName(
              pokemon.name
            )
          ] = {
            id: pokemonId,
            name: pokemon.name,
            region:
              pokemon.region ??
              null,
            caught:
              owners.length > 0,
            owners,
          };
        }
      );

      setPokemonMap(
        nextPokemonMap
      );
    } catch (error) {
      console.error(
        "Failed to load Pokémon data:",
        error
      );
    }
  }

  /* =========================================
     LOAD STATS
  ========================================= */

  useEffect(() => {
    loadStats();

    const refreshTimer =
      window.setInterval(
        loadStats,
        30000
      );

    return () => {
      window.clearInterval(
        refreshTimer
      );
    };
  }, []);

  async function loadStats() {
    try {
      const {
        count: members,
        error: membersError,
      } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (membersError) {
        throw membersError;
      }

      setMemberCount(
        members ?? 0
      );

      const {
        count: shinies,
        error: shiniesError,
      } = await supabase
        .from("shiny_catches")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (shiniesError) {
        throw shiniesError;
      }

      setShinyCount(
        shinies ?? 0
      );

      const {
        data: catches,
        error: catchesError,
      } = await supabase
        .from("shiny_catches")
        .select(`
          profile_id,
          profiles (
            nickname
          )
        `);

      if (catchesError) {
        throw catchesError;
      }

      const totals:
        Record<string, number> =
        {};

      catches?.forEach(
        (entry: any) => {
          const name =
            entry.profiles
              ?.nickname ??
            "Unknown";

          totals[name] =
            (totals[name] ?? 0) +
            1;
        }
      );

      const leader =
        Object.entries(totals)
          .sort(
            (a, b) =>
              b[1] - a[1]
          )[0];

      if (leader) {
        setTopHunter({
          name: leader[0],
          count: leader[1],
        });
      } else {
        setTopHunter({
          name: "None",
          count: 0,
        });
      }
    } catch (error) {
      console.error(
        "Failed to load home stats:",
        error
      );
    }
  }

  /* =========================================
     LOAD WELCOME MESSAGE
  ========================================= */

  useEffect(() => {
    loadWelcome();
  }, []);

  async function loadWelcome() {
    const {
      data,
      error,
    } = await supabase
      .from("homepage_message")
      .select("*")
      .single();

    if (error) {
      console.error(
        "Failed to load welcome message:",
        error
      );

      return;
    }

    if (data) {
      setWelcome({
        title:
          data.title ?? "",
        message:
          data.message ?? "",
      });
    }
  }

  /* =========================================
     POKEMON HELPERS
  ========================================= */

  function getPokemon(
    name: string
  ): HomePokemon | null {
    const normalizedName =
      normalizePokemonName(name);

    return (
      pokemonMap[
        normalizedName
      ] ?? null
    );
  }

  function PokemonSprite({
    name,
  }: {
    name: string;
  }) {
    const pokemon =
      getPokemon(name);

    if (!pokemon) {
      return null;
    }

    return (
      <button
        type="button"
        className="altering-pokemon-sprite"
        onClick={() =>
          setSelectedPokemon(
            pokemon
          )
        }
        title={pokemon.name}
      >
        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.id}.png`}
          alt={pokemon.name}
        />
      </button>
    );
  }

  function PokemonSpriteGroup({
    pokemon,
  }: {
    pokemon: string[];
  }) {
    return (
      <div className="altering-sprite-grid">
        {pokemon.map(
          (pokemonName, index) => (
            <PokemonSprite
              key={`${pokemonName}-${index}`}
              name={pokemonName}
            />
          )
        )}
      </div>
    );
  }

  /* =========================================
     FORMAT GAME TIME
  ========================================= */

  const formattedGameTime =
    `${String(
      gameTime.hours
    ).padStart(
      2,
      "0"
    )}:${String(
      gameTime.minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      gameTime.seconds
    ).padStart(
      2,
      "0"
    )}`;

  let gamePeriod:
    | "🌅 Morning"
    | "☀️ Day"
    | "🌙 Night" =
    "🌙 Night";

  if (
    gameTime.hours >= 4 &&
    gameTime.hours < 11
  ) {
    gamePeriod =
      "🌅 Morning";
  } else if (
    gameTime.hours >= 11 &&
    gameTime.hours < 21
  ) {
    gamePeriod =
      "☀️ Day";
  }

  return (
    <div className="home-page">

      {/* ===============================
          WELCOME
      ================================ */}

      <div className="welcome-card">
        <h2>
          {welcome.title}
        </h2>

        <p>
          {welcome.message}
        </p>
      </div>

      {/* ===============================
          HOME TICKER
      ================================ */}

      <HomeTicker />

      {/* ===============================
          STATS
      ================================ */}

      <div className="stats">

        {/* MEMBERS */}

        <div className="card">
          <h2>
            Members
          </h2>

          <span>
            {memberCount}
          </span>
        </div>

        {/* IN-GAME TIME */}

        <div className="card game-time-card">
          <h2>
            In-Game Time
          </h2>

          <span className="game-time">
            {formattedGameTime}
          </span>

          <div className="game-period">
            {gamePeriod}
          </div>
        </div>

        {/* ALTERING CAVE */}

        <div className="card altering-cave-card">
          <h2>
            Altering Cave
          </h2>

          {alteringCaveLoading && (
            <div className="altering-cave-loading">
              Loading current rotation...
            </div>
          )}

          {!alteringCaveLoading &&
            !alteringCave && (
              <div className="altering-cave-loading">
                Unable to load rotation
              </div>
            )}

          {!alteringCaveLoading &&
            alteringCave && (
              <div className="altering-cave-content">

                {alteringCave
                  .encounters
                  ?.length > 0 && (
                  <div className="altering-group">
                    <div className="altering-label">
                      Singles
                    </div>

                    <PokemonSpriteGroup
                      pokemon={
                        alteringCave.encounters
                      }
                    />
                  </div>
                )}

                {alteringCave
                  .rareEncounters
                  ?.length > 0 && (
                  <div className="altering-group">
                    <div className="altering-label">
                      Rare Singles
                    </div>

                    <PokemonSpriteGroup
                      pokemon={
                        alteringCave.rareEncounters
                      }
                    />
                  </div>
                )}

                {alteringCave
                  .hordes
                  ?.length > 0 && (
                  <div className="altering-group">
                    <div className="altering-label">
                      Hordes
                    </div>

                    <PokemonSpriteGroup
                      pokemon={
                        alteringCave.hordes
                      }
                    />
                  </div>
                )}

              </div>
            )}
        </div>

        {/* TEAM SHINIES */}

        <div className="card">
          <h2>
            Team Shinies
          </h2>

          <span>
            {shinyCount}
          </span>
        </div>

        {/* TOP SHINY TRAINER */}

        <div className="card">
          <h2>
            Top Shiny Trainer
          </h2>

          <div className="leader-name">
            {topHunter.name}
          </div>

          <div className="leader-count">
            {topHunter.count} Shinies
          </div>
        </div>

      </div>

      {/* ===============================
          POKEMON MODAL
      ================================ */}

      {selectedPokemon && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedPokemon(
              null
            )
          }
        >
          <div
            className="pokemon-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="close-btn"
              onClick={() =>
                setSelectedPokemon(
                  null
                )
              }
            >
              ×
            </button>

            <div className="modal-header">
              <div>
                <h2>
                  {selectedPokemon.name}
                </h2>

                <span>
                  #
                  {String(
                    selectedPokemon.id
                  ).padStart(
                    3,
                    "0"
                  )}
                </span>
              </div>

              <span className="status-badge">
                {selectedPokemon.caught
                  ? "Captured"
                  : "Missing"}
              </span>
            </div>

            <div className="modal-body">

              <div className="modal-left">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${selectedPokemon.id}.png`}
                  alt={
                    selectedPokemon.name
                  }
                  className="modal-sprite"
                />
              </div>

              <div className="modal-right">

                <div className="detail-card">
                  <h3>
                    Pokédex Info
                  </h3>

                  <p>
                    National Dex #
                    {selectedPokemon.id}
                  </p>

                  <p>
                    Region:{" "}
                    {selectedPokemon.region ??
                      "Unknown"}
                  </p>
                </div>

                <div className="detail-card">
                  <h3>
                    Team Fate Owners
                  </h3>

                  {selectedPokemon
                    .owners
                    .length > 0 ? (
                    <div className="pokemon-owner-list">
                      {[
                        ...new Set(
                          selectedPokemon.owners
                        ),
                      ].map(
                        (owner) => (
                          <div
                            key={owner}
                          >
                            {owner}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <p>
                      No Team Fate shiny
                      recorded.
                    </p>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}