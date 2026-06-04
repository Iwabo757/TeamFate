import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Member = {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  role: string;
  shiny_count: number;
  join_date?: string | null;
};

export default function Members() {
  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [view, setView] =
    useState<"cards" | "list">("cards");

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const {
        data: profiles,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .order("nickname", {
          ascending: true,
        });

      if (profileError)
        throw profileError;

      const {
        data: catches,
        error: catchesError,
      } = await supabase
        .from("shiny_catches")
        .select("profile_id");

      if (catchesError)
        throw catchesError;

      const shinyCounts: Record<
        string,
        number
      > = {};

      catches?.forEach(
        (entry: any) => {
          shinyCounts[
            entry.profile_id
          ] =
            (shinyCounts[
              entry.profile_id
            ] || 0) + 1;
        }
      );

      const membersWithCounts =
        (profiles || []).map(
          (profile: any) => ({
            id: profile.id,
            username:
              profile.username,
            nickname:
              profile.nickname,
            avatar_url:
              profile.avatar_url,
            role:
              profile.role,
            join_date:
              profile.join_date,
            shiny_count:
              shinyCounts[
                profile.id
              ] || 0,
          })
        );

      setMembers(
        membersWithCounts
      );
    } catch (error) {
      console.error(
        "Failed to load members:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="members-page">
        <h2>
          Loading members...
        </h2>
      </div>
    );
  }

  return (
    <div className="members-page">
      <h1>
        👥 Team Fate Members
      </h1>

      <p>
        Current Members:{" "}
        {members.length}
      </p>

      <div className="leaderboard-filters">
        <button
          className={`leader-filter ${
            view === "cards"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setView("cards")
          }
        >
          Member Cards
        </button>

        <button
          className={`leader-filter ${
            view === "list"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setView("list")
          }
        >
          Member List
        </button>
      </div>

      {view === "cards" ? (
        <div className="members-grid">
          {members.map(
            (member) => (
              <div
                key={member.id}
                className="member-card"
              >
                <img
                  src={
                    member.avatar_url ||
                    "https://cdn.discordapp.com/embed/avatars/0.png"
                  }
                  alt={
                    member.nickname ||
                    member.username
                  }
                  className="member-avatar"
                />

                <h3>
                  {member.nickname ||
                    member.username}
                </h3>

                <p>
                  Role:{" "}
                  {member.role ||
                    "member"}
                </p>

                <p>
                  Shinies:{" "}
                  {
                    member.shiny_count
                  }
                </p>

                <p>
                  Joined:{" "}
                  {member.join_date ||
                    "-"}
                </p>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="card">
          <table className="member-table">
            <thead>
              <tr>
                <th>
                  Nickname
                </th>
                <th>
                  Discord
                </th>
                <th>
                  Join Date
                </th>
                <th>
                  Role
                </th>
              </tr>
            </thead>

            <tbody>
              {members.map(
                (member) => (
                  <tr
                    key={
                      member.id
                    }
                  >
                    <td>
                      {member.nickname ||
                        member.username}
                    </td>

                    <td>
                      {
                        member.username
                      }
                    </td>

                    <td>
                      {member.join_date ||
                        "-"}
                    </td>

                    <td>
                      {
                        member.role
                      }
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}