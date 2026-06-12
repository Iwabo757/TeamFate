import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Guide = {
  id: number;
  raid_name: string;
  guide_name: string;
  guide_url: string;
  notes: string | null;
};

function getEmbedUrl(
  url: string
) {
  try {
    const match =
      url.match(
        /\/d\/([^/]+)\//
      );

    if (!match)
      return url;

    return `https://docs.google.com/document/d/${match[1]}/preview`;
  } catch {
    return url;
  }
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

  return (
    <div className="page">
      <h1>
        Raid Guides
      </h1>

      <div className="admin-grid">
        {guides.map(
          (guide) => (
            <div
              key={guide.id}
              className="admin-card"
            >
              <h2>
                {guide.raid_name}
              </h2>

              <h3>
                {guide.guide_name}
              </h3>

              {guide.notes && (
                <p>
                  {guide.notes}
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

      {selectedGuide && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedGuide(
              null
            )
          }
        >
          <div
            className="event-modal"
            style={{
              width:
                "95vw",
              maxWidth:
                "1400px",
              height:
                "90vh",
            }}
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close-btn"
              onClick={() =>
                setSelectedGuide(
                  null
                )
              }
            >
              ×
            </button>

            <h2>
              {
                selectedGuide.guide_name
              }
            </h2>

            <iframe
              title="guide"
              src={getEmbedUrl(
                selectedGuide.guide_url
              )}
              style={{
                width:
                  "100%",
                height:
                  "80vh",
                border:
                  "none",
                borderRadius:
                  "12px",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}