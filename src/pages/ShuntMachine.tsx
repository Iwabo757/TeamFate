import { useMemo, useRef, useState } from "react";
import monsters from "../data/monsters.json";

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
};

type Monster = {
  id: number;
  name: string;
  locations?: MonsterLocation[];
};

const pokemonList = monsters as Monster[];

/* =========================================================
   SPRITES
========================================================= */

function getSprite(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function getShinySprite(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
}

/* =========================================================
   LOCATION HELPERS
========================================================= */

function hasValidLocation(pokemon: Monster): boolean {
  if (
    !Array.isArray(pokemon.locations) ||
    pokemon.locations.length === 0
  ) {
    return false;
  }

  return pokemon.locations.some((location) => {
    return Boolean(
      location.location_name ||
        location.location_name_full
    );
  });
}

function getLocations(pokemon: Monster): MonsterLocation[] {
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

    const key = [
      name,
      location.region_name || "",
      location.season || "",
      location.type || "",
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/* =========================================================
   RANDOM HELPERS
========================================================= */

function randomPokemon(
  pool: Monster[]
): Monster | null {
  if (pool.length === 0) {
    return null;
  }

  return pool[
    Math.floor(Math.random() * pool.length)
  ];
}

function randomPool(
  pool: Monster[],
  amount: number
): Monster[] {
  if (pool.length === 0) {
    return [];
  }

  const result: Monster[] = [];

  for (let i = 0; i < amount; i++) {
    const pokemon = randomPokemon(pool);

    if (pokemon) {
      result.push(pokemon);
    }
  }

  return result;
}

/* =========================================================
   PAGE
========================================================= */

export default function ShuntMachine() {
  /*
   * Only Pokémon with a real hunt location
   * are allowed into the machine.
   */
  const shuntablePokemon = useMemo(() => {
    return pokemonList.filter(hasValidLocation);
  }, []);

  const [spinning, setSpinning] =
    useState(false);

  const [result, setResult] =
    useState<Monster | null>(null);

  const [reelPokemon, setReelPokemon] =
    useState<Monster[][]>(() => {
      const initial = randomPool(
        shuntablePokemon,
        9
      );

      return initial.reduce(
        (all, pokemon, index) => {
          all[index % 3].push(pokemon);
          return all;
        },
        [[], [], []] as Monster[][]
      );
    });

  const [reelStopped, setReelStopped] =
    useState<boolean[]>([
      true,
      true,
      true,
    ]);

  const audioContext =
    useRef<AudioContext | null>(null);

  /* =======================================================
     AUDIO
  ======================================================= */

  function getAudioContext(): AudioContext | null {
    try {
      const AudioCtx =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioCtx) {
        return null;
      }

      if (!audioContext.current) {
        audioContext.current =
          new AudioCtx();
      }

      return audioContext.current;
    } catch {
      return null;
    }
  }

  function playClickSound() {
    try {
      const context =
        getAudioContext();

      if (!context) {
        return;
      }

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type = "square";

      oscillator.frequency.setValueAtTime(
        140,
        context.currentTime
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        60,
        context.currentTime + 0.08
      );

      gain.gain.setValueAtTime(
        0.12,
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
    } catch {
      // Audio is optional.
    }
  }

  function playStopSound() {
    try {
      const context =
        audioContext.current;

      if (!context) {
        return;
      }

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        320,
        context.currentTime
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        180,
        context.currentTime + 0.12
      );

      gain.gain.setValueAtTime(
        0.14,
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.12
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(
        context.currentTime + 0.12
      );
    } catch {
      // Audio is optional.
    }
  }

  /* =======================================================
     REEL BUILDER
  ======================================================= */

  function buildReel(
    selected: Monster
  ): Monster[] {
    const reel = randomPool(
      shuntablePokemon,
      18
    );

    reel.push(selected);

    return reel;
  }

  /* =======================================================
     SHUNT
  ======================================================= */

  function shunt() {
    if (
      spinning ||
      shuntablePokemon.length === 0
    ) {
      return;
    }

    playClickSound();

    setResult(null);

    setSpinning(true);

    setReelStopped([
      false,
      false,
      false,
    ]);

    /*
     * Pick ONE Pokémon.
     *
     * All three reels eventually stop
     * on this same Pokémon.
     */
    const selected =
      randomPokemon(
        shuntablePokemon
      );

    if (!selected) {
      setSpinning(false);
      return;
    }

    setReelPokemon([
      buildReel(selected),
      buildReel(selected),
      buildReel(selected),
    ]);

    /*
     * Each reel stops at a different time,
     * creating the mechanical slowdown effect.
     */
    const reelTimes = [
      1800,
      2450,
      3100,
    ];

    reelTimes.forEach(
      (delay, index) => {
        window.setTimeout(() => {
          playStopSound();

          setReelStopped(
            (previous) => {
              const next = [
                ...previous,
              ];

              next[index] = true;

              return next;
            }
          );

          /*
           * Reveal the final shiny only after
           * the third reel stops.
           */
          if (index === 2) {
            window.setTimeout(() => {
              setResult(selected);
              setSpinning(false);
            }, 150);
          }
        }, delay);
      }
    );
  }

  /* =======================================================
     RESULT LOCATIONS
  ======================================================= */

  const resultLocations =
    result
      ? getLocations(result)
      : [];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="shunt-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="shunt-header">
        <div className="shunt-title-icon">
          ✨
        </div>

        <h1>
          SHUNT MACHINE
        </h1>

        <p>
          Don't know what to shunt next?
          Let fate decide.
        </p>
      </div>

      {/* ===================================================
          MACHINE
      =================================================== */}

      <div className="shunt-machine">

        <div className="machine-top-light">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="machine-title">
          <span>✦</span>
          NEXT SHUNT
          <span>✦</span>
        </div>

        {/* REELS */}

        <div
          className={
            spinning
              ? "reels spinning"
              : "reels"
          }
        >
          {reelPokemon.map(
            (reel, reelIndex) => {
              const stopped =
                reelStopped[
                  reelIndex
                ];

              return (
                <div
                  key={reelIndex}
                  className={
                    stopped
                      ? "reel stopped"
                      : "reel moving"
                  }
                >
                  <div className="reel-inner">
                    {reel.map(
                      (
                        pokemon,
                        pokemonIndex
                      ) => (
                        <div
                          key={`${reelIndex}-${pokemon.id}-${pokemonIndex}`}
                          className="reel-pokemon"
                        >
                          <img
                            src={getSprite(
                              pokemon.id
                            )}
                            alt={
                              pokemon.name
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

          {/* CENTER SELECTION WINDOW */}

          <div className="selection-window">
            <div className="selection-arrow left">
              ▶
            </div>

            <div className="selection-arrow right">
              ◀
            </div>
          </div>
        </div>

        {/* MACHINE CONTROLS */}

        <div className="machine-bottom">

          <div className="machine-status">
            {spinning ? (
              <>
                <span className="status-light spinning-light" />
                SEARCHING...
              </>
            ) : result ? (
              <>
                <span className="status-light result-light" />
                SHUNT FOUND
              </>
            ) : (
              <>
                <span className="status-light ready-light" />
                READY
              </>
            )}
          </div>

          <button
            type="button"
            className={
              spinning
                ? "shunt-button disabled"
                : "shunt-button"
            }
            onClick={shunt}
            disabled={spinning}
          >
            <span className="button-top" />

            <span className="button-text">
              {result
                ? "SHUNT AGAIN"
                : "SHUNT"}
            </span>
          </button>

        </div>
      </div>

      {/* ===================================================
          RESULT
      =================================================== */}

      {result && !spinning && (
        <div className="result-section">

          <div className="result-label">
            ✦ YOUR NEXT SHUNT ✦
          </div>

          <div className="result-card">

            {/* SHINY SPRITE */}

            <div className="result-pokemon">

              <div className="result-sparkles">
                ✦
              </div>

              <img
                src={getShinySprite(
                  result.id
                )}
                alt={`${result.name} shiny`}
              />

              <div className="result-sparkles bottom">
                ✦
              </div>

            </div>

            {/* RESULT INFORMATION */}

            <div className="result-info">

              <div className="result-number">
                #
                {String(
                  result.id
                ).padStart(3, "0")}
              </div>

              <h2>
                SHINY{" "}
                {result.name.toUpperCase()}
              </h2>

              <p className="result-description">
                Fate has chosen your next
                target.
              </p>

              <div className="result-divider" />

              <div className="locations-title">
                📍 HUNT LOCATIONS
              </div>

              <div className="locations-list">

                {resultLocations.length === 0 ? (
                  <div className="location-card">
                    No hunt locations found.
                  </div>
                ) : (
                  resultLocations.map(
                    (
                      location,
                      index
                    ) => {
                      const locationName =
                        location.location_name_full ||
                        location.location_name ||
                        "Unknown Location";

                      return (
                        <div
                          key={`${locationName}-${index}`}
                          className="location-card"
                        >

                          <div className="location-main">
                            <strong>
                              {locationName}
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
                              <span>
                                🍂{" "}
                                {
                                  location.season
                                }
                              </span>
                            )}

                            {location.type && (
                              <span>
                                🎯{" "}
                                {
                                  location.type
                                }
                              </span>
                            )}

                            {location.min_level !==
                              undefined &&
                              location.max_level !==
                                undefined && (
                                <span>
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
                  )
                )}

              </div>
            </div>
          </div>

          {/* RESULT SHUNT AGAIN */}

          <button
            type="button"
            className="result-shunt-again"
            onClick={shunt}
          >
            🎰 SHUNT AGAIN
          </button>

        </div>
      )}

      {/* ===================================================
          HELP
      =================================================== */}

      {!result && !spinning && (
        <div className="machine-help">

          <div>
            <span>🎰</span>

            <strong>
              LET FATE DECIDE
            </strong>

            <p>
              Press SHUNT to randomly
              choose your next shiny
              target.
            </p>
          </div>

          <div>
            <span>📍</span>

            <strong>
              LOCATION GUARANTEED
            </strong>

            <p>
              Every Pokémon in the
              machine has at least one
              known hunt location.
            </p>
          </div>

          <div>
            <span>✨</span>

            <strong>
              SHINY TARGET
            </strong>

            <p>
              The machine only chooses
              Pokémon you can actually
              hunt.
            </p>
          </div>

        </div>
      )}

      {/* ===================================================
          STYLES
      =================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .shunt-page {
          width: 100%;
          max-width: 1250px;
          margin: 0 auto;
          padding: 35px 25px 90px;
          color: #edf7ff;
        }

        /* HEADER */

        .shunt-header {
          text-align: center;
          margin-bottom: 35px;
        }

        .shunt-title-icon {
          font-size: 34px;
          margin-bottom: 3px;
        }

        .shunt-header h1 {
          margin: 0;
          font-size: 48px;
          font-weight: 950;
          letter-spacing: 4px;
          text-shadow:
            0 0 20px
            rgba(101, 196, 255, 0.25);
        }

        .shunt-header p {
          margin: 8px 0 0;
          color: #8ea9c4;
          font-size: 17px;
        }

        /* MACHINE */

        .shunt-machine {
          position: relative;
          max-width: 800px;
          margin: 0 auto;
          padding: 25px 28px 30px;
          border:
            2px solid
            rgba(94, 177, 239, 0.55);
          border-radius: 30px;
          background:
            linear-gradient(
              180deg,
              rgba(8, 35, 65, 0.98),
              rgba(2, 16, 34, 0.99)
            );
          box-shadow:
            0 25px 70px
              rgba(0, 0, 0, 0.38),
            inset 0 0 40px
              rgba(50, 140, 220, 0.08);
        }

        .machine-top-light {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin-bottom: 15px;
        }

        .machine-top-light span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #70cfff;
          box-shadow:
            0 0 10px
            rgba(112, 207, 255, 0.8);
        }

        .machine-title {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          color: #bfe8ff;
          font-size: 16px;
          font-weight: 950;
          letter-spacing: 3px;
        }

        .machine-title span {
          color: #d4a8ff;
          font-size: 20px;
        }

        /* REELS */

        .reels {
          position: relative;
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 13px;
          height: 360px;
          overflow: hidden;
          padding: 15px;
          border:
            2px solid
            rgba(115, 189, 242, 0.42);
          border-radius: 20px;
          background: #020d1b;
          box-shadow:
            inset 0 0 30px
            rgba(0, 0, 0, 0.7);
        }

        .reel {
          position: relative;
          overflow: hidden;
          border:
            1px solid
            rgba(102, 171, 223, 0.28);
          border-radius: 14px;
          background:
            linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.35),
              rgba(13, 48, 78, 0.32),
              rgba(0, 0, 0, 0.35)
            );
        }

        .reel::before,
        .reel::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 85px;
          z-index: 4;
          pointer-events: none;
        }

        .reel::before {
          top: 0;
          background:
            linear-gradient(
              180deg,
              #020d1b,
              transparent
            );
        }

        .reel::after {
          bottom: 0;
          background:
            linear-gradient(
              0deg,
              #020d1b,
              transparent
            );
        }

        .reel-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding-top: 5px;
        }

        .reel.moving .reel-inner {
          animation:
            reelScroll
            0.12s
            linear
            infinite;
        }

        .reel.stopped .reel-inner {
          animation: none;
        }

        .reel-pokemon {
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 0 0 105px;
          width: 100%;
        }

        .reel-pokemon img {
          width: 105px;
          height: 105px;
          object-fit: contain;
          image-rendering: pixelated;
          transition:
            filter 0.1s ease;
        }

        .reel.moving .reel-pokemon img {
          filter: blur(3px);
        }

        /* CENTER WINDOW */

        .selection-window {
          position: absolute;
          left: 8px;
          right: 8px;
          top: 50%;
          height: 116px;
          transform:
            translateY(-50%);
          z-index: 8;
          pointer-events: none;
          border:
            2px solid
            rgba(132, 216, 255, 0.9);
          border-radius: 15px;
          box-shadow:
            0 0 0 3px
              rgba(3, 17, 31, 0.8),
            0 0 25px
              rgba(88, 195, 255, 0.22);
          background:
            rgba(80, 170, 230, 0.035);
        }

        .selection-arrow {
          position: absolute;
          top: 50%;
          transform:
            translateY(-50%);
          color: #8edcff;
          font-size: 17px;
          text-shadow:
            0 0 8px
            rgba(142, 220, 255, 0.8);
        }

        .selection-arrow.left {
          left: 5px;
        }

        .selection-arrow.right {
          right: 5px;
        }

        @keyframes reelScroll {
          0% {
            transform:
              translateY(-10%);
          }

          100% {
            transform:
              translateY(-65%);
          }
        }

        /* MACHINE BOTTOM */

        .machine-bottom {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: 17px;
          padding-top: 25px;
        }

        .machine-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #7792ac;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .status-light {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .ready-light {
          background: #63d6ff;
          box-shadow:
            0 0 9px
            #63d6ff;
        }

        .spinning-light {
          background: #d6a1ff;
          box-shadow:
            0 0 9px
            #d6a1ff;
          animation:
            pulse
            0.3s
            infinite
            alternate;
        }

        .result-light {
          background: #86f4ad;
          box-shadow:
            0 0 9px
            #86f4ad;
        }

        @keyframes pulse {
          from {
            opacity: 0.35;
          }

          to {
            opacity: 1;
          }
        }

        /* MAIN BUTTON */

        .shunt-button {
          position: relative;
          width: 260px;
          height: 72px;
          border:
            2px solid
            #b07aff;
          border-radius: 17px;
          color: white;
          background:
            linear-gradient(
              180deg,
              #8c4bd1,
              #5b2c91
            );
          font-size: 22px;
          font-weight: 950;
          letter-spacing: 3px;
          cursor: pointer;
          box-shadow:
            0 8px 0
              #351c58,
            0 0 25px
              rgba(153, 92, 225, 0.3);
          transition:
            transform 0.08s ease,
            box-shadow 0.08s ease;
        }

        .shunt-button:hover {
          background:
            linear-gradient(
              180deg,
              #9c5ce2,
              #6935a4
            );
          box-shadow:
            0 8px 0
              #351c58,
            0 0 35px
              rgba(153, 92, 225, 0.5);
        }

        .shunt-button:active {
          transform:
            translateY(6px);
          box-shadow:
            0 2px 0
              #351c58;
        }

        .shunt-button.disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* RESULT */

        .result-section {
          max-width: 900px;
          margin:
            55px auto 0;
          text-align: center;
        }

        .result-label {
          color: #d4b0ff;
          font-size: 15px;
          font-weight: 950;
          letter-spacing: 3px;
          margin-bottom: 18px;
        }

        .result-card {
          display: grid;
          grid-template-columns:
            330px 1fr;
          overflow: hidden;
          text-align: left;
          border:
            1px solid
            rgba(139, 105, 204, 0.5);
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(30, 16, 61, 0.98),
              rgba(5, 25, 49, 0.98)
            );
          box-shadow:
            0 20px 55px
              rgba(0, 0, 0, 0.28),
            0 0 35px
              rgba(137, 82, 213, 0.08);
        }

        .result-pokemon {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 420px;
          overflow: hidden;
          background:
            radial-gradient(
              circle,
              rgba(141, 88, 219, 0.24),
              transparent 65%
            );
        }

        .result-pokemon::before {
          content: "";
          position: absolute;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background:
            rgba(174, 115, 255, 0.08);
          filter: blur(10px);
        }

        .result-pokemon img {
          position: relative;
          z-index: 2;
          width: 280px;
          height: 280px;
          object-fit: contain;
          image-rendering: pixelated;
          animation:
            resultReveal
            0.65s
            cubic-bezier(
              0.2,
              1.4,
              0.3,
              1
            );
        }

        @keyframes resultReveal {
          0% {
            opacity: 0;
            transform:
              scale(0.3)
              rotate(-10deg);
          }

          70% {
            transform:
              scale(1.08)
              rotate(2deg);
          }

          100% {
            opacity: 1;
            transform:
              scale(1)
              rotate(0);
          }
        }

        .result-sparkles {
          position: absolute;
          top: 65px;
          right: 45px;
          z-index: 3;
          color: #e4c6ff;
          font-size: 28px;
          animation:
            sparkle
            1.2s
            infinite
            alternate;
        }

        .result-sparkles.bottom {
          top: auto;
          right: auto;
          bottom: 80px;
          left: 55px;
          font-size: 20px;
        }

        @keyframes sparkle {
          from {
            opacity: 0.3;
            transform:
              scale(0.8)
              rotate(0);
          }

          to {
            opacity: 1;
            transform:
              scale(1.2)
              rotate(20deg);
          }
        }

        .result-info {
          padding:
            45px 40px;
        }

        .result-number {
          color: #718aa4;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .result-info h2 {
          margin:
            5px 0 8px;
          color: #f1e7ff;
          font-size: 35px;
          font-weight: 950;
          letter-spacing: 2px;
        }

        .result-description {
          margin: 0;
          color: #91a8bf;
          font-size: 15px;
        }

        .result-divider {
          height: 1px;
          margin:
            25px 0;
          background:
            rgba(150, 105, 220, 0.25);
        }

        .locations-title {
          margin-bottom: 12px;
          color: #cba7ff;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 1.5px;
        }

        .locations-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
          max-height: 220px;
          overflow-y: auto;
          padding-right: 5px;
        }

        .location-card {
          padding:
            12px 14px;
          border:
            1px solid
            rgba(91, 139, 182, 0.3);
          border-radius: 11px;
          background:
            rgba(4, 23, 44, 0.65);
        }

        .location-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .location-main strong {
          color: #e5f2ff;
          font-size: 14px;
        }

        .location-main span {
          color: #76b5e7;
          font-size: 11px;
          font-weight: 800;
        }

        .location-details {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 7px;
          color: #7e98b2;
          font-size: 10px;
        }

        .location-details span {
          padding:
            4px 7px;
          border-radius: 6px;
          background:
            rgba(39, 82, 120, 0.25);
        }

        /* RESULT BUTTON */

        .result-shunt-again {
          margin-top: 25px;
          padding:
            13px 28px;
          border:
            1px solid
            rgba(190, 141, 255, 0.55);
          border-radius: 11px;
          color: #eadbff;
          background:
            rgba(80, 43, 124, 0.5);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 1px;
          cursor: pointer;
        }

        .result-shunt-again:hover {
          background:
            rgba(103, 56, 158, 0.7);
        }

        /* HELP */

        .machine-help {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 15px;
          max-width: 900px;
          margin:
            35px auto 0;
        }

        .machine-help > div {
          padding:
            20px;
          border:
            1px solid
            rgba(72, 135, 194, 0.28);
          border-radius: 15px;
          background:
            rgba(4, 24, 47, 0.6);
          text-align: center;
        }

        .machine-help span {
          display: block;
          margin-bottom: 8px;
          font-size: 25px;
        }

        .machine-help strong {
          display: block;
          color: #c4ddf4;
          font-size: 12px;
          letter-spacing: 1px;
        }

        .machine-help p {
          margin:
            8px 0 0;
          color: #7189a2;
          font-size: 12px;
          line-height: 1.5;
        }

        /* MOBILE */

        @media (max-width: 750px) {

          .shunt-page {
            padding:
              25px 13px 60px;
          }

          .shunt-header h1 {
            font-size: 34px;
            letter-spacing: 2px;
          }

          .shunt-header p {
            font-size: 14px;
          }

          .shunt-machine {
            padding:
              18px 13px 24px;
            border-radius: 21px;
          }

          .reels {
            height: 300px;
            gap: 6px;
            padding: 8px;
          }

          .reel-pokemon {
            flex-basis: 88px;
          }

          .reel-pokemon img {
            width: 82px;
            height: 82px;
          }

          .selection-window {
            left: 4px;
            right: 4px;
            height: 95px;
          }

          .shunt-button {
            width: 220px;
            height: 64px;
            font-size: 18px;
          }

          .result-card {
            grid-template-columns: 1fr;
          }

          .result-pokemon {
            min-height: 310px;
          }

          .result-pokemon img {
            width: 220px;
            height: 220px;
          }

          .result-info {
            padding:
              28px 22px;
          }

          .result-info h2 {
            font-size: 27px;
          }

          .machine-help {
            grid-template-columns:
              1fr;
          }
        }

      `}</style>
    </div>
  );
}