import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Member {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  role: string;
  discord_id: string | null;
  join_date: string | null;
}

export default function ManageMembers() {
  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    const { data, error } =
      await supabase
        .from("profiles")
        .select("*")
        .order("role", {
          ascending: false,
        })
        .order("username");

    if (error) {
      console.error(error);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  async function updateNickname(
    id: string,
    nickname: string
  ) {
    const { error } =
      await supabase
        .from("profiles")
        .update({
          nickname,
        })
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadMembers();
  }

  async function updateRole(
    id: string,
    role: string
  ) {
    const { error } =
      await supabase
        .from("profiles")
        .update({
          role,
        })
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadMembers();
  }

  async function updateJoinDate(
    id: string,
    join_date: string
  ) {
    const { error } =
      await supabase
        .from("profiles")
        .update({
          join_date,
        })
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadMembers();
  }

  async function deleteMember(
    id: string
  ) {
    if (
      !window.confirm(
        "Delete this member?"
      )
    )
      return;

    const { error } =
      await supabase
        .from("profiles")
        .delete()
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadMembers();
  }

  if (loading) {
    return (
      <div className="page">
        <h1>
          Manage Members
        </h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>
        Manage Members
      </h1>

      <div className="admin-grid">
        {members.map(
          (member) => (
            <div
              key={member.id}
              className="admin-card"
            >
              <img
                src={
                  member.avatar_url ||
                  "https://cdn.discordapp.com/embed/avatars/0.png"
                }
                alt={
                  member.username
                }
                className="member-avatar"
              />

              <h3>
                {member.nickname ||
                  member.username}
              </h3>

              <p>
                <strong>
                  Discord:
                </strong>{" "}
                {
                  member.username
                }
              </p>

              <p>
                <strong>
                  Role:
                </strong>{" "}
                {member.role}
              </p>

              <input
                type="text"
                className="dex-search"
                defaultValue={
                  member.nickname ||
                  member.username
                }
                placeholder="Nickname"
                onBlur={(e) =>
                  updateNickname(
                    member.id,
                    e.target
                      .value
                  )
                }
              />

              <select
                className="dex-select"
                value={
                  member.role
                }
                onChange={(e) =>
                  updateRole(
                    member.id,
                    e.target
                      .value
                  )
                }
              >
                <option value="guest">
                  Guest
                </option>

                <option value="member">
                  Member
                </option>

                <option value="officer">
                  Officer
                </option>

                <option value="commander">
                  Commander
                </option>

                <option value="leader">
                  Leader
                </option>

                <option value="admin">
                  Admin
                </option>
              </select>

              <label>
                Join Date
              </label>

              <input
                type="date"
                value={
                  member.join_date ||
                  ""
                }
                onChange={(e) =>
                  updateJoinDate(
                    member.id,
                    e.target
                      .value
                  )
                }
              />

              <button
                className="delete-btn"
                onClick={() =>
                  deleteMember(
                    member.id
                  )
                }
              >
                Delete Member
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}