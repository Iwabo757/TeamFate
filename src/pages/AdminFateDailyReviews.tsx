import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Submission = {
  id: string;
  profile_id: string;
  challenge_id: string;
  challenge_date: string;
  screenshot_url: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Profile = { id: string; username?: string; nickname?: string };
type Challenge = { id: string; title: string; reward: number };

export default function AdminFateDailyReviews() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [challenges, setChallenges] = useState<Record<string, Challenge>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("fate_daily_submissions")
      .select("id, profile_id, challenge_id, challenge_date, screenshot_url, note, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as Submission[];
    setSubmissions(rows);

    const profileIds = [...new Set(rows.map((r) => r.profile_id))];
    const challengeIds = [...new Set(rows.map((r) => r.challenge_id))];

    if (profileIds.length) {
      const result = await supabase
        .from("profiles")
        .select("id, username, nickname")
        .in("id", profileIds);
      const map: Record<string, Profile> = {};
      (result.data || []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    } else setProfiles({});

    if (challengeIds.length) {
      const result = await supabase
        .from("fate_daily_challenges")
        .select("id, title, reward")
        .in("id", challengeIds);
      const map: Record<string, Challenge> = {};
      (result.data || []).forEach((c) => { map[c.id] = c; });
      setChallenges(map);
    } else setChallenges({});

    setLoading(false);
  }

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setMessage("");

    const functionName = action === "approve"
      ? "approve_fate_daily_submission"
      : "reject_fate_daily_submission";

    const { error } = await supabase.rpc(functionName, { submission_id: id });

    if (error) setMessage(error.message);
    else await load();

    setBusyId(null);
  }

  return (
    <div className="page">
      <h1>📸 Faté Daily Verification</h1>
      <p>Review member proof before Faté Points and streak credit are awarded.</p>

      {message && <div className="card" style={{ marginBottom: 18 }}>{message}</div>}

      {loading ? (
        <div className="card">Loading submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="card"><h2>All caught up.</h2><p>No pending Faté Daily submissions.</p></div>
      ) : (
        submissions.map((submission) => {
          const profile = profiles[submission.profile_id];
          const challenge = challenges[submission.challenge_id];
          const name = profile?.nickname || profile?.username || "Unknown member";

          return (
            <div className="card" key={submission.id} style={{ marginBottom: 20 }}>
              <h2>{name}</h2>
              <p>
                <strong>{challenge?.title || "Faté Daily"}</strong> • {submission.challenge_date}
                {challenge ? ` • ${challenge.reward} points` : ""}
              </p>

              <img
                src={submission.screenshot_url}
                alt={`${name} Faté Daily proof`}
                style={{ width: "100%", maxWidth: 850, maxHeight: 650, objectFit: "contain", borderRadius: 12 }}
              />

              {submission.note && <p style={{ marginTop: 12 }}>{submission.note}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button
                  className="edit-btn"
                  disabled={busyId === submission.id}
                  onClick={() => review(submission.id, "approve")}
                >
                  {busyId === submission.id ? "Processing..." : "✓ Approve"}
                </button>
                <button
                  className="edit-btn"
                  disabled={busyId === submission.id}
                  onClick={() => review(submission.id, "reject")}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
