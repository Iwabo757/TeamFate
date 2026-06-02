import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ShinyCatch = {
  id: string;
  pokemon_id: number;
  owner: string;
  date_found: string;
};

type LeaderboardEntry = {
  trainer: string;
  count: number;
  shinies: ShinyCatch[];
};

export default function Leaderboard() {
  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState("all");

  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>([]);

  const [selectedPokemon, setSelectedPokemon] =
    useState<ShinyCatch | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  function getCutoff() {
    const now = new Date();

    switch (filter) {
      case "week":
        now.setDate(
          now.getDate() - 7
        );
        return now;

      case "month":
        now.setMonth(
          now.getMonth() - 1
        );
        return now;

      case "3months":
        now.setMonth(
          now.getMonth() - 3
        );
        return now;

      case "6months":
        now.setMonth(
          now.getMonth() - 6
        );
        return now;

      case "1year":
        now.setFullYear(
          now.getFullYear() - 1
        );
        return now;

      case "2years":
        now.setFullYear(
          now.getFullYear() - 2
        );
        return now;

      default:
        return null;
    }
  }

  async function loadLeaderboard() {
    setLoading(true);

    try {
      const { data: profiles } =
        await supabase
          .from("profiles")
          .select(
            "id,nickname,username"
          );

      const profileMap: Record<
        string,
        string
      > = {};

      profiles?.forEach(
        (profile: any) => {
          profileMap[
            profile.id
          ] =
            profile.nickname ||
            profile.username ||
            "Unknown";
        }
      );

      const { data: catches } =
        await supabase
          .from("shiny_catches")
          .select(`
            id,
            pokemon_id,
            profile_id,
            date_found
          `);

      if (!catches) return;

      const cutoff =
        getCutoff();

      const filtered =
        catches.filter(
          (catchData: any) => {
            if (!cutoff)
              return true;

            return (
              new Date(
                catchData.date_found
              ) >= cutoff
            );
          }
        );

      const groups: Record<
        string,
        LeaderboardEntry
      > = {};

      filtered.forEach(
        (catchData: any) => {
          const trainer =
            profileMap[
              catchData.profile_id
            ] || "Unknown";

          if (
            !groups[trainer]
          ) {
            groups[
              trainer
            ] = {
              trainer,
              count: 0,
              shinies: [],
            };
          }

          groups[
            trainer
          ].count++;

          groups[
            trainer
          ].shinies.push({
            id: catchData.id,
            pokemon_id:
              catchData.pokemon_id,
            owner: trainer,
            date_found:
              catchData.date_found,
          });
        }
      );

      const sorted =
        Object.values(groups)
          .sort(
            (a, b) =>
              b.count -
              a.count
          )
          .slice(0, 5);

      setLeaderboard(
        sorted
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        Loading Leaderboard...
      </div>
    );
  }

  const champion =
    leaderboard[0];

  return (
    <div className="leaderboard-page">
      <div className="dex-header">
        <h1>
          🏆 Shiny Leaderboard
        </h1>

        <p>
          Top shiny hunters
          ranked by selected
          period.
        </p>
      </div>

      <div className="leaderboard-filters">
        <button
          onClick={() =>
            setFilter(
              "week"
            )
          }
          className={
            filter === "week"
              ? "active"
              : ""
          }
        >
          Week
        </button>

        <button
          onClick={() =>
            setFilter(
              "month"
            )
          }
          className={
            filter === "month"
              ? "active"
              : ""
          }
        >
          Month
        </button>

        <button
          onClick={() =>
            setFilter(
              "3months"
            )
          }
          className={
            filter ===
            "3months"
              ? "active"
              : ""
          }
        >
          3 Months
        </button>

        <button
          onClick={() =>
            setFilter(
              "6months"
            )
          }
          className={
            filter ===
            "6months"
              ? "active"
              : ""
          }
        >
          6 Months
        </button>

        <button
          onClick={() =>
            setFilter(
              "1year"
            )
          }
          className={
            filter ===
            "1year"
              ? "active"
              : ""
          }
        >
          1 Year
        </button>

        <button
          onClick={() =>
            setFilter(
              "2years"
            )
          }
          className={
            filter ===
            "2years"
              ? "active"
              : ""
          }
        >
          2 Years
        </button>

        <button
          onClick={() =>
            setFilter(
              "all"
            )
          }
          className={
            filter === "all"
              ? "active"
              : ""
          }
        >
          All Time
        </button>
      </div>

      {champion && (
        <div className="champion-card">
          <h2>
            👑 Current
            Champion
          </h2>

          <div className="champion-name">
            {
              champion.trainer
            }
          </div>

          <div className="champion-count">
            {
              champion.count
            }{" "}
            Shinies
          </div>
        </div>
      )}

      {leaderboard.map(
        (
          entry,
          index
        ) => (
          <div
            key={
              entry.trainer
            }
            className="showcase-member"
          >
            <h2>
              #
              {index + 1}{" "}
              {
                entry.trainer
              }{" "}
              (
              {
                entry.count
              }
              )
            </h2>

            <div className="showcase-sprites">
              {entry.shinies.map(
                (
                  shiny
                ) => (
                  <div
                    key={
                      shiny.id
                    }
                    className="showcase-card"
                    onClick={() =>
                      setSelectedPokemon(
                        shiny
                      )
                    }
                  >
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`}
                      alt=""
                      className="showcase-sprite"
                    />
                  </div>
                )
              )}
            </div>
          </div>
        )
      )}

      {selectedPokemon && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedPokemon(
              null
            )
          }
        >
          <div
            className="pokemon-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close-btn"
              onClick={() =>
                setSelectedPokemon(
                  null
                )
              }
            >
              ×
            </button>

            <div className="modal-header">
              <h2>
                Pokémon #
                {
                  selectedPokemon.pokemon_id
                }
              </h2>

              <span className="status-badge">
                Shiny
              </span>
            </div>

            <div className="modal-body">
              <div className="modal-left">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${selectedPokemon.pokemon_id}.png`}
                  alt=""
                  className="modal-sprite"
                />
              </div>

              <div className="modal-right">
                <div className="detail-card">
                  <h3>
                    Trainer
                  </h3>

                  <p>
                    {
                      selectedPokemon.owner
                    }
                  </p>
                </div>

                <div className="detail-card">
                  <h3>
                    Date Found
                  </h3>

                  <p>
                    {
                      selectedPokemon.date_found
                    }
                  </p>
                </div>

                <div className="detail-card">
                  <h3>
                    National
                    Dex
                  </h3>

                  <p>
                    #
                    {
                      selectedPokemon.pokemon_id
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}