import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getDailyChallenge } from "../lib/fateProgression";

type Submission = {
  id: string;
  status: "pending" | "approved" | "rejected";
  proof_url: string | null;
  note: string | null;
  rejection_reason: string | null;
};

export default function FateDaily() {
  const challenge = useMemo(() => getDailyChallenge(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [challenge.date]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setSubmission(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [{ data: daily }, { data: pending }, { data: latest }] = await Promise.all([
      supabase
        .from("fate_daily_completions")
        .select("streak")
        .eq("profile_id", user.id)
        .order("challenge_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("fate_daily_submissions")
        .select("id, status, proof_url, note, rejection_reason")
        .eq("profile_id", user.id)
        .eq("challenge_date", challenge.date)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("fate_daily_completions")
        .select("streak")
        .eq("profile_id", user.id)
        .eq("challenge_date", challenge.date)
        .maybeSingle(),
    ]);

    setStreak(Number(daily?.streak ?? 0));
    setSubmission(pending ?? (latest ? {
      id: "completed",
      status: "approved",
      proof_url: null,
      note: null,
      rejection_reason: null,
    } : null));
    setLoading(false);
  }

  async function submitForVerification() {
    if (!userId || submitting || submission?.status === "pending" || submission?.status === "approved") return;

    setSubmitting(true);

    const { data, error } = await supabase
      .from("fate_daily_submissions")
      .insert({
        profile_id: userId,
        challenge_date: challenge.date,
        challenge_key: challenge.key,
        reward: challenge.reward,
        proof_url: proofUrl.trim() || null,
        note: note.trim() || null,
      })
      .select("id, status, proof_url, note, rejection_reason")
      .single();

    if (error) {
      alert(error.message);
      setSubmitting(false);
      return;
    }

    setSubmission(data);
    setSubmitting(false);
  }

  const status = submission?.status;

  return (
    <div className="page">
      <h1>🔥 Faté Daily</h1>

      <div className="card" style={{ maxWidth: 700 }}>
        <h2>{challenge.title}</h2>
        <p>{challenge.description}</p>
        <p style={{ fontSize: 20 }}>
          ⭐ Reward: <strong>{challenge.reward} Faté Points</strong>
        </p>
        <p>
          🔥 Current streak: <strong>{streak} day{streak === 1 ? "" : "s"}</strong>
        </p>

        {loading ? (
          <p>Loading...</p>
        ) : !userId ? (
          <p>Log in to submit today's challenge for verification.</p>
        ) : status === "approved" ? (
          <div>
            <p><strong>✓ Verified</strong> — today's Faté Daily is complete.</p>
          </div>
        ) : status === "pending" ? (
          <div>
            <p><strong>⏳ Pending Verification</strong></p>
            <p>Staff needs to verify your submission before the points are awarded.</p>
          </div>
        ) : (
          <div>
            {submission?.status === "rejected" && (
              <div className="card" style={{ marginBottom: 16 }}>
                <strong>❌ Submission rejected</strong>
                {submission.rejection_reason && <p>{submission.rejection_reason}</p>}
                <p>You can submit again with updated proof.</p>
              </div>
            )}

            <label style={{ display: "block", marginBottom: 8 }}>
              Screenshot / proof URL <span style={{ opacity: 0.7 }}>(optional)</span>
            </label>
            <input
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://..."
              style={{ width: "100%", marginBottom: 12 }}
            />

            <label style={{ display: "block", marginBottom: 8 }}>
              Note / details
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell staff how you completed today's challenge."
              rows={4}
              style={{ width: "100%", marginBottom: 12 }}
            />

            <button className="edit-btn" disabled={submitting} onClick={submitForVerification}>
              {submitting ? "Submitting..." : "Submit for Verification"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
