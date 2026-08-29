import { useEffect, useMemo, useState } from "react";

type Season =
  | "Spring"
  | "Summer"
  | "Autumn"
  | "Winter";

type SeasonalEffectProps = {
  season: Season;
  duration?: number;
};

type Particle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  rotation: number;
  symbol: string;
};

/* =========================================
   SEASON CONFIGURATION
========================================= */

function getSeasonConfig(season: Season) {
  switch (season) {
    case "Spring":
      return {
        particleCount: 70,
        className: "season-spring",
        symbols: ["🌸", "✿", "🌸"],
      };

    case "Summer":
      return {
        particleCount: 55,
        className: "season-summer",
        symbols: ["✦", "✧", "•"],
      };

    case "Autumn":
      return {
        particleCount: 70,
        className: "season-autumn",
        symbols: ["🍂", "🍁", "🍂"],
      };

    case "Winter":
      return {
        particleCount: 100,
        className: "season-winter",
        symbols: ["❄", "❅", "❆"],
      };
  }
}

/* =========================================
   SEASONAL EFFECT
========================================= */

export default function SeasonalEffect({
  season,
  duration = 20000,
}: SeasonalEffectProps) {
  const [visible, setVisible] = useState(true);

  const config = useMemo(
    () => getSeasonConfig(season),
    [season]
  );

  /* =====================================
     EFFECT TIMER
  ====================================== */

  useEffect(() => {
    setVisible(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [season, duration]);

  /* =====================================
     GENERATE PARTICLES
  ====================================== */

  const particles = useMemo<Particle[]>(() => {
    return Array.from(
      {
        length: config.particleCount,
      },
      (_, index): Particle => ({
        id: index,

        left:
          Math.random() * 110 - 5,

        /*
         * Spread particle starts across
         * almost the entire 20-second effect.
         */
        delay:
          Math.random() * 14,

        /*
         * Faster movement prevents the
         * animation from looking slow
         * and jumpy.
         */
        duration:
          5 +
          Math.random() * 4,

        size:
          12 +
          Math.random() * 16,

        /*
         * Wide horizontal movement so
         * particles travel naturally
         * across the entire screen.
         */
        drift:
          -180 +
          Math.random() * 360,

        rotation:
          Math.random() * 360,

        symbol:
          config.symbols[
            Math.floor(
              Math.random() *
                config.symbols.length
            )
          ],
      })
    );
  }, [config]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <div
        className={`seasonal-effect ${config.className}`}
        aria-hidden="true"
      >
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="season-particle"
            style={
              {
                left: `${particle.left}%`,

                animationDelay:
                  `${particle.delay}s`,

                animationDuration:
                  `${particle.duration}s`,

                fontSize:
                  `${particle.size}px`,

                "--drift":
                  `${particle.drift}px`,

                "--rotation":
                  `${particle.rotation}deg`,
              } as React.CSSProperties
            }
          >
            {particle.symbol}
          </span>
        ))}
      </div>

      <style>{`

        /* =====================================
           SEASONAL OVERLAY
        ====================================== */

        .seasonal-effect {
          position: fixed;

          inset: 0;

          width: 100%;
          height: 100dvh;

          overflow: hidden;

          pointer-events: none;

          z-index: 9999;

          animation:
            seasonalFadeOut
            2s ease
            forwards;

          animation-delay: 18s;
        }

        /* =====================================
           PARTICLES
        ====================================== */

        .season-particle {
          position: absolute;

          top: -10vh;

          display: block;

          user-select: none;

          pointer-events: none;

          will-change:
            transform,
            opacity;

          backface-visibility: hidden;

          transform:
            translate3d(
              0,
              0,
              0
            );

          opacity: 0;
        }

        /* =====================================
           SPRING
        ====================================== */

        .season-spring
        .season-particle {
          filter:
            drop-shadow(
              0 0 6px
              rgba(
                255,
                150,
                210,
                0.45
              )
            );

          animation:
            springFall
            linear
            forwards;
        }

        /* =====================================
           SUMMER
        ====================================== */

        .season-summer
        .season-particle {
          color:
            rgba(
              255,
              225,
              120,
              0.95
            );

          text-shadow:
            0 0 10px
            rgba(
              255,
              210,
              70,
              0.8
            );

          animation:
            summerFloat
            ease-in-out
            forwards;
        }

        /* =====================================
           AUTUMN
        ====================================== */

        .season-autumn
        .season-particle {
          filter:
            drop-shadow(
              0 0 5px
              rgba(
                255,
                120,
                30,
                0.35
              )
            );

          animation:
            autumnFall
            ease-in-out
            forwards;
        }

        /* =====================================
           WINTER
        ====================================== */

        .season-winter
        .season-particle {
          color: #ffffff;

          text-shadow:
            0 0 8px
            rgba(
              180,
              225,
              255,
              0.8
            );

          animation:
            winterFall
            linear
            forwards;
        }

        /* =====================================
           SPRING ANIMATION
        ====================================== */

        @keyframes springFall {
          0% {
            transform:
              translate3d(
                0,
                -10vh,
                0
              )
              rotate(
                var(--rotation)
              );

            opacity: 0;
          }

          8% {
            opacity: 1;
          }

          25% {
            transform:
              translate3d(
                calc(
                  var(--drift) * 0.2
                ),
                20vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 180deg
                )
              );
          }

          50% {
            transform:
              translate3d(
                calc(
                  var(--drift) * -0.15
                ),
                50vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 360deg
                )
              );
          }

          75% {
            transform:
              translate3d(
                calc(
                  var(--drift) * 0.6
                ),
                80vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 540deg
                )
              );
          }

          100% {
            transform:
              translate3d(
                var(--drift),
                115vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 720deg
                )
              );

            opacity: 0;
          }
        }

        /* =====================================
           SUMMER ANIMATION
        ====================================== */

        @keyframes summerFloat {
          0% {
            transform:
              translate3d(
                0,
                110vh,
                0
              )
              scale(0.6);

            opacity: 0;
          }

          10% {
            opacity: 0.9;
          }

          35% {
            transform:
              translate3d(
                calc(
                  var(--drift) * 0.3
                ),
                70vh,
                0
              )
              scale(0.9);
          }

          65% {
            transform:
              translate3d(
                calc(
                  var(--drift) * -0.2
                ),
                35vh,
                0
              )
              scale(1);
          }

          100% {
            transform:
              translate3d(
                var(--drift),
                -15vh,
                0
              )
              scale(1.2);

            opacity: 0;
          }
        }

        /* =====================================
           AUTUMN ANIMATION
        ====================================== */

        @keyframes autumnFall {
          0% {
            transform:
              translate3d(
                0,
                -10vh,
                0
              )
              rotate(
                var(--rotation)
              );

            opacity: 0;
          }

          8% {
            opacity: 1;
          }

          25% {
            transform:
              translate3d(
                calc(
                  var(--drift) * 0.25
                ),
                20vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 180deg
                )
              );
          }

          50% {
            transform:
              translate3d(
                calc(
                  var(--drift) * -0.2
                ),
                50vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 360deg
                )
              );
          }

          75% {
            transform:
              translate3d(
                calc(
                  var(--drift) * 0.55
                ),
                80vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 540deg
                )
              );
          }

          100% {
            transform:
              translate3d(
                var(--drift),
                115vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 900deg
                )
              );

            opacity: 0;
          }
        }

        /* =====================================
           WINTER ANIMATION
        ====================================== */

        @keyframes winterFall {
          0% {
            transform:
              translate3d(
                0,
                -10vh,
                0
              )
              rotate(
                var(--rotation)
              );

            opacity: 0;
          }

          8% {
            opacity: 0.95;
          }

          25% {
            transform:
              translate3d(
                calc(
                  var(--drift) * 0.25
                ),
                20vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 90deg
                )
              );
          }

          50% {
            transform:
              translate3d(
                calc(
                  var(--drift) * -0.1
                ),
                50vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 180deg
                )
              );
          }

          75% {
            transform:
              translate3d(
                calc(
                  var(--drift) * 0.55
                ),
                80vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 270deg
                )
              );
          }

          100% {
            transform:
              translate3d(
                var(--drift),
                115vh,
                0
              )
              rotate(
                calc(
                  var(--rotation) + 360deg
                )
              );

            opacity: 0;
          }
        }

        /* =====================================
           OVERLAY FADE
        ====================================== */

        @keyframes seasonalFadeOut {
          from {
            opacity: 1;
          }

          to {
            opacity: 0;
          }
        }

        /* =====================================
           MOBILE
        ====================================== */

        @media (
          max-width: 768px
        ) {
          .season-particle {
            transform:
              scale(0.85);
          }
        }

        /* =====================================
           REDUCED MOTION
        ====================================== */

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .seasonal-effect {
            display: none;
          }
        }

      `}</style>
    </>
  );
}