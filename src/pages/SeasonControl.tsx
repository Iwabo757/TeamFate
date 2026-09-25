import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Season = "Spring" | "Summer" | "Autumn" | "Winter";

const SEASONS: { name: Season; icon: string }[] = [
  { name: "Spring", icon: "🌸" },
  { name: "Summer", icon: "☀️" },
  { name: "Autumn", icon: "🍁" },
  { name: "Winter", icon: "❄️" },
];

export default function SeasonControl() {
  const [override, setOverride] = useState<Season | null>(null);
  const [selected, setSelected] = useState<Season | "auto">("auto");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSetting();
  }, []);

  async function loadSetting() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "season_override")
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      return;
    }

    const value = typeof data?.value === "string" ? data.value : null;
    const season = SEASONS.some((item) => item.name === value)
      ? (value as Season)
      : null;

    setOverride(season);
    setSelected(season ?? "auto");
  }

  async function save() {
    setSaving(true);
    setMessage("");

    const value = selected === "auto" ? null : selected;

    const { error } = await supabase
      .from("site_settings")
      .upsert(
        {
          key: "season_override",
          value,
        },
        { onConflict: "key" }
      );

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setOverride(value);
    setMessage(value ? `${value} is now active site-wide.` : "Automatic season rotation restored.");
    setSaving(false);
  }

  return (
    <div className="page">
      <h1>Season Control</h1>

      <div className="admin-section" style={{ maxWidth: 720 }}>
        <h2>PokéMMO Season</h2>
        <p className="muted">
          Normally the website follows the automatic seasonal rotation. Use an override when the
          game is temporarily using a different season.
        </p>

        <div style={{ marginTop: 24 }}>
          <label htmlFor="season-control">Website Season</label>
          <select
            id="season-control"
            className="admin-input"
            value={selected}
            onChange={(event) => setSelected(event.target.value as Season | "auto")}
          >
            <option value="auto">Automatic Rotation</option>
            {SEASONS.map((season) => (
              <option key={season.name} value={season.name}>
                {season.icon} {season.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 18 }}>
          <strong>Current setting: </strong>
          {override ? `${override} (manual override)` : "Automatic rotation"}
        </div>

        <button
          className="admin-button"
          type="button"
          onClick={save}
          disabled={saving}
          style={{ marginTop: 24 }}
        >
          {saving ? "Saving..." : "Save Season"}
        </button>

        {message && (
          <p style={{ marginTop: 16 }} role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
