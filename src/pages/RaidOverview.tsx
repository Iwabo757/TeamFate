import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

interface RaidSummary {
  name: string;
  ready: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  any: number;
}

export default function RaidOverview() {
  const [raids, setRaids] =
    useState<RaidSummary[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    const now =
      new Date().toISOString();

    const { data, error } =
      await supabase
        .from("member_raids")
        .select(`
          parts,
          tracking_enabled,
          weekly_cooldown_end,
          recapture_cooldown_end,
          raid_bosses (
            name
          )
        `)
        .eq(
          "tracking_enabled",
          true
        );

    if (error) {
      console.error(error);
      return;
    }

    const grouped: Record<
      string,
      RaidSummary
    > = {};

    (data || []).forEach(
      (row: any) => {
        const raidName =
          row.raid_bosses?.name;

        if (!raidName) return;

        if (
          !grouped[raidName]
        ) {
          grouped[raidName] = {
            name: raidName,
            ready: 0,
            p1: 0,
            p2: 0,
            p3: 0,
            p4: 0,
            any: 0,
          };
        }

        const weeklyReady =
          !row.weekly_cooldown_end ||
          row.weekly_cooldown_end <
            now;

        const recaptureReady =
          !row.recapture_cooldown_end ||
          row.recapture_cooldown_end <
            now;

        const isReady =
          weeklyReady &&
          recaptureReady &&
          row.parts?.length > 0;

        if (!isReady) return;

        grouped[
          raidName
        ].ready++;

        if (
          row.parts.includes(
            "P1"
          )
        ) {
          grouped[
            raidName
          ].p1++;
        }

        if (
          row.parts.includes(
            "P2"
          )
        ) {
          grouped[
            raidName
          ].p2++;
        }

        if (
          row.parts.includes(
            "P3"
          )
        ) {
          grouped[
            raidName
          ].p3++;
        }

        if (
          row.parts.includes(
            "P4"
          )
        ) {
          grouped[
            raidName
          ].p4++;
        }

        if (
          row.parts.includes(
            "Any"
          )
        ) {
          grouped[
            raidName
          ].any++;
        }
      }
    );

    setRaids(
      Object.values(grouped)
    );

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="page">
        <h1>
          Raid Overview
        </h1>

        <p>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>
        Raid Overview
      </h1>

<div
  className="admin-grid"
  style={{
    gridTemplateColumns:
      "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "15px",
  }}
>
        {raids.map((raid) => (
          <div
            key={raid.name}
            className="admin-card"
          >
<div
  style={{
    textAlign: "center",
    marginBottom: "10px",
  }}
>
  <img
    src={
      RAID_SPRITES[
        raid.name
      ]
    }
    alt={raid.name}
    style={{
      width: "90px",
      height: "90px",
      objectFit:
        "contain",
      marginBottom:
        "8px",
    }}
  />

  <h2>
    {raid.name}
  </h2>
</div>

<div
  style={{
    textAlign: "center",
    marginBottom:
      "10px",
  }}
>
  <span
    className="rank-badge"
  >
    Ready:
    {" "}
    {raid.ready}
  </span>
</div>

<div
  style={{
    marginTop: "10px",

    display: "grid",

    gridTemplateColumns:
      "repeat(2, 1fr)",

    gap: "6px",

    textAlign:
      "center",
  }}
>
            
<div>
  P1
  <br />
  {raid.p1}
</div>

<div>
  P2
  <br />
  {raid.p2}
</div>

<div>
  P3
  <br />
  {raid.p3}
</div>

<div>
  P4
  <br />
  {raid.p4}
</div>

<div
  style={{
    gridColumn:
      "span 2",
  }}
>
  Any
  <br />
  {raid.any}
</div>
            </div>

            <Link
              to={`/ready-raiders?raid=${raid.name}`}
            >
              <button
                className="save-btn"
                style={{
                  marginTop:
                    "15px",
                }}
              >
                View Raiders
              </button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}