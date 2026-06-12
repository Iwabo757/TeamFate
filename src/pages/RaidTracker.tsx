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
  tracking_enabled: boolean;
  weekly_cooldown_end: string | null;
  recapture_cooldown_end: string | null;
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

  const [loading, setLoading] =
    useState(true);

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

    const { data: memberData } =
      await supabase
        .from("member_raids")
        .select("*")
        .eq("profile_id", user.id);

    setRaids(raidData || []);
    setMemberRaids(
      memberData || []
    );

    setLoading(false);
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

  async function startWeeklyCooldown(
    row: MemberRaid
  ) {
    const end =
      new Date(
        Date.now() +
          7 *
            24 *
            60 *
            60 *
            1000
      );

    await supabase
      .from("member_raids")
      .update({
        weekly_cooldown_end:
          end.toISOString(),
      })
      .eq("id", row.id);

    loadData();
  }

  async function startRecaptureCooldown(
    row: MemberRaid
  ) {
    const end =
      new Date(
        Date.now() +
          90 *
            24 *
            60 *
            60 *
            1000
      );

    await supabase
      .from("member_raids")
      .update({
        recapture_cooldown_end:
          end.toISOString(),
      })
      .eq("id", row.id);

    loadData();
  }

  function getCountdown(
    date: string | null
  ) {
    if (!date)
      return "Ready";

    const diff =
      new Date(date).getTime() -
      Date.now();

    if (diff <= 0)
      return "Ready";

    const days =
      Math.floor(
        diff /
          (1000 *
            60 *
            60 *
            24)
      );

    const hours =
      Math.floor(
        (diff %
          (1000 *
            60 *
            60 *
            24)) /
          (1000 *
            60 *
            60)
      );

    return `${days}d ${hours}h`;
  }

  function getStatus(
    row: MemberRaid
  ) {
    const weeklyReady =
      !row.weekly_cooldown_end ||
      new Date(
        row.weekly_cooldown_end
      ) < new Date();

    const recaptureReady =
      !row.recapture_cooldown_end ||
      new Date(
        row.recapture_cooldown_end
      ) < new Date();

    if (
      !row.tracking_enabled
    ) {
      return "Opted Out";
    }

    if (
      row.parts.length === 0
    ) {
      return "Not Ready";
    }

    if (
      weeklyReady &&
      recaptureReady
    ) {
      return "Ready";
    }

    return "Cooldown";
  }

  if (loading) {
    return (
      <div className="page">
        <h1>
          Raid Tracker
        </h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>
        My Raid Status
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

              <hr />

              <p>
                Weekly:
                {" "}
                <strong>
                  {getCountdown(
                    row.weekly_cooldown_end
                  )}
                </strong>
              </p>

              <button
                className="save-btn"
                onClick={() =>
                  startWeeklyCooldown(
                    row
                  )
                }
              >
                Start 7 Day Cooldown
              </button>

              <br />
              <br />

              <p>
                Recapture:
                {" "}
                <strong>
                  {getCountdown(
                    row.recapture_cooldown_end
                  )}
                </strong>
              </p>

              <button
                className="save-btn"
                onClick={() =>
                  startRecaptureCooldown(
                    row
                  )
                }
              >
                Start 90 Day Cooldown
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}