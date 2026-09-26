import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { awardPoints, getDailyChallenge } from "../lib/fateProgression";

export default function FateDaily() {
  const [userId, setUserId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const challenge = getDailyChallenge();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.from("fate_daily_completions").select("id, streak").eq("profile_id", user.id).eq("challenge_date", challenge.date).maybeSingle();
    if (data) { setDone(true); setStreak(Number(data.streak || 0)); }
  }

  async function complete() {
    if (!userId || done) return;
    const yesterday = new Date(`${challenge.date}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const { data: previous } = await supabase.from("fate_daily_completions").select("streak").eq("profile_id", userId).eq("challenge_date", yesterdayKey).maybeSingle();
    const nextStreak = Number(previous?.streak || 0) + 1;
    const { error } = await supabase.from("fate_daily_completions").insert({ profile_id: userId, challenge_date: challenge.date, challenge_key: challenge.key, reward: challenge.reward, streak: nextStreak });
    if (error) { alert(error.message); return; }
    const result = await awardPoints(userId, challenge.reward, `Faté Daily: ${challenge.title}`, `daily:${userId}:${challenge.date}`);
    if (result.error) { alert(result.error.message); return; }
    setDone(true); setStreak(nextStreak);
  }

  return <div className="page">
    <h1>🔥 Faté Daily</h1>
    <div className="card" style={{ maxWidth: 700 }}>
      <h2>{challenge.title}</h2>
      <p>{challenge.description}</p>
      <p style={{ fontSize: 20 }}>⭐ Reward: <strong>{challenge.reward} Faté Points</strong></p>
      <p>🔥 Current streak: <strong>{streak} day{streak === 1 ? "" : "s"}</strong></p>
      {!userId ? <p>Log in to complete today's challenge.</p> : <button className="edit-btn" disabled={done} onClick={complete}>{done ? "✓ Completed Today" : "Complete Daily"}</button>}
    </div>
  </div>;
}
