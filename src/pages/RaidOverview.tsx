import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
  const [raids, setRaids] = useState<
    RaidSummary[]
  >([]);

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
          cooldown_end,
          tracking_enabled,
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

        const isReady =
          (!row.cooldown_end ||
            row.cooldown_end <
              now) &&
          row.parts?.length > 0;

        if (!isReady) return;

        grouped[
          raidName
        ].ready++;

        if (
          row.parts.includes(
            "P1"
          )
        )
          grouped[
            raidName
          ].p1++;

        if (
          row.parts.includes(
            "P2"
          )
        )
          grouped[
            raidName
          ].p2++;

        if (
          row.parts.includes(
            "P3"
          )
        )
          grouped[
            raidName
          ].p3++;

        if (
          row.parts.includes(
            "P4"
          )
        )
          grouped[
            raidName
          ].p4++;

        if (
          row.parts.includes(
            "Any"
          )
        )
          grouped[
            raidName
          ].any++;
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
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>
        Raid Overview
      </h1>

      <div className="admin-grid">
        {raids.map((raid) => (
          <div
            key={raid.name}
            className="admin-card"
          >
            <h2>
              {raid.name}
            </h2>

            <h3>
              Ready:{" "}
              {raid.ready}
            </h3>

            <div
              style={{
                marginTop:
                  "15px",
                lineHeight: 1.8,
              }}
            >
              <div>
                P1: {raid.p1}
              </div>

              <div>
                P2: {raid.p2}
              </div>

              <div>
                P3: {raid.p3}
              </div>

              <div>
                P4: {raid.p4}
              </div>

              <div>
                Any:{" "}
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