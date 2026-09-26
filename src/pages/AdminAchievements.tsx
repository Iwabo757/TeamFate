import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const REQUIREMENT_TYPES = [
  { value: "shiny_count", label: "Shiny Count" },
  { value: "event_wins", label: "Event Wins" },
  { value: "daily_streak", label: "Faté Daily Streak" },
  { value: "bounty_caught", label: "Bounty Caught" },
];

type Achievement = {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  reward: number;
  requirement_type: string;
  threshold: number;
  enabled: boolean;
};

const emptyForm = {
  name: "",
  description: "",
  icon: "🏆",
  reward: 100,
  requirement_type: "shiny_count",
  threshold: 1,
  enabled: true,
};

export default function AdminAchievements() {
  const [rows, setRows] = useState<Achievement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("fate_achievements")
      .select("*")
      .order("threshold", { ascending: true });

    if (error) {
      setMessage(error.message);
    } else {
      setRows(data || []);
    }

    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  }

  function edit(row: Achievement) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description,
      icon: row.icon,
      reward: row.reward,
      requirement_type: row.requirement_type,
      threshold: row.threshold,
      enabled: row.enabled,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setSaving(true);
    setMessage("");

    const name = form.name.trim();

    if (!name || form.threshold < 1) {
      setMessage("Name and a threshold of at least 1 are required.");
      setSaving(false);
      return;
    }

    const payload = {
      name,
      description: form.description.trim(),
      icon: form.icon.trim() || "🏆",
      reward: Number(form.reward),
      requirement_type: form.requirement_type,
      threshold: Number(form.threshold),
      enabled: form.enabled,
    };

    if (!editingId) {
      const baseKey = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "achievement";

      const { data: existing } = await supabase
        .from("fate_achievements")
        .select("key")
        .like("key", `${baseKey}%`);

      const usedKeys = new Set((existing || []).map((row) => row.key));
      let generatedKey = baseKey;
      let suffix = 2;

      while (usedKeys.has(generatedKey)) {
        generatedKey = `${baseKey}_${suffix}`;
        suffix += 1;
      }

      (payload as typeof payload & { key: string }).key = generatedKey;
    }

    const result = editingId
      ? await supabase
          .from("fate_achievements")
          .update(payload)
          .eq("id", editingId)
      : await supabase
          .from("fate_achievements")
          .insert(payload);

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(editingId ? "Achievement updated." : "Achievement created.");
      resetForm();
      await load();
    }

    setSaving(false);
  }

  async function toggle(row: Achievement) {
    const { error } = await supabase
      .from("fate_achievements")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await load();
  }

  async function remove(row: Achievement) {
    if (!window.confirm(
      `Delete "${row.name}"? Existing points already awarded will not be removed.`
    )) {
      return;
    }

    const { error } = await supabase
      .from("fate_achievements")
      .delete()
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (editingId === row.id) {
      resetForm();
    }

    await load();
  }

  return (
    <div className="page">
      <h1>🏆 Achievement Manager</h1>
      <p>
        Staff can create, edit, enable, disable, and remove Faté achievements.
        New achievements automatically become eligible for members who meet
        the requirement.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2>{editingId ? "Edit Achievement" : "Create Achievement"}</h2>

        <div className="event-grid">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Shiny Master"
            />
          </label>

          <label>
            Icon
            <input
              value={form.icon}
              onChange={(e) =>
                setForm({ ...form, icon: e.target.value })
              }
              placeholder="🌟"
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

          <label>
            Requirement
            <select
              value={form.requirement_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  requirement_type: e.target.value,
                })
              }
            >
              {REQUIREMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Required Amount
            <input
              type="number"
              min="1"
              value={form.threshold}
              onChange={(e) =>
                setForm({
                  ...form,
                  threshold: Number(e.target.value),
                })
              }
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Description
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              placeholder="Collect 50 shinies."
              rows={3}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) =>
                setForm({
                  ...form,
                  enabled: e.target.checked,
                })
              }
            />
            {" "}Enabled
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={save} disabled={saving}>
            {saving
              ? "Saving..."
              : editingId
                ? "Save Changes"
                : "Create Achievement"}
          </button>

          {editingId && (
            <button onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>

        {message && (
          <p style={{ marginTop: 12 }}>
            {message}
          </p>
        )}
      </div>

      <h2>Current Achievements</h2>

      {loading ? (
        <div className="card">Loading achievements...</div>
      ) : (
        <div className="event-grid">
          {rows.map((row) => (
            <div
              className="card"
              key={row.id}
              style={{
                opacity: row.enabled ? 1 : 0.55,
              }}
            >
              <div style={{ fontSize: 36 }}>
                {row.icon}
              </div>

              <h3>{row.name}</h3>

              <p>{row.description}</p>

              <p>
                <strong>
                  +{row.reward.toLocaleString()} Faté Points
                </strong>
              </p>

              <p>
                Requirement:{" "}
                <strong>
                  {row.threshold.toLocaleString()}
                </strong>{" "}
                {REQUIREMENT_TYPES.find(
                  (x) => x.value === row.requirement_type
                )?.label || row.requirement_type}
              </p>

              <p>
                Status:{" "}
                <strong>
                  {row.enabled ? "Enabled" : "Disabled"}
                </strong>
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => edit(row)}>
                  Edit
                </button>

                <button onClick={() => toggle(row)}>
                  {row.enabled ? "Disable" : "Enable"}
                </button>

                <button onClick={() => remove(row)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
