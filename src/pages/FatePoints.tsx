import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function FatePoints() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("id, username, nickname, avatar_url");
    const { data: tx } = await supabase.from("fate_point_transactions").select("profile_id, amount");
    const totals = new Map<string, number>();
    (tx || []).forEach((item) => totals.set(item.profile_id, (totals.get(item.profile_id) || 0) + Number(item.amount || 0)));
    setRows((profiles || []).map((p) => ({ ...p, points: totals.get(p.id) || 0 })).sort((a, b) => b.points - a.points));
    setLoading(false);
  }

  return <div className="page">
    <h1>⭐ Faté Points</h1>
    <p>Earn points through events, achievements, and Faté Daily challenges.</p>
    {loading ? <div className="card">Loading leaderboard...</div> : (
      <div className="event-grid">
        {rows.map((row, index) => <div className="card" key={row.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <strong style={{ fontSize: 24, minWidth: 40 }}>#{index + 1}</strong>
          <img src={row.avatar_url || "/icon-192.png"} alt="" style={{ width: 52, height: 52, borderRadius: "50%" }} />
          <div style={{ flex: 1 }}><h3>{row.nickname || row.username}</h3><strong>⭐ {row.points.toLocaleString()} Faté Points</strong></div>
        </div>)}
      </div>
    )}
  </div>;
}
