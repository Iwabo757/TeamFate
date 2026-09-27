import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Challenge = {
  id: string;
  key: string;
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

const emptyForm = {
  title: "",
  description: "",
  reward: 50,
  enabled: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "daily_challenge";
}

function localDate(offsetDays = 0) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function notifyCalendar() {
  window.dispatchEvent(new CustomEvent("fate-daily-schedule-updated"));
}

export default function AdminFateDaily() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignDate, setAssignDate] = useState(localDate());
  const [assignChallengeId, setAssignChallengeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const enabledChallenges = useMemo(
    () => challenges.filter((challenge) => challenge.enabled),
    [challenges]
  );

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage("");

    const [challengeResult, scheduleResult] = await Promise.all([
      supabase
        .from("fate_daily_challenges")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase
        .from("fate_daily_schedule")
        .select("challenge_date, challenge_id")
        .order("challenge_date", { ascending: true }),
    ]);

    if (challengeResult.error) {
      setMessage(challengeResult.error.message);
    }

    if (scheduleResult.error) {
      setMessage(scheduleResult.error.message);
    }

    const challengeRows = (challengeResult.data || []) as Challenge[];
    setChallenges(challengeRows);

    const byId = new Map(challengeRows.map((row) => [row.id, row]));
    setSchedule(
      (scheduleResult.data || []).map((row) => ({
        ...row,
        challenge: byId.get(row.challenge_id),
      }))
    );

    if (!assignChallengeId && challengeRows.length) {
      setAssignChallengeId(
        challengeRows.find((row) => row.enabled)?.id || challengeRows[0].id
      );
    }

    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editChallenge(row: Challenge) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      description: row.description,
      reward: row.reward,
      enabled: row.enabled,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveChallenge() {
    const title = form.title.trim();
    const description = form.description.trim();

    if (!title || !description || Number(form.reward) < 0) {
      setMessage("Title, description, and a valid reward are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    if (editingId) {
      const { error } = await supabase
        .from("fate_daily_challenges")
        .update({
          title,
          description,
          reward: Number(form.reward),
          enabled: form.enabled,
        })
        .eq("id", editingId);

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Faté Daily challenge updated.");
        resetForm();
        await load();
      }
    } else {
      const baseKey = slugify(title);
      const { data: existing } = await supabase
        .from("fate_daily_challenges")
        .select("key")
        .like("key", `${baseKey}%`);

      const used = new Set((existing || []).map((row) => row.key));
      let key = baseKey;
      let suffix = 2;
      while (used.has(key)) {
        key = `${baseKey}_${suffix++}`;
      }

      const { error } = await supabase
        .from("fate_daily_challenges")
        .insert({
          key,
          title,
          description,
          reward: Number(form.reward),
          enabled: form.enabled,
        });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Faté Daily challenge created.");
        resetForm();
        await load();
      }
    }

    setSaving(false);
  }

  async function toggleChallenge(row: Challenge) {
    const { error } = await supabase
      .from("fate_daily_challenges")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await load();
  }

  async function deleteChallenge(row: Challenge) {
    if (!window.confirm(`Delete "${row.title}"?`)) return;

    const { error } = await supabase
      .from("fate_daily_challenges")
      .delete()
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await load();
  }

  async function assignChallenge() {
    if (!assignDate || !assignChallengeId) {
      setMessage("Choose a date and challenge first.");
      return;
    }

    const { error } = await supabase
      .from("fate_daily_schedule")
      .upsert(
        {
          challenge_date: assignDate,
          challenge_id: assignChallengeId,
        },
        { onConflict: "challenge_date" }
      );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Faté Daily assigned for ${assignDate}. Calendar updated.`);
    notifyCalendar();
    await load();
  }

  async function removeAssignment(date: string) {
    if (!window.confirm(`Remove the Faté Daily assignment for ${date}?`)) return;

    const { error } = await supabase
      .from("fate_daily_schedule")
      .delete()
      .eq("challenge_date", date);

    if (error) {
      setMessage(error.message);
      return;
    }

    notifyCalendar();
    await load();
  }

  async function fillNextSevenDays() {
    if (!enabledChallenges.length) {
      setMessage("Create or enable at least one challenge first.");
      return;
    }

    const rows = Array.from({ length: 7 }, (_, index) => ({
      challenge_date: localDate(index),
      challenge_id: enabledChallenges[index % enabledChallenges.length].id,
    }));

    const { error } = await supabase
      .from("fate_daily_schedule")
      .upsert(rows, { onConflict: "challenge_date" });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Next 7 days scheduled. Calendar updated.");
    notifyCalendar();
    await load();
  }

  const upcoming = schedule.filter((row) => row.challenge_date >= localDate());

  return (
    <div className="page">
      <h1>🔥 Faté Daily Manager</h1>
      <p>
        Create daily challenges and assign the exact challenge members will see
        for each date. Everyone receives the same scheduled challenge.
      </p>

      {message && (
        <div className="card" style={{ marginBottom: 18 }}>
          {message}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>{editingId ? "Edit Challenge" : "Create Challenge"}</h2>

        <div className="event-grid">
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Catch 50 Pokémon"
            />
          </label>

          <label>
            Faté Points
            <input
              type="number"
              min="0"
              value={form.reward}
              onChange={(e) =>
                setForm({ ...form, reward: Number(e.target.value) })
              }
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Catch 50 Pokémon today."
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) =>
                setForm({ ...form, enabled: e.target.checked })
              }
            />{" "}
            Enabled
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="edit-btn" disabled={saving} onClick={saveChallenge}>
            {saving ? "Saving..." : editingId ? "Save Changes" : "Create Challenge"}
          </button>
          {editingId && (
            <button className="edit-btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>📅 Assign Daily Challenge</h2>

        <div className="event-grid">
          <label>
            Date
            <input
              type="date"
              value={assignDate}
              onChange={(e) => setAssignDate(e.target.value)}
            />
          </label>

          <label>
            Challenge
            <select
              value={assignChallengeId}
              onChange={(e) => setAssignChallengeId(e.target.value)}
            >
              <option value="">Select challenge</option>
              {challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>
                  {challenge.title} • {challenge.reward} points
                  {!challenge.enabled ? " • Disabled" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button className="edit-btn" onClick={assignChallenge}>
            Assign Challenge
          </button>
          <button className="edit-btn" onClick={fillNextSevenDays}>
            Auto-Fill Next 7 Days
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>🗓️ Upcoming Schedule</h2>

        {loading ? (
          <p>Loading...</p>
        ) : upcoming.length === 0 ? (
          <p>No challenges are scheduled yet.</p>
        ) : (
          <div>
            {upcoming.map((row) => (
              <div
                key={row.challenge_date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 0",
                  borderBottom: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <div>
                  <strong>{row.challenge_date}</strong>
                  <div>
                    {row.challenge?.title || "Unknown challenge"}
                    {row.challenge && ` • ${row.challenge.reward} points`}
                  </div>
                </div>
                <button
                  className="edit-btn"
                  onClick={() => {
                    setAssignDate(row.challenge_date);
                    setAssignChallengeId(row.challenge_id);
                  }}
                >
                  Edit
                </button>
                <button
                  className="edit-btn"
                  onClick={() => removeAssignment(row.challenge_date)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>🎯 Available Challenges</h2>

        {challenges.map((row) => (
          <div
            key={row.id}
            style={{
              padding: "16px 0",
              borderBottom: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <strong>{row.title}</strong>
            <span style={{ marginLeft: 10 }}>{row.reward} points</span>
            {!row.enabled && <span style={{ marginLeft: 10 }}>Disabled</span>}
            <p style={{ margin: "6px 0 12px" }}>{row.description}</p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="edit-btn" onClick={() => editChallenge(row)}>
                Edit
              </button>
              <button className="edit-btn" onClick={() => toggleChallenge(row)}>
                {row.enabled ? "Disable" : "Enable"}
              </button>
              <button className="edit-btn" onClick={() => deleteChallenge(row)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
