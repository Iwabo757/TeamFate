import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Raider = {
  nickname: string;
  avatar_url: string | null;
  raid_name: string;
  parts: string[];
};

export default function ReadyRaiders() {
  const [raiders, setRaiders] =
    useState<Raider[]>([]);

  const [selectedRaid, setSelectedRaid] =
    useState("Heatran");

  useEffect(() => {
    loadRaiders();
  }, []);

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
          raid_name:
            row.raid_bosses
              ?.name,
          parts:
            row.parts || [],
        }));

    setRaiders(ready);
  }

  const filtered =
    raiders.filter(
      (r) =>
        r.raid_name ===
        selectedRaid
    );

  return (
    <div className="page">
      <h1>
        Ready Raiders
      </h1>

      <div
        style={{
          maxWidth: "300px",
          margin: "20px auto",
        }}
      >
        <select
          value={selectedRaid}
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

      <h2
        style={{
          textAlign: "center",
        }}
      >
        {selectedRaid}
        {" "}
        Ready (
        {filtered.length})
      </h2>

      <div className="admin-grid">
        {filtered.map(
          (raider, index) => (
            <div
              key={index}
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