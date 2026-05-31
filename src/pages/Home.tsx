import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import RecentFinds from "../components/RecentFinds";
import UpcomingEvents from "../components/UpcomingEvents";

export default function Home() {
  const [memberCount, setMemberCount] = useState(0);
  const [shinyCount, setShinyCount] = useState(0);

  const [topHunter, setTopHunter] = useState({
    name: "None",
    count: 0,
  });

const [index, setIndex] = useState(0);

useEffect(() => {
  loadStats();

  const rotateTimer = setInterval(() => {
    setIndex((prev) => (prev + 1) % 2);
  }, 10000);

  const refreshTimer = setInterval(() => {
    loadStats();
  }, 30000);

  return () => {
    clearInterval(rotateTimer);
    clearInterval(refreshTimer);
  };
}, []);



  async function loadStats() {
    try {
      const { count: members } =
        await supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          });

      setMemberCount(members || 0);

      const { count: shinies } =
        await supabase
          .from("shiny_catches")
          .select("*", {
            count: "exact",
            head: true,
          });

      setShinyCount(shinies || 0);

      const { data: catches } =
        await supabase
          .from("shiny_catches")
          .select(`
            profile_id,
            profiles (
              nickname
            )
          `);

      const totals: Record<
        string,
        number
      > = {};

      catches?.forEach((entry: any) => {
        const name =
          entry.profiles?.nickname ||
          "Unknown";

        totals[name] =
          (totals[name] || 0) + 1;
      });

      const leader =
        Object.entries(totals)
          .sort(
            (a, b) =>
              b[1] - a[1]
          )[0];

      if (leader) {
        setTopHunter({
          name: leader[0],
          count: leader[1],
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="home-page">
      <div className="hero">
        <h1>TEAM FATE</h1>

        <p>
          The ultimate PokeMMO shiny
          hunting community.
        </p>
      </div>

<div className="homepage-rotator">
  {index === 0 ? (
    <RecentFinds />
  ) : (
    <UpcomingEvents />
  )}
</div>

      <div className="stats">
        <div className="card">
          <h2>Members</h2>
          <span>{memberCount}</span>
        </div>

<div className="card">
  <h2>Team Shinies</h2>
  <span>{shinyCount}</span>
</div>

<div className="card">
  <h2>Top Shiny Trainer</h2>

  <div className="leader-name">
    {topHunter.name}
  </div>

  <div className="leader-count">
    {topHunter.count} Shinies
  </div>
</div>
      </div>
    </div>
  );
}