import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { getDailyChallenge } from "../lib/fateProgression";

type SubmissionStatus = "pending" | "approved" | "rejected";

type Submission = {
  id: string;
  status: SubmissionStatus;
  proof_url: string | null;
  note: string | null;
};

export default function FateDaily() {
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const challenge = getDailyChallenge();

  useEffect(() => {
    void load();

    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data: daily } = await supabase
      .from("fate_daily_completions")
      .select("streak")
      .eq("profile_id", user.id)
      .order("challenge_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setStreak(Number(daily?.streak || 0));

    const { data, error } = await supabase
      .from("fate_daily_submissions")
      .select("id, status, proof_url, note")
      .eq("profile_id", user.id)
      .eq("challenge_date", challenge.date)
      .maybeSingle();

    if (error) {
      console.error("Failed to load Faté Daily submission:", error);
      return;
    }

    if (data) {
      setSubmission(data as Submission);
      setNote(data.note || "");
    }
  }

  function chooseProof() {
    fileInputRef.current?.click();
  }

  function handleProofChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setProofFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    event.target.value = "";
  }

  function removeProof() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setProofFile(null);
    setPreviewUrl("");
  }

  async function submitForVerification() {
    if (!userId || submitting) return;

    if (!proofFile && !submission?.proof_url) {
      alert("Please upload a screenshot showing your completed challenge.");
      return;
    }

    setSubmitting(true);

    try {
      let proofUrl = submission?.proof_url || null;

      if (proofFile) {
        const safeName = proofFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        );

        const filePath =
          `fate-daily/${userId}/${challenge.date}-${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("shiny-screenshots")
          .upload(filePath, proofFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("shiny-screenshots")
          .getPublicUrl(filePath);

        proofUrl = data.publicUrl;
      }

      const { data, error } = await supabase
        .from("fate_daily_submissions")
        .upsert(
          {
            profile_id: userId,
            challenge_date: challenge.date,
            challenge_key: challenge.key,
            reward: challenge.reward,
            proof_url: proofUrl,
            note: note.trim() || null,
            status: "pending",
          },
          {
            onConflict: "profile_id,challenge_date",
          }
        )
        .select("id, status, proof_url, note")
        .single();

      if (error) {
        throw error;
      }

      setSubmission(data as Submission);
      setProofFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl("");

      alert("Faté Daily submitted for staff verification!");
    } catch (error: any) {
      console.error("Faté Daily submission error:", error);
      alert(error?.message || "Unable to submit Faté Daily.");
    } finally {
      setSubmitting(false);
    }
  }

  const approved = submission?.status === "approved";
  const pending = submission?.status === "pending";

  return (
    <div className="page">
      <h1>🔥 Faté Daily</h1>

      <div className="card" style={{ maxWidth: 700 }}>
        <h2>{challenge.title}</h2>

        <p>{challenge.description}</p>

        <p style={{ fontSize: 20 }}>
          ⭐ Reward:{" "}
          <strong>{challenge.reward} Faté Points</strong>
        </p>

        <p>
          🔥 Current streak:{" "}
          <strong>
            {streak} day{streak === 1 ? "" : "s"}
          </strong>
        </p>

        {!userId ? (
          <p>Log in to submit today's challenge.</p>
        ) : approved ? (
          <div className="card">
            <strong>✓ Approved!</strong>
            <p>Staff verified today's Faté Daily.</p>
          </div>
        ) : pending ? (
          <div className="card">
            <strong>⏳ Pending Verification</strong>
            <p>
              Your submission is waiting for a staff member to review it.
            </p>

            {submission.proof_url && (
              <img
                src={submission.proof_url}
                alt="Submitted Faté Daily proof"
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 420,
                  objectFit: "contain",
                  borderRadius: 12,
                  marginTop: 12,
                }}
              />
            )}
          </div>
        ) : (
          <>
            {submission?.status === "rejected" && (
              <div
                className="card"
                style={{ marginBottom: 16 }}
              >
                <strong>❌ Submission Rejected</strong>
                <p>
                  Staff did not approve this submission. You can submit
                  another proof below.
                </p>
              </div>
            )}

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Screenshot / Proof
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleProofChange}
              style={{ display: "none" }}
            />

            {previewUrl ? (
              <div style={{ marginBottom: 16 }}>
                <img
                  src={previewUrl}
                  alt="Proof preview"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 420,
                    objectFit: "contain",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.2)",
                  }}
                />

                <button
                  type="button"
                  className="edit-btn"
                  onClick={removeProof}
                  style={{ marginTop: 10 }}
                >
                  Remove Photo
                </button>
              </div>
            ) : submission?.proof_url ? (
              <div style={{ marginBottom: 16 }}>
                <img
                  src={submission.proof_url}
                  alt="Current proof"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 420,
                    objectFit: "contain",
                    borderRadius: 12,
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                className="edit-btn"
                onClick={chooseProof}
              >
                📷 Choose Screenshot
              </button>
            )}

            {proofFile && (
              <p style={{ marginTop: 8, opacity: 0.8 }}>
                Selected: <strong>{proofFile.name}</strong>
              </p>
            )}

            <label
              style={{
                display: "block",
                fontWeight: 600,
                marginTop: 18,
                marginBottom: 8,
              }}
            >
              Note / details
            </label>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tell staff how you completed today's challenge."
              rows={5}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />

            <button
              className="edit-btn"
              disabled={submitting}
              onClick={submitForVerification}
              style={{ marginTop: 16 }}
            >
              {submitting
                ? "Uploading..."
                : "Submit for Verification"}
            </button>

            <p style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}>
              Upload a screenshot of your proof. Staff must verify it before
              you receive Faté Points.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
