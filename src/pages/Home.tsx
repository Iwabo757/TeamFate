import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import HomeTicker from "../components/HomeTicker";

export default function Home() {
  const [memberCount, setMemberCount] =
    useState(0);

  const [shinyCount, setShinyCount] =
    useState(0);

  const [gameTime, setGameTime] =
    useState(new Date());

  const [topHunter, setTopHunter] =
    useState({
      name: "None",
      count: 0,
    });

  const [welcome, setWelcome] =
    useState({
      title: "",
      message: "",
    });

  /* =========================================
     LIVE POKEMMO TIME

     PokeMMO's day/night cycle is synchronized
     with real-world UTC time.
  ========================================= */

  useEffect(() => {
    const updateGameTime = () => {
      setGameTime(new Date());
    };

    updateGameTime();

    const timer = setInterval(
      updateGameTime,
      1000
    );

    return () =>
      clearInterval(timer);
  }, []);

  /* =========================================
     LOAD STATS
  ========================================= */

  useEffect(() => {
    loadStats();

    const refreshTimer =
      setInterval(() => {
        loadStats();
      }, 30000);

    return () =>
      clearInterval(refreshTimer);
  }, []);

  /* =========================================
     LOAD WELCOME MESSAGE
  ========================================= */

  useEffect(() => {
    loadWelcome();
  }, []);

  async function loadWelcome() {
    const { data } = await supabase
      .from("homepage_message")
      .select("*")
      .single();

    if (data) {
      setWelcome(data);
    }
  }

  async function loadStats() {
    try {
      const { count: members } =
        await supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          });

      setMemberCount(
        members || 0
      );

      const { count: shinies } =
        await supabase
          .from("shiny_catches")
          .select("*", {
            count: "exact",
            head: true,
          });

      setShinyCount(
        shinies || 0
      );

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

      catches?.forEach(
        (entry: any) => {
          const name =
            entry.profiles?.nickname ||
            "Unknown";

          totals[name] =
            (totals[name] || 0) + 1;
        }
      );

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

  /* =========================================
     FORMAT GAME TIME
  ========================================= */

  const formattedGameTime =
    gameTime.toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }
    );

  const gameHour =
    Number(
      gameTime.toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          hourCycle: "h23",
          timeZone: "UTC",
        }
      )
    );

  const gamePeriod =
    gameHour >= 6 &&
    gameHour < 18
      ? "☀️ Day"
      : "🌙 Night";

  return (
    <div className="home-page">

      <div className="welcome-card">
        <h2>
          {welcome.title}
        </h2>

        <p>
          {welcome.message}
        </p>
      </div>

      <HomeTicker />

      <div className="stats">

        {/* MEMBERS */}

        <div className="card">
          <h2>
            Members
          </h2>

          <span>
            {memberCount}
          </span>
        </div>

        {/* GAME TIME */}

        <div className="card game-time-card">
          <h2>
            In-Game Time
          </h2>

          <span className="game-time">
            {formattedGameTime}
          </span>

          <div className="game-period">
            {gamePeriod}
          </div>
        </div>

        {/* TEAM SHINIES */}

        <div className="card">
          <h2>
            Team Shinies
          </h2>

          <span>
            {shinyCount}
          </span>
        </div>

        {/* TOP SHINY TRAINER */}

        <div className="card">
          <h2>
            Top Shiny Trainer
          </h2>

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