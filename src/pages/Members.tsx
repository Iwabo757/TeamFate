import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Member = {
  id: string;
  username: string;
  avatar_url: string;
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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("username");

    if (error) {
      console.error(error);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  if (loading) {
    return <h2>Loading members...</h2>;
  }

  return (
    <div>
      <h1>👥 Team Fate Members</h1>

      <p>
        Current Members: {members.length}
      </p>

      <div className="members-grid">
        {members.map((member) => (
          <div
            key={member.id}
            className="member-card"
          >
            <img
              src={member.avatar_url}
              alt={member.username}
              className="member-avatar"
            />

            <h3>{member.username}</h3>

            <p>
              Role: {member.role || "member"}
            </p>

            <p>
              Shinies: {member.shiny_count || 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}