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

type Profile = {
  id: string;
  username: string | null;
  nickname: string | null;
};

type Challenge = {
  id: string;
  title: string;
  reward: number;
};

export default function AdminFateDailyReviews() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [challenges, setChallenges] = useState<Record<string, Challenge>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("fate_daily_submissions")
      .select(
        "id, profile_id, challenge_id, challenge_date, screenshot_url, note, status, created_at"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as Submission[];
    setSubmissions(rows);

    const profileIds = [...new Set(rows.map((row) => row.profile_id))];
    const challengeIds = [...new Set(rows.map((row) => row.challenge_id))];

    if (profileIds.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, username, nickname")
        .in("id", profileIds);

      setProfiles(
        Object.fromEntries(
          ((profileRows || []) as Profile[]).map((profile) => [
            profile.id,
            profile,
          ])
        )
      );
    } else {
      setProfiles({});
    }

    if (challengeIds.length) {
      const { data: challengeRows } = await supabase
        .from("fate_daily_challenges")
        .select("id, title, reward")
        .in("id", challengeIds);

      setChallenges(
        Object.fromEntries(
          ((challengeRows || []) as Challenge[]).map((challenge) => [
            challenge.id,
            challenge,
          ])
        )
      );
    } else {
      setChallenges({});
    }

    setLoading(false);
  }

  async function review(
    id: string,
    action: "approve" | "reject"
  ) {
    setBusyId(id);
    setMessage("");

    const rpc =
      action === "approve"
        ? "approve_fate_daily_submission"
        : "reject_fate_daily_submission";

    const { error } = await supabase.rpc(rpc, {
      submission_id: id,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        action === "approve"
          ? "Faté Daily approved. Points and streak processing completed."
          : "Faté Daily submission rejected."
      );
      await load();
    }

    setBusyId(null);
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card">Loading Faté Daily reviews...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>🔥 Faté Daily Reviews</h1>

      {message && (
        <div className="card" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}

      {!submissions.length ? (
        <div className="card">
          <h2>No Pending Submissions</h2>
          <p>There are no Faté Daily proofs waiting for staff review.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {submissions.map((submission) => {
            const profile = profiles[submission.profile_id];
            const challenge = challenges[submission.challenge_id];

            return (
              <div className="card" key={submission.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ marginBottom: 6 }}>
                      {profile?.nickname ||
                        profile?.username ||
                        "Unknown member"}
                    </h2>
                    <p style={{ margin: 0 }}>
                      <strong>{challenge?.title || "Faté Daily"}</strong>
                    </p>
                    <p style={{ margin: "6px 0 0" }}>
                      {submission.challenge_date} ·{" "}
                      {challenge?.reward ?? 0} Faté Points
                    </p>
                  </div>

                  <span>⏳ Pending</span>
                </div>

                <div style={{ marginTop: 18 }}>
                  <img
                    src={submission.screenshot_url}
                    alt="Faté Daily proof"
                    style={{
                      width: "100%",
                      maxWidth: 900,
                      maxHeight: 650,
                      objectFit: "contain",
                      borderRadius: 12,
                      display: "block",
                    }}
                  />
                </div>

                {submission.note && (
                  <div
                    className="card"
                    style={{ marginTop: 16, background: "transparent" }}
                  >
                    <strong>Member Note</strong>
                    <p style={{ whiteSpace: "pre-wrap" }}>
                      {submission.note}
                    </p>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 18,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className="submit-btn"
                    disabled={busyId === submission.id}
                    onClick={() => review(submission.id, "approve")}
                  >
                    {busyId === submission.id
                      ? "Processing..."
                      : "✓ Approve & Award"}
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
          })}
        </div>
      )}
    </div>
  );
}
