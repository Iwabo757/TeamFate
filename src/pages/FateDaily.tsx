import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Challenge = {
  id: string;
  key: string;
  title: string;
  description: string;
  reward: number;
};

type Submission = {
  id: string;
  status: "pending" | "approved" | "rejected";
};

export default function FateDaily() {
  const [userId, setUserId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeDate, setChallengeDate] = useState("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [streak, setStreak] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    // The schedule is the source of truth. There is no client-side rotation.
    const now = new Date();
    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    const { data: schedule, error: scheduleError } = await supabase
      .from("fate_daily_schedule")
      .select(`
        challenge_date,
        challenge_id,
        fate_daily_challenges (
          id,
          key,
          title,
          description,
          reward
        )
      `)
      .eq("challenge_date", today)
      .maybeSingle();

    if (scheduleError) {
      setMessage(scheduleError.message);
      setLoading(false);
      return;
    }

    if (!schedule?.fate_daily_challenges) {
      setMessage("Today's Faté Daily has not been scheduled yet.");
      setLoading(false);
      return;
    }

    setChallengeDate(schedule.challenge_date);
    setChallenge(schedule.fate_daily_challenges as unknown as Challenge);

    const { data: existing } = await supabase
      .from("fate_daily_submissions")
      .select("id, status")
      .eq("profile_id", user.id)
      .eq("challenge_date", today)
      .maybeSingle();

    setSubmission(existing || null);

    const { data: latestCompletion } = await supabase
      .from("fate_daily_completions")
      .select("streak")
      .eq("profile_id", user.id)
      .order("challenge_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setStreak(Number(latestCompletion?.streak || 0));
    setLoading(false);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Screenshot must be 8 MB or smaller.");
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMessage("");
  }

  async function submitForVerification() {
    if (!userId || !challenge || !challengeDate) return;

    if (!imageFile) {
      setMessage("Please upload a screenshot as proof.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const extension =
        imageFile.name.split(".").pop()?.toLowerCase() || "png";

      const path = `fate-daily/${userId}/${challengeDate}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("shiny-screenshots")
        .upload(path, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("shiny-screenshots")
        .getPublicUrl(path);

      const { data, error } = await supabase
        .from("fate_daily_submissions")
        .insert({
          profile_id: userId,
          challenge_id: challenge.id,
          challenge_date: challengeDate,
          screenshot_url: publicUrl.publicUrl,
          note: note.trim() || null,
          status: "pending",
        })
        .select("id, status")
        .single();

      if (error) throw error;

      setSubmission(data);
      setImageFile(null);
      setPreviewUrl("");
      setNote("");
      setMessage("Submitted! Staff must verify your proof before points are awarded.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to submit Faté Daily.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="page"><div className="card">Loading Faté Daily...</div></div>;
  }

  if (!userId) {
    return (
      <div className="page">
        <h1>🔥 Faté Daily</h1>
        <div className="card">Please log in to participate in Faté Daily.</div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="page">
        <h1>🔥 Faté Daily</h1>
        <div className="card">
          <h2>No Daily Scheduled</h2>
          <p>{message || "Staff has not scheduled today's Faté Daily yet."}</p>
        </div>
      </div>
    );
  }

  const statusLabel =
    submission?.status === "approved"
      ? "✓ Approved"
      : submission?.status === "rejected"
        ? "✕ Rejected"
        : submission?.status === "pending"
          ? "⏳ Pending Verification"
          : "";

  return (
    <div className="page">
      <h1>🔥 Faté Daily</h1>

      <div className="card" style={{ maxWidth: 900 }}>
        <h2>{challenge.title}</h2>
        <p>{challenge.description}</p>

        <p style={{ fontSize: 20 }}>
          ⭐ Reward: <strong>{challenge.reward} Faté Points</strong>
        </p>

        <p>
          🔥 Current streak:{" "}
          <strong>{streak} day{streak === 1 ? "" : "s"}</strong>
        </p>

        {submission ? (
          <div className="card" style={{ marginTop: 18 }}>
            <h3>{statusLabel}</h3>
            {submission.status === "pending" && (
              <p>Your proof is waiting for staff verification.</p>
            )}
            {submission.status === "approved" && (
              <p>Your Faté Daily has been approved and your reward has been processed.</p>
            )}
            {submission.status === "rejected" && (
              <p>Your proof was rejected. You can contact staff for clarification.</p>
            )}
          </div>
        ) : (
          <>
            <h3>Screenshot / Proof</h3>

            <label
              className="edit-btn"
              style={{
                display: "inline-block",
                cursor: "pointer",
                marginBottom: 16,
              }}
            >
              📷 Choose Screenshot
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </label>

            {previewUrl && (
              <div style={{ marginBottom: 16 }}>
                <img
                  src={previewUrl}
                  alt="Faté Daily proof preview"
                  style={{
                    width: "100%",
                    maxWidth: 700,
                    maxHeight: 500,
                    objectFit: "contain",
                    borderRadius: 12,
                  }}
                />
              </div>
            )}

            <label>
              <strong>Note / details</strong>
              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell staff how you completed today's challenge."
                style={{ width: "100%", marginTop: 8 }}
              />
            </label>

            <button
              className="submit-btn"
              disabled={submitting}
              onClick={submitForVerification}
              style={{ marginTop: 16 }}
            >
              {submitting ? "Uploading..." : "Submit for Verification"}
            </button>

            <p style={{ marginTop: 12 }}>
              Upload a screenshot of your proof. Staff must verify it before you receive Faté Points.
            </p>
          </>
        )}

        {message && (
          <p style={{ marginTop: 16 }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
