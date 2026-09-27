import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Challenge = {
  id: string;
  title: string;
  description: string;
  reward: number;
  enabled: boolean;
};

type ScheduleRow = {
  challenge_date: string;
  challenge_id: string;
  challenge?: Challenge;
};

function localDate(offsetDays = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function FateDailyDashboard() {
  const [today, setToday] = useState<ScheduleRow | null>(null);
  const [upcoming, setUpcoming] = useState<ScheduleRow[]>([]);
  const [activeChallenges, setActiveChallenges] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const todayDate = localDate();
    const weekEnd = localDate(6);

    const [challengeResult, scheduleResult, pendingResult] = await Promise.all([
      supabase
        .from("fate_daily_challenges")
        .select("id, title, description, reward, enabled")
        .eq("enabled", true),
      supabase
        .from("fate_daily_schedule")
        .select("challenge_date, challenge_id")
        .gte("challenge_date", todayDate)
        .lte("challenge_date", weekEnd)
        .order("challenge_date", { ascending: true }),
      supabase
        .from("fate_daily_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    const firstError =
      challengeResult.error || scheduleResult.error || pendingResult.error;

    if (firstError) {
      setMessage(firstError.message);
    }

    const challenges = (challengeResult.data || []) as Challenge[];
    const scheduleRows = (scheduleResult.data || []) as ScheduleRow[];
    const challengeMap = new Map(challenges.map((challenge) => [challenge.id, challenge]));
    const mapped = scheduleRows.map((row) => ({
      ...row,
      challenge: challengeMap.get(row.challenge_id),
    }));

    setActiveChallenges(challenges.length);
    setPendingCount(pendingResult.count || 0);
    setUpcoming(mapped);
    setToday(mapped.find((row) => row.challenge_date === todayDate) || null);
    setLoading(false);
  }

  const daysScheduled = upcoming.length;
  const remainingDays = Math.max(0, 7 - daysScheduled);

  const statusText = useMemo(() => {
    if (loading) return "Loading...";
    if (today) return "Scheduled";
    return "Not scheduled";
  }, [loading, today]);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1>🔥 Faté Daily</h1>
          <p>Manage daily challenges, schedule assignments, and verify member proof.</p>
        </div>
        <button className="edit-btn" onClick={loadDashboard} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      {message && <div className="card" style={{ marginBottom: 18 }}>{message}</div>}

      <div className="admin-grid" style={{ marginBottom: 24 }}>
        <div className="admin-card" style={{ cursor: "default" }}>
          <div style={{ fontSize: 28 }}>🔥</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>Today's Daily</div>
          <strong style={{ fontSize: 21 }}>{today?.challenge?.title || "Not Scheduled"}</strong>
          <div style={{ marginTop: 6 }}>{statusText}</div>
        </div>

        <div className="admin-card" style={{ cursor: "default" }}>
          <div style={{ fontSize: 28 }}>📅</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>Next 7 Days</div>
          <strong style={{ fontSize: 28 }}>{daysScheduled}/7</strong>
          <div>{remainingDays ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} open` : "Fully scheduled"}</div>
        </div>

        <div className="admin-card" style={{ cursor: "default" }}>
          <div style={{ fontSize: 28 }}>📸</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>Pending Verification</div>
          <strong style={{ fontSize: 28 }}>{pendingCount}</strong>
          <div>{pendingCount === 1 ? "submission" : "submissions"} waiting</div>
        </div>

        <div className="admin-card" style={{ cursor: "default" }}>
          <div style={{ fontSize: 28 }}>🎯</div>
          <div style={{ fontSize: 14, opacity: 0.75 }}>Active Challenges</div>
          <strong style={{ fontSize: 28 }}>{activeChallenges}</strong>
          <div>available to schedule</div>
        </div>
      </div>

      <div className="admin-grid" style={{ marginBottom: 24 }}>
        <Link to="/admin/fate-daily/manager" className="admin-card">
          🔥 Faté Daily Manager
          <span style={{ display: "block", fontSize: 14, opacity: 0.7, marginTop: 6 }}>
            Create challenges and assign them to dates.
          </span>
        </Link>

        <Link to="/admin/fate-daily/verification" className="admin-card">
          📸 Faté Daily Verification
          <span style={{ display: "block", fontSize: 14, opacity: 0.7, marginTop: 6 }}>
            Review screenshots and approve or reject submissions.
          </span>
        </Link>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>📅 Upcoming Faté Daily Schedule</h2>
            <p style={{ marginTop: 0 }}>This is the same schedule members will see.</p>
          </div>
          <Link to="/admin/fate-daily/manager" className="edit-btn">Manage Schedule</Link>
        </div>

        {loading ? (
          <p>Loading schedule...</p>
        ) : upcoming.length === 0 ? (
          <p>No Faté Daily assignments are scheduled for the next 7 days.</p>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {upcoming.map((row) => (
              <div
                key={row.challenge_date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(5,15,40,0.45)",
                }}
              >
                <div>
                  <strong>{formatDate(row.challenge_date)}</strong>
                  <div style={{ marginTop: 4 }}>
                    {row.challenge?.title || "Unknown Challenge"}
                  </div>
                </div>
                <div style={{ opacity: 0.85 }}>
                  {row.challenge ? `${row.challenge.reward} Faté Points` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
