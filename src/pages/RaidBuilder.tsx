import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Raider = {
  nickname: string;
  avatar_url: string | null;
  parts: string[];
};

export default function RaidBuilder() {
  const [selectedRaid, setSelectedRaid] =
    useState("Heatran");

  const [, setRaiders] =
    useState<Raider[]>([]);

  const [team, setTeam] =
    useState<any>(null);

  useEffect(() => {
    loadRaiders();
  }, [selectedRaid]);

  async function loadRaiders() {
    const now =
      new Date().toISOString();

    const { data } =
      await supabase
        .from("member_raids")
        .select(`
          parts,
          cooldown_end,
          tracking_enabled,
          profiles (
            nickname,
            avatar_url
          ),
          raid_bosses (
            name
          )
        `)
        .eq(
          "tracking_enabled",
          true
        );

    const ready =
      (data || [])
        .filter(
          (row: any) =>
            row.raid_bosses?.name ===
              selectedRaid &&
            (!row.cooldown_end ||
              row.cooldown_end <
                now) &&
            row.parts?.length > 0
        )
        .map((row: any) => ({
          nickname:
            row.profiles
              ?.nickname,
          avatar_url:
            row.profiles
              ?.avatar_url,
          parts:
            row.parts || [],
        }));

    setRaiders(ready);

    buildTeam(ready);
  }

  function buildTeam(
    ready: Raider[]
  ) {
    const slots = [
      "P1",
      "P2",
      "P3",
      "P4",
    ];

    const result: any = {};

    const used =
      new Set<string>();

    for (const slot of slots) {
      const exact =
        ready.find(
          (r) =>
            !used.has(
              r.nickname
            ) &&
            r.parts.includes(
              slot
            )
        );

      if (exact) {
        result[slot] =
          exact;
        used.add(
          exact.nickname
        );
        continue;
      }

      const any =
        ready.find(
          (r) =>
            !used.has(
              r.nickname
            ) &&
            r.parts.includes(
              "Any"
            )
        );

      if (any) {
        result[slot] =
          any;
        used.add(
          any.nickname
        );
      }
    }

    setTeam(result);
  }

  return (
    <div className="page">
      <h1>
        Raid Builder
      </h1>

      <div
        style={{
          maxWidth:
            "300px",
          margin:
            "20px auto",
        }}
      >
        <select
          value={
            selectedRaid
          }
          onChange={(e) =>
            setSelectedRaid(
              e.target.value
            )
          }
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
      </div>

      <div className="admin-grid">
        {[
          "P1",
          "P2",
          "P3",
          "P4",
        ].map((slot) => (
          <div
            key={slot}
            className="admin-card"
          >
            <h2>
              {slot}
            </h2>

            {team?.[
              slot
            ] ? (
              <>
                {team[
                  slot
                ]
                  .avatar_url && (
                  <img
                    src={
                      team[
                        slot
                      ]
                        .avatar_url
                    }
                    className="admin-avatar"
                    alt=""
                  />
                )}

                <h3>
                  {
                    team[
                      slot
                    ]
                      .nickname
                  }
                </h3>
              </>
            ) : (
              <p>
                Missing
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}