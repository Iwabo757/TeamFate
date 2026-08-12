import { Link } from "react-router-dom";

export default function Tools() {
  const tools = [
    {
      title: "Guides",
      description:
        "Helpful guides, mechanics, hunting information, and everything you need to know before starting your next hunt.",
      icon: "📖",
      path: "/guides",
    },
    {
      title: "Horde Hunter",
      description:
        "Find Pokémon hordes by region and season. Search for specific Pokémon or routes and discover where to hunt.",
      icon: "🎯",
      path: "/horde-hunter",
    },
    {
      title: "Shunt Machine",
      description:
        "Can't decide what to hunt next? Let Fate choose a random shuntable Pokémon for you.",
      icon: "🎰",
      path: "/shunt-machine",
    },
  ];

  return (
    <div className="tools-page">
      <div className="tools-header">
        <div className="tools-icon">🛠️</div>

        <h1>TOOLS</h1>

        <p>
          Everything you need to help plan your next shiny hunt.
        </p>
      </div>

      <div className="tools-grid">
        {tools.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className="tool-card"
          >
            <div className="tool-card-top">
              <div className="tool-icon">
                {tool.icon}
              </div>

              <div className="tool-arrow">
                →
              </div>
            </div>

            <div className="tool-content">
              <h2>{tool.title}</h2>

              <p>{tool.description}</p>
            </div>

            <div className="tool-open">
              OPEN TOOL
              <span>→</span>
            </div>
          </Link>
        ))}
      </div>

      <style>{`

        .tools-page {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 25px 90px;
          color: #edf7ff;
        }

        /* =========================
           HEADER
        ========================= */

        .tools-header {
          text-align: center;
          margin-bottom: 45px;
        }

        .tools-icon {
          font-size: 38px;
          margin-bottom: 8px;
        }

        .tools-header h1 {
          margin: 0;

          font-size: 46px;
          font-weight: 950;

          letter-spacing: 4px;

          color: #edf7ff;

          text-shadow:
            0 0 20px
            rgba(101, 196, 255, 0.2);
        }

        .tools-header p {
          margin: 10px 0 0;

          color: #819bb5;

          font-size: 15px;
        }

        /* =========================
           GRID
        ========================= */

        .tools-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 20px;

          max-width: 1000px;

          margin: 0 auto;
        }

        /* =========================
           CARD
        ========================= */

        .tool-card {
          position: relative;

          display: flex;

          flex-direction: column;

          min-height: 265px;

          padding: 27px;

          overflow: hidden;

          text-decoration: none;

          border:
            1px solid
            rgba(82, 151, 207, 0.32);

          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              rgba(8, 38, 67, 0.95),
              rgba(3, 20, 39, 0.98)
            );

          box-shadow:
            0 12px 35px
            rgba(0, 0, 0, 0.18);

          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        .tool-card::before {
          content: "";

          position: absolute;

          top: -80px;
          right: -80px;

          width: 190px;
          height: 190px;

          border-radius: 50%;

          background:
            rgba(72, 170, 238, 0.06);

          filter: blur(25px);

          pointer-events: none;
        }

        .tool-card:hover {
          transform:
            translateY(-5px);

          border-color:
            rgba(101, 190, 246, 0.65);

          background:
            linear-gradient(
              145deg,
              rgba(10, 47, 81, 0.98),
              rgba(3, 22, 43, 0.99)
            );

          box-shadow:
            0 18px 45px
            rgba(0, 0, 0, 0.28),
            0 0 30px
            rgba(70, 168, 235, 0.08);
        }

        /* =========================
           TOP
        ========================= */

        .tool-card-top {
          display: flex;

          justify-content:
            space-between;

          align-items:
            flex-start;
        }

        .tool-icon {
          display: flex;

          justify-content:
            center;

          align-items:
            center;

          width: 62px;
          height: 62px;

          border:
            1px solid
            rgba(100, 178, 230, 0.3);

          border-radius: 15px;

          background:
            rgba(31, 91, 135, 0.2);

          font-size: 31px;

          box-shadow:
            inset 0 0 18px
            rgba(66, 157, 218, 0.05);
        }

        .tool-arrow {
          color: #6fa9d1;

          font-size: 25px;

          transition:
            transform 0.18s ease,
            color 0.18s ease;
        }

        .tool-card:hover
        .tool-arrow {
          color: #9bdcff;

          transform:
            translateX(4px);
        }

        /* =========================
           CONTENT
        ========================= */

        .tool-content {
          flex: 1;

          padding-top: 22px;
        }

        .tool-content h2 {
          margin: 0 0 9px;

          color: #e8f5ff;

          font-size: 24px;
          font-weight: 900;

          letter-spacing: 0.5px;
        }

        .tool-content p {
          max-width: 520px;

          margin: 0;

          color: #829bb4;

          font-size: 13px;

          line-height: 1.65;
        }

        /* =========================
           OPEN BUTTON
        ========================= */

        .tool-open {
          display: flex;

          align-items: center;

          gap: 8px;

          margin-top: 22px;

          color: #78c9f5;

          font-size: 11px;
          font-weight: 950;

          letter-spacing: 1.5px;
        }

        .tool-open span {
          font-size: 15px;

          transition:
            transform 0.18s ease;
        }

        .tool-card:hover
        .tool-open span {
          transform:
            translateX(4px);
        }

        /* =========================
           SHUNT MACHINE
           CENTER THE THIRD CARD
        ========================= */

        .tool-card:last-child {
          grid-column: 1 / -1;

          width: calc(
            50% - 10px
          );

          justify-self: center;
        }

        /* =========================
           MOBILE
        ========================= */

        @media (max-width: 700px) {

          .tools-page {
            padding:
              28px 14px 60px;
          }

          .tools-header {
            margin-bottom: 30px;
          }

          .tools-header h1 {
            font-size: 35px;

            letter-spacing: 3px;
          }

          .tools-header p {
            font-size: 13px;

            line-height: 1.5;
          }

          .tools-grid {
            grid-template-columns: 1fr;

            gap: 14px;
          }

          .tool-card {
            min-height: 235px;

            padding: 22px;
          }

          .tool-card:last-child {
            grid-column: auto;

            width: 100%;

            justify-self: stretch;
          }

          .tool-content h2 {
            font-size: 21px;
          }

          .tool-content p {
            font-size: 12px;
          }

        }

      `}</style>
    </div>
  );
}