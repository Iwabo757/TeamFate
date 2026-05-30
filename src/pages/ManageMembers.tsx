import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Member {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  role: string;
  discord_id: string | null;
}

export default function ManageMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("role", { ascending: false })
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
    const { error } = await supabase
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
    const { error } = await supabase
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

async function deleteMember(id: string) {
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
        <h1>Manage Members</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Manage Members</h1>

      <div className="admin-grid">
        {members.map((member) => (
          <div
            key={member.id}
            className="admin-card"
          >
            {member.avatar_url && (
              <img
                src={member.avatar_url}
                alt={member.username}
                className="member-avatar"
              />
            )}

            <h3>
              {member.nickname ||
                member.username}
            </h3>

            <p>
              <strong>Discord:</strong>{" "}
              {member.username}
            </p>

            <p>
              <strong>Role:</strong>{" "}
              {member.role}
            </p>

            <input
              type="text"
              defaultValue={
                member.nickname ||
                member.username
              }
              placeholder="Nickname"
              onBlur={(e) =>
                updateNickname(
                  member.id,
                  e.target.value
                )
              }
            />

            <select
              value={member.role}
              onChange={(e) =>
                updateRole(
                  member.id,
                  e.target.value
                )
              }
            >
              <option value="member">
                Member
              </option>

              <option value="admin">
                Admin
              </option>
            </select>

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
        ))}
      </div>
    </div>
  );
}