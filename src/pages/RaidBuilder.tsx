import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Raider = {
  nickname: string;
  avatar_url: string | null;
  parts: string[];
};

const RAID_SPRITES: Record<string, string> = {
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

export default function RaidBuilder() {
  const [selectedRaid, setSelectedRaid] =
    useState("Heatran");

  const [raiders, setRaiders] =
    useState<Raider[]>([]);

  const [team, setTeam] =
    useState<Record<
      string,
      Raider | undefined
    >>({});

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
          tracking_enabled,
          weekly_cooldown_end,
          recapture_cooldown_end,
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
        .filter((row: any) => {
          const weeklyReady =
            !row.weekly_cooldown_end ||
            row.weekly_cooldown_end <
              now;

          const recaptureReady =
            !row.recapture_cooldown_end ||
            row.recapture_cooldown_end <
              now;

          return (
            row.raid_bosses?.name ===
              selectedRaid &&
            weeklyReady &&
            recaptureReady &&
            row.parts?.length > 0
          );
        })
        .map((row: any) => ({
          nickname:
            row.profiles
              ?.nickname ||
            "Unknown",
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

    const result: Record<
      string,
      Raider | undefined
    > = {};

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
          textAlign: "center",
          marginBottom:
            "20px",
        }}
      >
        <img
          src={
            RAID_SPRITES[
              selectedRaid
            ]
          }
          alt=""
          style={{
            width: "90px",
            height: "90px",
            objectFit:
              "contain",
          }}
        />

        <div
          style={{
            maxWidth:
              "250px",
            margin:
              "10px auto",
          }}
        >
          <select
            value={
              selectedRaid
            }
            onChange={(
              e
            ) =>
              setSelectedRaid(
                e.target
                  .value
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
      </div>

      <h2>
        Suggested Team
      </h2>

      <div
        className="admin-grid"
        style={{
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: "15px",
        }}
      >
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

            {team[
              slot
            ] ? (
              <>
                {team[
                  slot
                ]
                  ?.avatar_url && (
                  <img
                    src={
                      team[
                        slot
                      ]
                        ?.avatar_url ||
                      ""
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
                      ?.nickname
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

      <h2
        style={{
          marginTop:
            "40px",
        }}
      >
        Available Raiders (
        {raiders.length})
      </h2>

      <div
        className="admin-grid"
        style={{
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "15px",
        }}
      >
        {raiders.map(
          (raider) => (
            <div
              key={
                raider.nickname
              }
              className="admin-card"
            >
              {raider.avatar_url && (
                <img
                  src={
                    raider.avatar_url
                  }
                  className="admin-avatar"
                  alt=""
                />
              )}

              <h3>
                {
                  raider.nickname
                }
              </h3>

              <p>
                Parts:
              </p>

              <div>
                {raider.parts.join(
                  ", "
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}