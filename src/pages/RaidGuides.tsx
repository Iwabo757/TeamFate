import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Guide = {
  id: number;
  raid_name: string;
  guide_name: string;
  guide_url: string;
  notes: string | null;
};

export default function RaidGuides() {
  const [guides, setGuides] =
    useState<Guide[]>([]);

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

              <a
                href={
                  guide.guide_url
                }
                target="_blank"
                rel="noreferrer"
              >
                <button className="save-btn">
                  Open Guide
                </button>
              </a>
            </div>
          )
        )}
      </div>
    </div>
  );
}