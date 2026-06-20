import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const RAID_SPRITES: Record<string, string> = {
  Heatran:
    "https://img.pokemondb.net/sprites/home/normal/heatran.png",

  Cresselia:
    "https://img.pokemondb.net/sprites/home/normal/cresselia.png",

  Meloetta:
    "https://img.pokemondb.net/sprites/home/normal/meloetta.png",

  Virizion:
    "https://img.pokemondb.net/sprites/home/normal/virizion.png",

  Terrakion:
    "https://img.pokemondb.net/sprites/home/normal/terrakion.png",

  Cobalion:
    "https://img.pokemondb.net/sprites/home/normal/cobalion.png",
};

type Guide = {
  id: number;
  raid_name: string;
  guide_name: string;
  guide_url: string;
  notes: string | null;
  category: "gym" | "raids";

  money_per_hour?: string;
  team_cost?: string;
  difficulty?: string;
  credits?: string;
  description?: string;
};


function getEmbedUrl(
  url: string
) {
  try {
    const cleanUrl =
      url.trim();

    // Published Google Doc
    const pubMatch =
      cleanUrl.match(
        /document\/u\/\d+\/d\/e\/([^/]+)\/pub/
      );

    if (pubMatch) {
      return `https://docs.google.com/document/d/e/${pubMatch[1]}/pub?embedded=true`;
    }

    // Normal Google Doc
    const docMatch =
      cleanUrl.match(
        /document\/d\/([^/]+)/
      );

    if (docMatch) {
      return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
    }

    // Google Drive files
    const driveMatch =
      cleanUrl.match(
        /file\/d\/([^/]+)/
      );

    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    return cleanUrl;
  } catch {
    return url;
  }
}

function isEmbeddable(
  url: string
) {
  return (
    url.includes(
      "docs.google.com"
    ) ||
    url.endsWith(".pdf")
  );
}


export default function RaidGuides() {
const [guides, setGuides] =
  useState<Guide[]>([]);

const [
  selectedGuide,
  setSelectedGuide,
] =
  useState<Guide | null>(
    null
  );

const [tab, setTab] =
    useState<
      "gym" | "raids"
    >("gym");

  useEffect(() => {
    loadGuides();
  }, []);

  async function loadGuides() {
    const { data } =
      await supabase
        .from("raid_guides")
        .select("*")
        .order(
          "display_order"
        );

    setGuides(data || []);
  }

  const displayedGuides =
    guides.filter(
      (guide) =>
        guide.category === tab
    );

  return (
    <div className="page">
      <h1>Guides</h1>

      <div className="leaderboard-filters">
        <button
          className={`leader-filter ${
            tab === "gym"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setTab("gym")
          }
        >
          Gym Reruns
        </button>

        <button
          className={`leader-filter ${
            tab === "raids"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setTab("raids")
          }
        >
          Raid Guides
        </button>
      </div>

      {tab === "gym" && (
        <div
          className="admin-grid"
          style={{
            marginTop: "20px",
          }}
        >
          {displayedGuides.map(
            (guide) => (
              <div
                key={guide.id}
                className="admin-card"
              >
                <h2>
                  {
                    guide.guide_name
                  }
                </h2>

                <p
                  style={{
                    lineHeight:
                      1.7,
                    marginBottom:
                      "25px",
                  }}
                >
                  {
                    guide.description
                  }
                </p>

                <div
                  style={{
                    display:
                      "grid",
                    gap: "12px",
                    marginBottom:
                      "25px",
                  }}
                >
                  <div>
                    <strong>
                      Money Per
                      Hour:
                    </strong>{" "}
                    {
                      guide.money_per_hour
                    }
                  </div>

                  <div>
                    <strong>
                      Cost of
                      Team:
                    </strong>{" "}
                    {
                      guide.team_cost
                    }
                  </div>

                  <div>
                    <strong>
                      Difficulty:
                    </strong>{" "}
                    {
                      guide.difficulty
                    }
                  </div>

                  <div>
                    <strong>
                      Credits:
                    </strong>{" "}
                    {
                      guide.credits
                    }
                  </div>
                </div>

                <button
                  className="save-btn"
onClick={() =>
  setSelectedGuide(
    guide
  )
}
                >
                  Visit{" "}
                  {
                    guide.guide_name
                  }
                </button>
              </div>
            )
          )}
        </div>
      )}

      {tab === "raids" && (
        <div
          className="admin-grid"
          style={{
            marginTop: "20px",
          }}
        >
          {displayedGuides.map(
            (guide) => (
              <div
                key={guide.id}
                className="admin-card"
              >
                <div
                  style={{
                    textAlign:
                      "center",
                  }}
                >
                  <img
                    src={
                      RAID_SPRITES[
                        guide
                          .raid_name
                      ]
                    }
                    alt=""
                    style={{
                      width:
                        "100px",
                      height:
                        "100px",
                      objectFit:
                        "contain",
                      marginBottom:
                        "10px",
                    }}
                  />

                  <h2>
                    {
                      guide.raid_name
                    }
                  </h2>
                </div>

                <h3>
                  {
                    guide.guide_name
                  }
                </h3>

                {guide.notes && (
                  <p>
                    {
                      guide.notes
                    }
                  </p>
                )}

                <button
                  className="save-btn"
onClick={() =>
  setSelectedGuide(
    guide
  )
}
                >
                  Open Guide
                </button>
              </div>
            )
          )}
        </div>
      )}

{selectedGuide && (
  <div
    className="modal-overlay"
    onClick={() =>
      setSelectedGuide(null)
    }
  >
    <div
      className="event-modal"
      style={{
        width: "95vw",
        maxWidth: "1400px",
        height: "90vh",
      }}
      onClick={(e) =>
        e.stopPropagation()
      }
    >
      <button
        className="close-btn"
        onClick={() =>
          setSelectedGuide(null)
        }
      >
        ×
      </button>

      <h2
        style={{
          marginBottom:
            "15px",
        }}
      >
        {
          selectedGuide.guide_name
        }
      </h2>

{isEmbeddable(
  selectedGuide.guide_url
) ? (
  <>
    <iframe
      title="guide"
      src={getEmbedUrl(
        selectedGuide.guide_url
      )}
      style={{
        width: "100%",
        height: "75vh",
        border: "none",
        borderRadius: "12px",
        background: "#fff",
      }}
    />

    <div
      style={{
        textAlign:
          "center",
        marginTop:
          "10px",
      }}
    >
      <a
        href={
          selectedGuide.guide_url
        }
        target="_blank"
        rel="noreferrer"
      >
        Open Guide In New Tab
      </a>
    </div>
  </>
) : (
  <div
    style={{
      textAlign:
        "center",
      padding:
        "50px",
    }}
  >
    <h3>
      This guide
      cannot be
      embedded
    </h3>

    <p>
      Some websites
      block embedding
      for security
      reasons.
    </p>

    <button
      className="save-btn"
      onClick={() =>
        window.open(
          selectedGuide.guide_url,
          "_blank"
        )
      }
    >
      Open Guide
    </button>
  </div>
)}
    </div>
  </div>
)}
    </div>
  );
}