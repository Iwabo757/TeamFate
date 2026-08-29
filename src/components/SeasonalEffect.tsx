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
  symbol?: string;
};

function getSeasonConfig(season: Season) {
  switch (season) {
    case "Spring":
      return {
        particleCount: 35,
        className: "season-spring",
        symbols: ["🌸", "🌸", "✿"],
      };

    case "Summer":
      return {
        particleCount: 30,
        className: "season-summer",
        symbols: ["✦", "·", "✧"],
      };

    case "Autumn":
      return {
        particleCount: 40,
        className: "season-autumn",
        symbols: ["🍂", "🍁", "🍂"],
      };

    case "Winter":
      return {
        particleCount: 55,
        className: "season-winter",
        symbols: ["❄", "❅", "❆"],
      };
  }
}

export default function SeasonalEffect({
  season,
  duration = 4500,
}: SeasonalEffectProps) {
  const [visible, setVisible] =
    useState(true);

  useEffect(() => {
    setVisible(true);

    const timer =
      window.setTimeout(() => {
        setVisible(false);
      }, duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [season, duration]);

  const config =
    getSeasonConfig(season);

const particles = useMemo<Particle[]>(() => {
  return Array.from(
    {
      length: config.particleCount,
    },
    (_, index): Particle => ({
      id: index,

      left:
        Math.random() * 100,

      delay:
        Math.random() * 2.5,

      duration:
        3.5 +
        Math.random() * 3,

      size:
        12 +
        Math.random() * 18,

      drift:
        -100 +
        Math.random() * 200,

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
}, [season]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <div
        className={`seasonal-effect ${config.className}`}
        aria-hidden="true"
      >
        {particles.map(
          (particle) => (
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
          )
        )}
      </div>

      <style>{`

        /* =====================================
           SEASONAL OVERLAY
        ====================================== */

        .seasonal-effect {
          position: fixed;

          inset: 0;

          width: 100vw;
          height: 100vh;

          overflow: hidden;

          pointer-events: none;

          z-index: 9999;

          animation:
            seasonalFadeOut
            1s ease
            forwards;

          animation-delay: 3.5s;
        }

        .season-particle {
          position: absolute;

          top: -80px;

          display: block;

          user-select: none;

          animation:
            seasonalFall
            linear
            forwards;

          will-change:
            transform,
            opacity;

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

          animation-name:
            springFall;
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
              0.9
            );

          text-shadow:
            0 0 10px
            rgba(
              255,
              210,
              70,
              0.9
            );

          animation-name:
            summerFloat;
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

          animation-name:
            autumnFall;
        }

        /* =====================================
           WINTER
        ====================================== */

        .season-winter
        .season-particle {
          color:
            #ffffff;

          text-shadow:
            0 0 8px
            rgba(
              180,
              225,
              255,
              0.8
            );

          animation-name:
            winterFall;
        }

        /* =====================================
           SPRING ANIMATION
        ====================================== */

        @keyframes springFall {

          0% {
            transform:
              translate3d(
                0,
                -80px,
                0
              )
              rotate(
                var(--rotation)
              );

            opacity: 0;
          }

          10% {
            opacity: 1;
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
                  var(--rotation) + 540deg
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
              scale(0.5);

            opacity: 0;
          }

          15% {
            opacity: 1;
          }

          100% {
            transform:
              translate3d(
                var(--drift),
                -20vh,
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
                -80px,
                0
              )
              rotate(
                var(--rotation)
              );

            opacity: 0;
          }

          10% {
            opacity: 1;
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
           WINTER ANIMATION
        ====================================== */

        @keyframes winterFall {

          0% {
            transform:
              translate3d(
                0,
                -60px,
                0
              )
              rotate(0deg);

            opacity: 0;
          }

          10% {
            opacity: 0.95;
          }

          100% {
            transform:
              translate3d(
                var(--drift),
                110vh,
                0
              )
              rotate(360deg);

            opacity: 0;
          }

        }

        /* =====================================
           OVERLAY FADE
        ====================================== */

        @keyframes seasonalFadeOut {

          0% {
            opacity: 1;
          }

          100% {
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
              scale(0.8);
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