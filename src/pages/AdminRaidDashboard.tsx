import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";

type RaidBoss = {
  id: number;
  name: string;
};

type RaidGuide = {
  id: number;

  category: "gym" | "raids";

  raid_name: string;
  guide_name: string;
  guide_url: string;

  notes: string | null;

  description: string | null;

  money_per_hour: string | null;

  team_cost: string | null;

  difficulty: string | null;

  credits: string | null;

  display_order: number;
};

type MemberRow = {
  nickname: string;

  raids: Record<
    string,
    {
      parts: string[];
      tracking_enabled: boolean;
      weekly_cooldown_end: string | null;
      recapture_cooldown_end: string | null;
    }
  >;
};
const RAID_SPRITES: Record<
  string,
  string
> = {
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

export default function AdminRaidDashboard() {
  const [raids, setRaids] =
    useState<RaidBoss[]>([]);

  const [members, setMembers] =
    useState<MemberRow[]>([]);

const [tab, setTab] =
  useState<
    "members" | "guides"
  >("members");

const [guides, setGuides] =
  useState<RaidGuide[]>(
    []
  );
  useEffect(() => {
    loadData();

    const interval =
      setInterval(
        loadData,
        60000
      );

    return () =>
      clearInterval(interval);
  }, []);

  async function loadData() {
    const { data: raidData } =
      await supabase
        .from("raid_bosses")
        .select("*")
        .order("id");

    setRaids(raidData || []);

const {
  data: guideData,
} = await supabase
  .from("raid_guides")
  .select("*")
  .order(
    "display_order"
  );

setGuides(
  guideData || []
);

    const { data } =
      await supabase
        .from("member_raids")
        .select(`
          parts,
          tracking_enabled,
          weekly_cooldown_end,
          recapture_cooldown_end,

          profiles (
            nickname
          ),

          raid_bosses (
            name
          )
        `);

    const grouped: Record<
      string,
      MemberRow
    > = {};

    (data || []).forEach(
      (row: any) => {
        const nickname =
          row.profiles
            ?.nickname ||
          "Unknown";

        if (
          !grouped[nickname]
        ) {
          grouped[
            nickname
          ] = {
            nickname,
            raids: {},
          };
        }

        grouped[
          nickname
        ].raids[
          row.raid_bosses
            ?.name
        ] = {
          parts:
            row.parts || [],

          tracking_enabled:
            row.tracking_enabled,

          weekly_cooldown_end:
            row.weekly_cooldown_end,

          recapture_cooldown_end:
            row.recapture_cooldown_end,
        };
      }
    );

    setMembers(
      Object.values(
        grouped
      )
    );
  }

  function getStatus(
    raid: any
  ) {
    if (!raid) {
      return {
        text: "N/A",
        color: "#555",
      };
    }

    if (
      !raid.tracking_enabled
    ) {
      return {
        text:
          "Opted Out",
        color: "#777",
      };
    }

    const weeklyReady =
      !raid.weekly_cooldown_end ||
      new Date(
        raid.weekly_cooldown_end
      ) < new Date();

    const recaptureReady =
      !raid.recapture_cooldown_end ||
      new Date(
        raid.recapture_cooldown_end
      ) < new Date();

    if (
      raid.parts.length === 0
    ) {
      return {
        text:
          "Not Ready",
        color: "#666",
      };
    }

    if (
      weeklyReady &&
      recaptureReady
    ) {
      return {
        text: "Ready",
        color: "#d9b75d",
      };
    }

    return {
      text:
        "Cooldown",
      color: "#0b8f4d",
    };
  }
async function createGuide() {
await supabase
  .from("raid_guides")
  .insert({
    category: "gym",

    raid_name: "New Raid",

    guide_name: "New Guide",

    guide_url: "Url",

    notes: "",

    description: "",

    money_per_hour: "",

    team_cost: "",

    difficulty: "",

    credits: "",

    display_order: 999,
  });

  loadData();
}

async function saveGuide(
  guide: RaidGuide
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

description:
  guide.description,

money_per_hour:
  guide.money_per_hour,

team_cost:
  guide.team_cost,

difficulty:
  guide.difficulty,

credits:
  guide.credits,

category:
  guide.category,

      display_order:
        guide.display_order,
    })
    .eq("id", guide.id);

  loadData();
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

  loadData();
}

  return (
    <div className="page">

<h1>
  Raid Dashboard
</h1>

<div
  className="leaderboard-filters"
>
  <button
    className={`leader-filter ${
      tab === "members"
        ? "active"
        : ""
    }`}
    onClick={() =>
      setTab(
        "members"
      )
    }
  >
    Members
  </button>

  <button
    className={`leader-filter ${
      tab === "guides"
        ? "active"
        : ""
    }`}
    onClick={() =>
      setTab(
        "guides"
      )
    }
  >
    Guides
  </button>
</div>



{tab ===
  "members" && (
      <div
        style={{
          overflowX:
            "auto",
        }}
      >
        <table
          className="raid-table"
        >
          <thead>
            <tr>
              <th>
                Member
              </th>

              {raids.map(
                (raid) => (
                  <th
                    key={
                      raid.id
                    }
                  >
                    {
                      raid.name
                    }
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {members.map(
              (
                member
              ) => (
                <tr
                  key={
                    member.nickname
                  }
                >
                  <td>
                    {
                      member.nickname
                    }
                  </td>


                  {raids.map(
                    (
                      raid
                    ) => {
                      const info =
                        member
                          .raids[
                          raid
                            .name
                        ];

                      const status =
                        getStatus(
                          info
                        );

                      return (
                        <td
                          key={
                            raid.id
                          }
                        >
                          <div
                            style={{
                              background:
                                status.color,

                              borderRadius:
                                "14px",

                              padding:
                                "6px",

                              color:
                                "#fff",

                              minWidth:
                                "120px",
                            }}
                          >
                            <div>
                              {info
                                ?.parts
                                ?.join(
                                  ", "
                                ) ||
                                "N/A"}
                            </div>

                            <div>
                              {
                                status.text
                              }
                            </div>
                          </div>
                        </td>
                      );
                    }
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
)}
{tab === "guides" && (
  <>
    <button
      className="save-btn"
      onClick={createGuide}
    >
      Add Guide
    </button>

    <div
      className="admin-grid"
      style={{
        marginTop: "20px",
      }}
    >
      {guides.map(
        (guide, index) => (
          <div
            key={guide.id}
            className="admin-card"
          >
            <h3>
              Guide Setup
            </h3>

            <label>
              Category
            </label>

            <select
              value={
                guide.category
              }
              onChange={(e) => {
                const copy =
                  [...guides];

                copy[
                  index
                ].category =
                  e.target
                    .value as
                    | "gym"
                    | "raids";

                setGuides(
                  copy
                );
              }}
            >
              <option value="gym">
                Gym Rerun
              </option>

              <option value="raids">
                Raid Guide
              </option>
            </select>

            {guide.category ===
            "raids" ? (
              <>
                <label>
                  Raid
                </label>

                <select
                  value={
                    guide.raid_name
                  }
                  onChange={(
                    e
                  ) => {
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
                >
                  <option>
                    Heatran
                  </option>

                  <option>
                    Cresselia
                  </option>

                  <option>
                    Meloetta
                  </option>

                  <option>
                    Virizion
                  </option>

                  <option>
                    Terrakion
                  </option>

                  <option>
                    Cobalion
                  </option>
                </select>

                <div
                  style={{
                    textAlign:
                      "center",
                    margin:
                      "10px 0",
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
                        "90px",
                      height:
                        "90px",
                      objectFit:
                        "contain",
                    }}
                  />
                </div>

                <label>
                  Guide Name
                </label>

                <input
                  value={
                    guide.guide_name
                  }
                  onChange={(
                    e
                  ) => {
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

                <label>
                  Guide URL
                </label>

                <input
                  value={
                    guide.guide_url
                  }
                  onChange={(
                    e
                  ) => {
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

                <label>
                  Notes
                </label>

                <textarea
                  value={
                    guide.notes ||
                    ""
                  }
                  onChange={(
                    e
                  ) => {
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
              </>
            ) : (
              <>
                <label>
                  Gym Guide
                  Name
                </label>

                <input
                  value={
                    guide.guide_name
                  }
                  onChange={(
                    e
                  ) => {
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

                <label>
                  Description
                </label>

                <textarea
                  value={
                    guide.description ||
                    ""
                  }
                  onChange={(
                    e
                  ) => {
                    const copy =
                      [
                        ...guides,
                      ];

                    copy[
                      index
                    ].description =
                      e.target.value;

                    setGuides(
                      copy
                    );
                  }}
                />

                <label>
                  Money Per
                  Hour
                </label>

                <input
                  value={
                    guide.money_per_hour ||
                    ""
                  }
                  onChange={(
                    e
                  ) => {
                    const copy =
                      [
                        ...guides,
                      ];

                    copy[
                      index
                    ].money_per_hour =
                      e.target.value;

                    setGuides(
                      copy
                    );
                  }}
                />

                <label>
                  Team Cost
                </label>

                <input
                  value={
                    guide.team_cost ||
                    ""
                  }
                  onChange={(
                    e
                  ) => {
                    const copy =
                      [
                        ...guides,
                      ];

                    copy[
                      index
                    ].team_cost =
                      e.target.value;

                    setGuides(
                      copy
                    );
                  }}
                />

                <label>
                  Difficulty
                </label>

                <input
                  value={
                    guide.difficulty ||
                    ""
                  }
                  onChange={(
                    e
                  ) => {
                    const copy =
                      [
                        ...guides,
                      ];

                    copy[
                      index
                    ].difficulty =
                      e.target.value;

                    setGuides(
                      copy
                    );
                  }}
                />

                <label>
                  Credits
                </label>

                <input
                  value={
                    guide.credits ||
                    ""
                  }
                  onChange={(
                    e
                  ) => {
                    const copy =
                      [
                        ...guides,
                      ];

                    copy[
                      index
                    ].credits =
                      e.target.value;

                    setGuides(
                      copy
                    );
                  }}
                />

                <label>
                  Guide URL
                </label>

                <input
                  value={
                    guide.guide_url
                  }
                  onChange={(
                    e
                  ) => {
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
              </>
            )}

            <div
              style={{
                display:
                  "flex",
                gap: "10px",
                marginTop:
                  "15px",
              }}
            >

<label>
  Display Order
</label>

<input
  type="number"
  value={
    guide.display_order
  }
  onChange={(e) => {
    const copy = [
      ...guides,
    ];

    copy[
      index
    ].display_order =
      Number(
        e.target.value
      );

    setGuides(copy);
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
  </>
)}
    
    </div>
  );
}