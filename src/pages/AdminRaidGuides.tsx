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
        raid_name:
          guide.raid_name,

        guide_name:
          guide.guide_name,

        guide_url:
          guide.guide_url,

        notes:
          guide.notes,

        display_order:
          guide.display_order,
      })
      .eq("id", guide.id);

    loadGuides();
  }

  async function deleteGuide(
    id: number
  ) {
    if (
      !confirm(
        "Delete guide?"
      )
    )
      return;

    await supabase
      .from("raid_guides")
      .delete()
      .eq("id", id);

    loadGuides();
  }

  async function createGuide() {
    await supabase
      .from("raid_guides")
      .insert({
        raid_name:
          "New Raid",

        guide_name:
          "New Guide",

        guide_url: "",

        notes: "",

        display_order: 999,
      });

    loadGuides();
  }

  return (
    <div className="page">
      <h1>
        Manage Raid Guides
      </h1>

      <button
        className="save-btn"
        onClick={
          createGuide
        }
      >
        Add Guide
      </button>

      {guides.map(
        (guide, index) => (
          <div
            key={guide.id}
            className="admin-card"
            style={{
              marginTop:
                "20px",
            }}
          >
            <input
              value={
                guide.raid_name
              }
              placeholder="Raid"
              onChange={(e) => {
                const copy =
                  [
                    ...guides,
                  ];

                copy[
                  index
                ].raid_name =
                  e.target.value;

                setGuides(
                  copy
                );
              }}
            />

            <input
              value={
                guide.guide_name
              }
              placeholder="Guide Name"
              onChange={(e) => {
                const copy =
                  [
                    ...guides,
                  ];

                copy[
                  index
                ].guide_name =
                  e.target.value;

                setGuides(
                  copy
                );
              }}
            />

            <input
              value={
                guide.guide_url
              }
              placeholder="Google Doc URL"
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
              placeholder="Notes"
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

            <input
              type="number"
              value={
                guide.display_order
              }
              onChange={(e) => {
                const copy =
                  [
                    ...guides,
                  ];

                copy[
                  index
                ].display_order =
                  Number(
                    e.target.value
                  );

                setGuides(
                  copy
                );
              }}
            />

            <div
              style={{
                display:
                  "flex",
                gap: "10px",
                marginTop:
                  "10px",
              }}
            >
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

              <button
                className="delete-btn"
                onClick={() =>
                  deleteGuide(
                    guide.id
                  )
                }
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}