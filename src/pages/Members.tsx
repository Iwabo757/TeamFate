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
    const { data: profiles, error: profileError } =
      await supabase
        .from("profiles")
        .select("*")
        .order("nickname", { ascending: true });

    if (profileError) throw profileError;

    const { data: catches, error: catchesError } =
      await supabase
        .from("shiny_catches")
        .select("profile_id");

    if (catchesError) throw catchesError;

    const shinyCounts: Record<string, number> = {};

    catches?.forEach((entry: any) => {
      shinyCounts[entry.profile_id] =
        (shinyCounts[entry.profile_id] || 0) + 1;
    });

    const membersWithCounts =
      (profiles || []).map((profile: any) => ({
        ...profile,
        shiny_count:
          shinyCounts[profile.id] || 0,
      }));

    setMembers(membersWithCounts);
  } catch (error) {
    console.error(error);
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

const { data: catches } = await supabase
  .from("shiny_catches")
  .select("profile_id");

const shinyCounts: Record<string, number> = {};

catches?.forEach((catchEntry) => {
  shinyCounts[catchEntry.profile_id] =
    (shinyCounts[catchEntry.profile_id] || 0) + 1;
});
            <p>
              Shinies: {member.shiny_count: shinyCounts[profile.id] || 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}