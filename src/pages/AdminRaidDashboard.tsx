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
      cooldown_end: string | null;
      tracking_enabled: boolean;
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
          *,
          profiles (
            nickname
          ),
          raid_bosses (
            name
          )
        `);

    const grouped:
      Record<
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
            row.parts ||
            [],
          cooldown_end:
            row.cooldown_end,
          tracking_enabled:
            row.tracking_enabled,
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
    if (
      !raid?.tracking_enabled
    ) {
      return {
        text: "Opted Out",
        color: "#888",
      };
    }

    if (
      raid.cooldown_end &&
      new Date(
        raid.cooldown_end
      ) > new Date()
    ) {
      return {
        text: "Cooldown",
        color: "#0b8f4d",
      };
    }

    if (
      raid.parts
        ?.length === 0
    ) {
      return {
        text:
          "Not Ready",
        color: "#666",
      };
    }

    return {
      text: "Ready",
      color: "#d9b75d",
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
                                "20px",
                              padding:
                                "5px 10px",
                              color:
                                "#fff",
                            }}
                          >
                            {info?.parts?.join(
                              ", "
                            ) ||
                              "N/A"}

                            <br />

                            {
                              status.text
                            }
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