import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Raider = {
  nickname: string;
  avatar_url: string | null;
  raid_name: string;
  parts: string[];
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

export default function ReadyRaiders() {
  const [raiders, setRaiders] =
    useState<Raider[]>([]);

  const [selectedRaid, setSelectedRaid] =
    useState("Heatran");

const [search, setSearch] =
  useState("");

const [partFilter, setPartFilter] =
  useState("All");
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
        .filter(
          (row: any) => {
            const weeklyReady =
              !row.weekly_cooldown_end ||
              row.weekly_cooldown_end <
                now;

            const recaptureReady =
              !row.recapture_cooldown_end ||
              row.recapture_cooldown_end <
                now;

            return (
              weeklyReady &&
              recaptureReady &&
              row.parts?.length > 0
            );
          }
        )
        .map((row: any) => ({
          nickname:
            row.profiles?.nickname,
          avatar_url:
            row.profiles?.avatar_url,
          raid_name:
            row.raid_bosses?.name,
          parts:
            row.parts || [],
        }));

    setRaiders(ready);
  }

const filtered =
  raiders
    .filter(
      (r) =>
        r.raid_name ===
        selectedRaid
    )
    .filter((r) =>
      r.nickname
        ?.toLowerCase()
        .includes(
          search.toLowerCase()
        )
    )
    .filter((r) =>
      partFilter === "All"
        ? true
        : r.parts.includes(
            partFilter
          )
    )
    .sort((a, b) =>
      a.nickname.localeCompare(
        b.nickname
      )
    );

  return (
    <div className="page">
      <h1>
        Ready Raiders
      </h1>

<div
  style={{
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
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
    <option>Heatran</option>
    <option>Cresselia</option>
    <option>Meloetta</option>
    <option>Virizion</option>
    <option>Terrakion</option>
    <option>Cobalion</option>
  </select>

  <input
    type="text"
    className="dex-search"
    placeholder="Search member..."
    value={search}
    onChange={(e) =>
      setSearch(
        e.target.value
      )
    }
    style={{
      maxWidth: "250px",
    }}
  />

  <select
    value={partFilter}
    onChange={(e) =>
      setPartFilter(
        e.target.value
      )
    }
  >
    <option>All</option>
    <option>P1</option>
    <option>P2</option>
    <option>P3</option>
    <option>P4</option>
    <option>Any</option>
  </select>
</div>

<div
  style={{
    textAlign: "center",
    marginBottom: "20px",
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
      width: "70px",
      height: "70px",
      objectFit: "contain",
    }}
  />

  <h2
    style={{
      marginTop: "5px",
    }}
  >
    {selectedRaid} Ready (
    {filtered.length})
  </h2>
</div>

<div
  className="admin-grid"
  style={{
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
  }}
>
        {filtered.map(
          (
            raider,
            index
          ) => (
            <div
              key={index}
className="admin-card"
style={{
  padding: "12px",
}}
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

<h3
  style={{
    margin: "8px 0",
  }}
>
  {raider.nickname}
</h3>

              <p>
                Parts:
              </p>

<div
  style={{
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    justifyContent:
      "center",
  }}
>
  {raider.parts.map(
    (part) => (
      <span
        key={part}
        className="rank-badge"
      >
        {part}
      </span>
    )
  )}
</div>
            </div>
          )
        )}
      </div>
    </div>
  );
}