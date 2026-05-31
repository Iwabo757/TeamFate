import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Member = {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  role: string;
  shiny_count: number;
};

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("nickname", { ascending: true });

      if (error) throw error;

      setMembers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <h2>Loading members...</h2>;
  }

  return (
    <div className="members-page">
      <h1>👥 Team Fate Members</h1>

      <p>Current Members: {members.length}</p>

      <div className="members-grid">
        {members.map((member) => (
          <div
            key={member.id}
            className="member-card"
          >
            <img
              src={
                member.avatar_url ||
                "https://cdn.discordapp.com/embed/avatars/0.png"
              }
              alt={member.username}
              className="member-avatar"
            />

            <h3>
              {member.nickname ||
                member.username}
            </h3>

            <p>
              Role: {member.role || "member"}
            </p>

            <p>
              Shinies: {member.shiny_count ?? 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}