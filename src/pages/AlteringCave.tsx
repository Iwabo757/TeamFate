import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import PokemonInfoModal from "../components/PokemonInfoModal";
import { getAlteringCaveData } from "../lib/alteringCave";

type HomePokemon = {
  id: number;
  name: string;
  region?: string | null;
  caught: boolean;
  owners: string[];
};

type ModalPokemon = {
  id: number;
  name: string;
  region?: string;
  caught: boolean;
  owners: Record<string, number>;
  screenshots: string[];
  totalCopies: number;
};

type AlteringCaveData = Awaited<
  ReturnType<typeof getAlteringCaveData>
>;

/* =========================================================
   POKEMON NAME NORMALIZATION
========================================================= */

function normalizePokemonName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, "")
    .trim()
    .toLowerCase();
}

/* =========================================================
   SHOWCASE-STYLE GIF NAME

   Matches the exact naming logic used by Showcase.
========================================================= */

function getGifName(name: string): string {
  return name
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]/g, "");
}

/* =========================================================
   BUILD OWNERS
========================================================= */

function buildOwners(
  owners: string[]
): Record<string, number> {
  return owners.reduce(
    (result, owner) => {
      result[owner] = (result[owner] ?? 0) + 1;
      return result;
    },
    {} as Record<string, number>
  );
}

/* =========================================================
   CONVERT TO MODAL POKEMON
========================================================= */

function convertToModalPokemon(
  pokemon: HomePokemon
): ModalPokemon {
  return {
    id: pokemon.id,
    name: pokemon.name,
    region: pokemon.region ?? undefined,
    caught: pokemon.caught,
    owners: buildOwners(pokemon.owners),
    screenshots: [],
    totalCopies: pokemon.owners.length,
  };
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function AlteringCave() {
  const [
    alteringCave,
    setAlteringCave,
  ] = useState<AlteringCaveData | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    pokemonMap,
    setPokemonMap,
  ] = useState<Record<string, HomePokemon>>({});

  const [
    selectedPokemon,
    setSelectedPokemon,
  ] = useState<HomePokemon | null>(null);

  /* =========================================================
     LOAD ALTERING CAVE
  ========================================================= */

  async function loadAlteringCave() {
    try {
      setError(null);

      const data = await getAlteringCaveData();

      setAlteringCave(data);
    } catch (err) {
      console.error(
        "Failed to load Altering Cave:",
        err
      );

      setError(
        "Unable to load the current Altering Cave rotation."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     INITIAL LOAD + AUTO REFRESH
  ========================================================= */

  useEffect(() => {
    loadAlteringCave();

    const refreshTimer = window.setInterval(
      loadAlteringCave,
      60000
    );

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, []);

  /* =========================================================
     LOAD POKEMON DATA
  ========================================================= */

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
        .select("id, name, region");

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

      const ownersByPokemon: Record<
        number,
        string[]
      > = {};

      catches?.forEach((entry: any) => {
        const pokemonId = Number(
          entry.pokemon_id
        );

        const owner =
          entry.profiles?.nickname ??
          "Unknown";

        if (!ownersByPokemon[pokemonId]) {
          ownersByPokemon[pokemonId] = [];
        }

        ownersByPokemon[pokemonId].push(owner);
      });

      const nextMap: Record<
        string,
        HomePokemon
      > = {};

      pokemonData?.forEach((pokemon: any) => {
        const id = Number(pokemon.id);

        const owners =
          ownersByPokemon[id] ?? [];

        nextMap[
          normalizePokemonName(
            pokemon.name
          )
        ] = {
          id,
          name: pokemon.name,
          region:
            pokemon.region ?? null,
          caught:
            owners.length > 0,
          owners,
        };
      });

      setPokemonMap(nextMap);
    } catch (err) {
      console.error(
        "Failed to load Pokémon data:",
        err
      );
    }
  }

  /* =========================================================
     GET POKEMON
  ========================================================= */

  function getPokemon(
    name: string
  ): HomePokemon | null {
    return (
      pokemonMap[
        normalizePokemonName(name)
      ] ?? null
    );
  }

  /* =========================================================
     OPEN POKEMON MODAL
  ========================================================= */

  function openPokemon(
    pokemon: HomePokemon
  ) {
    setSelectedPokemon(pokemon);
  }

  function openPokemonById(
    pokemonId: number
  ) {
    const pokemon = Object.values(
      pokemonMap
    ).find(
      (entry) =>
        entry.id === pokemonId
    );

    if (pokemon) {
      setSelectedPokemon(pokemon);
    }
  }

  /* =========================================================
     POKEMON SPRITE

     Normal:
       Shiny PNG

     Hover:
       Shiny animated GIF

     Mouse leave:
       Shiny PNG

     This follows the same GIF source and naming
     logic used by Team Fate Showcase.
  ========================================================= */

  function PokemonSprite({
    name,
  }: {
    name: string;
  }) {
    const pokemon = getPokemon(name);

    if (!pokemon) {
      return null;
    }

    const staticSprite =
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.id}.png`;

    const animatedSprite =
      `https://play.pokemonshowdown.com/sprites/ani-shiny/${getGifName(
        pokemon.name
      )}.gif`;

    return (
      <button
        type="button"
        className="altering-cave-pokemon"
        onClick={() =>
          openPokemon(pokemon)
        }
        title={`View ${pokemon.name}`}
        aria-label={`View ${pokemon.name}`}
        onMouseEnter={(event) => {
          const image =
            event.currentTarget.querySelector(
              "img"
            );

          if (image) {
            image.src =
              animatedSprite;
          }
        }}
        onMouseLeave={(event) => {
          const image =
            event.currentTarget.querySelector(
              "img"
            );

          if (image) {
            image.src =
              staticSprite;
          }
        }}
      >
        <img
          src={staticSprite}
          alt={`Shiny ${pokemon.name}`}
          className="showcase-sprite"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src =
              staticSprite;
          }}
        />
      </button>
    );
  }

  /* =========================================================
     SPRITE GROUP
  ========================================================= */

  function SpriteGroup({
    pokemon,
  }: {
    pokemon: string[];
  }) {
    return (
      <div className="altering-cave-sprites">
        {pokemon.map(
          (name, index) => (
            <PokemonSprite
              key={`${name}-${index}`}
              name={name}
            />
          )
        )}
      </div>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="altering-cave-page">
        <div className="altering-cave-header">
          <h1>Altering Cave</h1>

          <p>
            Loading current rotation...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="altering-cave-page">
        <div className="altering-cave-header">
          <h1>Altering Cave</h1>

          <p className="altering-cave-error">
            {error}
          </p>

          <button
            type="button"
            className="altering-cave-retry"
            onClick={() => {
              setLoading(true);
              loadAlteringCave();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="altering-cave-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="altering-cave-header">
        <h1>Altering Cave</h1>

        <p>
          Current Pokémon available
          in Altering Cave
        </p>

        <div className="altering-cave-status">
          Live data
        </div>
      </div>

      {/* =====================================================
          CURRENT ROTATION
      ===================================================== */}

      {alteringCave && (
        <div className="altering-cave-card">

          {/* =================================================
              SINGLES
          ================================================= */}

          {alteringCave.encounters.length >
            0 && (
            <section className="altering-cave-section">
              <h2>Singles</h2>

              <SpriteGroup
                pokemon={
                  alteringCave.encounters
                }
              />
            </section>
          )}

          {/* =================================================
              RARE SINGLES
          ================================================= */}

          {alteringCave.rareEncounters
            .length > 0 && (
            <section className="altering-cave-section">
              <h2>Rare Singles</h2>

              <SpriteGroup
                pokemon={
                  alteringCave.rareEncounters
                }
              />
            </section>
          )}

          {/* =================================================
              HORDES
          ================================================= */}

          {alteringCave.hordes.length >
            0 && (
            <section className="altering-cave-section">
              <h2>Hordes</h2>

              <SpriteGroup
                pokemon={
                  alteringCave.hordes
                }
              />
            </section>
          )}

        </div>
      )}

      {/* =====================================================
          DATA CREDIT
      ===================================================== */}

      <div className="altering-cave-credit">
        Altering Cave data provided by{" "}

        <a
          href="https://docs.google.com/spreadsheets/d/12lZupylxLAKUVQQJZIC8GJmvQiUwpbAAQ3BduAu_rig/edit?gid=1031347870#gid=1031347870"
          target="_blank"
          rel="noopener noreferrer"
        >
          Team Mew and Trainer Polymnia
        </a>
      </div>

      {/* =====================================================
          POKEMON MODAL
      ===================================================== */}

      {selectedPokemon && (
        <PokemonInfoModal
          pokemon={convertToModalPokemon(
            selectedPokemon
          )}
          onClose={() =>
            setSelectedPokemon(null)
          }
          onPokemonClick={
            openPokemonById
          }
          defaultTab="Summary"
        />
      )}

    </div>
  );
}