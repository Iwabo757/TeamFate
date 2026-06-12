import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type RaidBoss = {
  id: number;
  name: string;
};

type MemberRaid = {
  id: number;
  raid_id: number;
  parts: string[];
  cooldown_end: string | null;
  tracking_enabled: boolean;
};

const PARTS = [
  "P1",
  "P2",
  "P3",
  "P4",
  "Any",
  "N/A",
];

export default function RaidTracker() {
  const [raids, setRaids] =
    useState<RaidBoss[]>([]);

  const [memberRaids, setMemberRaids] =
    useState<MemberRaid[]>([]);


  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;


    const { data: raidData } =
      await supabase
        .from("raid_bosses")
        .select("*")
        .order("id");

    setRaids(raidData || []);

    const { data: memberData } =
      await supabase
        .from("member_raids")
        .select("*")
        .eq("profile_id", user.id);

    setMemberRaids(memberData || []);
  }

  async function toggleTracking(
    row: MemberRaid
  ) {
    await supabase
      .from("member_raids")
      .update({
        tracking_enabled:
          !row.tracking_enabled,
      })
      .eq("id", row.id);

    loadData();
  }

  async function updateParts(
    row: MemberRaid,
    part: string
  ) {
    let newParts =
      row.parts || [];

    if (
      newParts.includes(part)
    ) {
      newParts =
        newParts.filter(
          (p) => p !== part
        );
    } else {
      newParts = [
        ...newParts,
        part,
      ];
    }

    await supabase
      .from("member_raids")
      .update({
        parts: newParts,
      })
      .eq("id", row.id);

    loadData();
  }

  async function startCooldown(
    row: MemberRaid
  ) {
    const cooldownEnd =
      new Date(
        Date.now() +
          6 *
            60 *
            60 *
            1000
      );

    await supabase
      .from("member_raids")
      .update({
        cooldown_end:
          cooldownEnd.toISOString(),
      })
      .eq("id", row.id);

    loadData();
  }

  function getStatus(
    row: MemberRaid
  ) {
    if (
      !row.tracking_enabled
    ) {
      return "Opted Out";
    }

    if (
      row.cooldown_end &&
      new Date(
        row.cooldown_end
      ) > new Date()
    ) {
      const diff =
        new Date(
          row.cooldown_end
        ).getTime() -
        Date.now();

      const hours =
        Math.floor(
          diff /
            (1000 * 60 * 60)
        );

      const minutes =
        Math.floor(
          (diff %
            (1000 *
              60 *
              60)) /
            (1000 * 60)
        );

      return `${hours}h ${minutes}m`;
    }

    if (
      row.parts.length === 0
    ) {
      return "Not Ready";
    }

    return "Ready";
  }

  return (
    <div className="page">
      <h1>
        Raid Tracker
      </h1>

      <div className="admin-grid">
        {raids.map((raid) => {
          const row =
            memberRaids.find(
              (r) =>
                r.raid_id ===
                raid.id
            );

          if (!row)
            return null;

          return (
            <div
              key={raid.id}
              className="admin-card"
            >
              <h2>
                {raid.name}
              </h2>

              <p>
                Status:
                {" "}
                <strong>
                  {getStatus(
                    row
                  )}
                </strong>
              </p>

              <button
                onClick={() =>
                  toggleTracking(
                    row
                  )
                }
              >
                {row.tracking_enabled
                  ? "Opt Out"
                  : "Opt In"}
              </button>

              <hr />

              <h4>
                Parts
              </h4>

              {PARTS.map(
                (part) => (
                  <label
                    key={part}
                    style={{
                      display:
                        "block",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        row.parts?.includes(
                          part
                        ) ||
                        false
                      }
                      onChange={() =>
                        updateParts(
                          row,
                          part
                        )
                      }
                    />

                    {" "}
                    {part}
                  </label>
                )
              )}

              <br />

              <button
                className="save-btn"
                onClick={() =>
                  startCooldown(
                    row
                  )
                }
              >
                Start 6 Hour Cooldown
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}