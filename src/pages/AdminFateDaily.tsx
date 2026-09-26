import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const STAFF_ROLES = ["officer", "commander", "leader", "admin"];

type Submission = {
  id: string;
  profile_id: string;
  challenge_date: string;
  challenge_key: string;
  reward: number;
  proof_url: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  profiles?: { nickname?: string | null; username?: string | null } | null;
};

export default function AdminFateDaily() {
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const ok = STAFF_ROLES.includes(profile?.role || "");
    setAllowed(ok);

    if (ok) await loadPending();
    else setLoading(false);
  }

  async function loadPending() {
    setLoading(true);
    // Do not embed profiles here. fate_daily_submissions has two
    // relationships to profiles (profile_id and reviewed_by), so
    // PostgREST cannot choose one automatically. Load submissions
    // first, then fetch the member profiles explicitly.
    const { data: submissions, error } = await supabase
      .from("fate_daily_submissions")
      .select(`
        id,
        profile_id,
        challenge_date,
        challenge_key,
        reward,
        proof_url,
        note,
        status,
        rejection_reason,
        submitted_at
      `)
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error) {
      alert(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    const rows = (submissions || []) as Submission[];
    const profileIds = [...new Set(rows.map((row) => row.profile_id))];

    if (!profileIds.length) {
      setItems(rows);
      setLoading(false);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nickname, username")
      .in("id", profileIds);

    if (profilesError) {
      alert(profilesError.message);
      setItems(rows);
      setLoading(false);
      return;
    }

    const profileMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile])
    );

    setItems(
      rows.map((row) => ({
        ...row,
        profiles: profileMap.get(row.profile_id) || null,
      }))
    );
    setLoading(false);
  }

  async function review(id: string, approve: boolean) {
    if (working) return;

    let rejectionReason: string | null = null;
    if (!approve) {
      rejectionReason = window.prompt("Reason for rejection (optional):")?.trim() || null;
    }

    setWorking(id);

    const { error } = await supabase.rpc("review_fate_daily", {
      p_submission_id: id,
      p_approve: approve,
      p_rejection_reason: rejectionReason,
    });

    if (error) alert(error.message);
    else await loadPending();

    setWorking(null);
  }

  if (loading) return <div className="page"><h1>🔥 Faté Daily Verification</h1><p>Loading...</p></div>;

  if (!allowed) {
    return <div className="page"><h1>Access Denied</h1><p>Staff access is required.</p></div>;
  }

  return (
    <div className="page">
      <h1>🔥 Faté Daily Verification</h1>
      <p>Review member submissions before any Faté Points are awarded.</p>

      {!items.length ? (
        <div className="card"><strong>No pending submissions.</strong></div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {items.map((item) => {
            const member = item.profiles?.nickname || item.profiles?.username || item.profile_id;
            return (
              <div className="card" key={item.id}>
                <h2 style={{ marginTop: 0 }}>{member}</h2>
                <p><strong>Challenge:</strong> {item.challenge_key}</p>
                <p><strong>Date:</strong> {item.challenge_date}</p>
                <p><strong>Reward:</strong> {item.reward} Faté Points</p>
                {item.note && <p><strong>Member note:</strong> {item.note}</p>}
                {item.proof_url && (
                  <p>
                    <strong>Proof:</strong>{" "}
                    <a href={item.proof_url} target="_blank" rel="noreferrer">Open screenshot / proof</a>
                  </p>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="edit-btn" disabled={working === item.id} onClick={() => review(item.id, true)}>
                    {working === item.id ? "Working..." : "✓ Approve & Award Points"}
                  </button>
                  <button className="edit-btn" disabled={working === item.id} onClick={() => review(item.id, false)}>
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
