import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import HomeTicker from "../components/HomeTicker";

type GameTime = {
  hours: number;
  minutes: number;
  seconds: number;
};

function getPokeMMOTime(): GameTime {
  const now = new Date();

  /*
   * PokeMMO uses a 24-hour in-game cycle
   * that completes every 6 real-world hours.
   *
   * 1 real second = 4 in-game seconds.
   */
  const gameDayMilliseconds =
    24 * 60 * 60 * 1000;

  const gameMilliseconds =
    (now.getTime() * 4) %
    gameDayMilliseconds;

  const hours = Math.floor(
    gameMilliseconds /
      (60 * 60 * 1000)
  );

  const minutes = Math.floor(
    (gameMilliseconds %
      (60 * 60 * 1000)) /
      (60 * 1000)
  );

  const seconds = Math.floor(
    (gameMilliseconds %
      (60 * 1000)) /
      1000
  );

  return {
    hours,
    minutes,
    seconds,
  };
}

export default function Home() {
  const [memberCount, setMemberCount] =
    useState(0);

  const [shinyCount, setShinyCount] =
    useState(0);

  const [gameTime, setGameTime] =
    useState<GameTime>(() =>
      getPokeMMOTime()
    );

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
  ========================================= */

  useEffect(() => {
    const updateGameTime = () => {
      setGameTime(
        getPokeMMOTime()
      );
    };

    updateGameTime();

    const timer =
      window.setInterval(
        updateGameTime,
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  /* =========================================
     LOAD STATS
  ========================================= */

  useEffect(() => {
    loadStats();

    const refreshTimer =
      window.setInterval(
        loadStats,
        30000
      );

    return () => {
      window.clearInterval(
        refreshTimer
      );
    };
  }, []);

  async function loadStats() {
    try {
      /* ===============================
         MEMBER COUNT
      ================================ */

      const {
        count: members,
        error: membersError,
      } = await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (membersError) {
        throw membersError;
      }

      setMemberCount(
        members ?? 0
      );

      /* ===============================
         SHINY COUNT
      ================================ */

      const {
        count: shinies,
        error: shiniesError,
      } = await supabase
        .from("shiny_catches")
        .select("*", {
          count: "exact",
          head: true,
        });

      if (shiniesError) {
        throw shiniesError;
      }

      setShinyCount(
        shinies ?? 0
      );

      /* ===============================
         TOP SHINY TRAINER
      ================================ */

      const {
        data: catches,
        error: catchesError,
      } = await supabase
        .from("shiny_catches")
        .select(`
          profile_id,
          profiles (
            nickname
          )
        `);

      if (catchesError) {
        throw catchesError;
      }

      const totals: Record<
        string,
        number
      > = {};

      catches?.forEach(
        (entry: any) => {
          const name =
            entry.profiles?.nickname ??
            "Unknown";

          totals[name] =
            (totals[name] ?? 0) +
            1;
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
      } else {
        setTopHunter({
          name: "None",
          count: 0,
        });
      }
    } catch (error) {
      console.error(
        "Failed to load home stats:",
        error
      );
    }
  }

  /* =========================================
     LOAD WELCOME MESSAGE
  ========================================= */

  useEffect(() => {
    loadWelcome();
  }, []);

  async function loadWelcome() {
    const {
      data,
      error,
    } = await supabase
      .from("homepage_message")
      .select("*")
      .single();

    if (error) {
      console.error(
        "Failed to load welcome message:",
        error
      );

      return;
    }

    if (data) {
      setWelcome({
        title:
          data.title ?? "",
        message:
          data.message ?? "",
      });
    }
  }

  /* =========================================
     FORMAT GAME TIME
  ========================================= */

  const formattedGameTime =
    `${String(
      gameTime.hours
    ).padStart(
      2,
      "0"
    )}:${String(
      gameTime.minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      gameTime.seconds
    ).padStart(
      2,
      "0"
    )}`;

  /* =========================================
     DETERMINE GAME PERIOD
  ========================================= */

  let gamePeriod:
    | "🌅 Morning"
    | "☀️ Day"
    | "🌙 Night" =
    "🌙 Night";

  if (
    gameTime.hours >= 4 &&
    gameTime.hours < 11
  ) {
    gamePeriod =
      "🌅 Morning";
  } else if (
    gameTime.hours >= 11 &&
    gameTime.hours < 21
  ) {
    gamePeriod =
      "☀️ Day";
  }

  /* =========================================
     HOME
  ========================================= */

  return (
    <div className="home-page">

      {/* ===============================
          WELCOME
      ================================ */}

      <div className="welcome-card">
        <h2>
          {welcome.title}
        </h2>

        <p>
          {welcome.message}
        </p>
      </div>

      {/* ===============================
          HOME TICKER
      ================================ */}

      <HomeTicker />

      {/* ===============================
          STATS
      ================================ */}

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

        {/* IN-GAME TIME */}

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