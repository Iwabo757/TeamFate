import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminRaidGuides() {
  const [guides, setGuides] =
    useState<any[]>([]);

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

  async function saveGuide(
    guide: any
  ) {
    await supabase
      .from("raid_guides")
      .update({
        guide_url:
          guide.guide_url,

        notes:
          guide.notes,
      })
      .eq("id", guide.id);

    alert("Saved");
  }

  return (
    <div className="page">
      <h1>
        Manage Raid Guides
      </h1>

      {guides.map(
        (guide, index) => (
          <div
            key={guide.id}
            className="admin-card"
          >
            <h3>
              {
                guide.guide_name
              }
            </h3>

            <input
              value={
                guide.guide_url
              }
              onChange={(e) => {
                const copy =
                  [
                    ...guides,
                  ];

                copy[
                  index
                ].guide_url =
                  e.target.value;

                setGuides(
                  copy
                );
              }}
            />

            <textarea
              value={
                guide.notes ||
                ""
              }
              onChange={(e) => {
                const copy =
                  [
                    ...guides,
                  ];

                copy[
                  index
                ].notes =
                  e.target.value;

                setGuides(
                  copy
                );
              }}
            />

            <button
              className="save-btn"
              onClick={() =>
                saveGuide(
                  guide
                )
              }
            >
              Save
            </button>
          </div>
        )
      )}
    </div>
  );
}