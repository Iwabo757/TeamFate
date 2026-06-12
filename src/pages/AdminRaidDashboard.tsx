import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type RaidBoss = {
  id: number;
  name: string;
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

export default function AdminRaidDashboard() {
  const [raids, setRaids] =
    useState<RaidBoss[]>([]);

  const [members, setMembers] =
    useState<MemberRow[]>([]);

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

  return (
    <div className="page">
      <h1>
        Raid Dashboard
      </h1>

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
    </div>
  );
}