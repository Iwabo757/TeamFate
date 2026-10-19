import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./AdminShinyGraveyard.css";

type Status = "pending" | "approved" | "rejected";
type Filter = Status | "all";
type Entry = {
  id: string;
  user_id: string;
  pokemon_name: string;
  trainer_name: string;
  encounter_date: string | null;
  cause_of_loss: string;
  story: string | null;
  image_url: string | null;
  status: Status;
  created_at: string;
};

const STAFF_ROLES = ["officer", "commander", "leader", "admin"];

export default function AdminShinyGraveyard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [staffChecking, setStaffChecking] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setNotice("");
    let query = supabase
      .from("shiny_graveyard_submissions")
      .select("id, user_id, pokemon_name, trainer_name, encounter_date, cause_of_loss, story, image_url, status, created_at")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      setNotice(`Could not load memorials: ${error.message}`);
      setEntries([]);
    } else {
      setEntries((data || []) as Entry[]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    let active = true;
    async function checkStaff() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) { setIsStaff(false); setStaffChecking(false); }
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (active) {
        setIsStaff(!error && STAFF_ROLES.includes(data?.role || ""));
        setStaffChecking(false);
      }
    }
    void checkStaff();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isStaff) void loadEntries();
  }, [isStaff, loadEntries]);

  async function changeStatus(entry: Entry, status: Status) {
    const verb = status === "approved" ? "approve" : "reject";
    if (!window.confirm(`${verb === "approve" ? "Approve" : "Reject"} ${entry.pokemon_name}'s memorial?`)) return;
    setBusyId(entry.id);
    setNotice("");
    const { error } = await supabase
      .from("shiny_graveyard_submissions")
      .update({ status })
      .eq("id", entry.id);
    if (error) {
      setNotice(`Could not ${verb} memorial: ${error.message}`);
    } else {
      setNotice(`${entry.pokemon_name}'s memorial was ${status}.`);
      await loadEntries();
    }
    setBusyId(null);
  }

  async function removeEntry(entry: Entry) {
    if (!window.confirm(`Permanently remove ${entry.pokemon_name}'s memorial? This cannot be undone.`)) return;
    setBusyId(entry.id);
    setNotice("");
    const { error } = await supabase
      .from("shiny_graveyard_submissions")
      .delete()
      .eq("id", entry.id);
    if (error) {
      setNotice(`Could not remove memorial: ${error.message}`);
    } else {
      setNotice(`${entry.pokemon_name}'s memorial was permanently removed.`);
      await loadEntries();
    }
    setBusyId(null);
  }

  if (staffChecking) return <main className="graveyard-admin"><p>Checking staff access…</p></main>;
  if (!isStaff) return (
    <main className="graveyard-admin">
      <header className="graveyard-admin-header"><p className="graveyard-admin-kicker">TEAM FATÉ • STAFF ONLY</p><h1>Graveyard Review</h1></header>
      <section className="graveyard-admin-empty"><h2>Access denied</h2><p>This page is only available to officers, commanders, leaders, and admins.</p></section>
    </main>
  );

  const counts = {
    pending: entries.filter((entry) => entry.status === "pending").length,
    approved: entries.filter((entry) => entry.status === "approved").length,
    rejected: entries.filter((entry) => entry.status === "rejected").length,
  };
  const visibleEntries = filter === "all" ? entries : entries.filter((entry) => entry.status === filter);

  return (
    <main className="graveyard-admin">
      <header className="graveyard-admin-header">
        <p className="graveyard-admin-kicker">TEAM FATÉ • STAFF ONLY</p>
        <h1>Shiny Graveyard Review</h1>
        <p>Honor the stories worth remembering. Review submissions, approve memorials, reject entries, or remove them permanently.</p>
      </header>

      <section className="graveyard-admin-summary" aria-label="Memorial status counts">
        <div><strong>{counts.pending}</strong><span>Pending review</span></div>
        <div><strong>{counts.approved}</strong><span>Approved</span></div>
        <div><strong>{counts.rejected}</strong><span>Rejected</span></div>
      </section>

      <div className="graveyard-admin-toolbar">
        <label>Show status
          <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All memorials</option>
          </select>
        </label>
        <button type="button" className="graveyard-admin-refresh" onClick={() => void loadEntries()} disabled={loading}>↻ Refresh</button>
      </div>

      {notice && <p className="graveyard-admin-notice" role="status">{notice}</p>}
      {loading ? <p className="graveyard-admin-empty">The mist is clearing…</p> : visibleEntries.length === 0 ? (
        <section className="graveyard-admin-empty"><span>🪦</span><h2>No memorials in this view</h2><p>There are no entries matching the selected status.</p></section>
      ) : (
        <section className="graveyard-review-list" aria-label="Memorial submissions">
          {visibleEntries.map((entry) => (
            <article className="graveyard-review-card" key={entry.id}>
              <div className="graveyard-review-art">
                {entry.image_url ? <a href={entry.image_url} target="_blank" rel="noreferrer"><img src={entry.image_url} alt={`${entry.pokemon_name} screenshot`} loading="lazy" /></a> : <span aria-hidden="true">☠</span>}
              </div>
              <div className="graveyard-review-content">
                <div className="graveyard-review-title-row"><div><p className="graveyard-admin-kicker">LOST SHINY MEMORIAL</p><h2>{entry.pokemon_name}</h2></div><span className={`graveyard-status-pill status-${entry.status}`}>{entry.status}</span></div>
                <p className="graveyard-review-trainer">Trainer: <strong>{entry.trainer_name}</strong></p>
                <p><strong>Cause:</strong> {entry.cause_of_loss}</p>
                {entry.encounter_date && <p><strong>Encounter date:</strong> {new Date(`${entry.encounter_date}T12:00:00`).toLocaleDateString()}</p>}
                {entry.story && <blockquote>{entry.story}</blockquote>}
                <p className="graveyard-review-submitted">Submitted {new Date(entry.created_at).toLocaleString()}</p>
                <div className="graveyard-review-actions">
                  {entry.status !== "approved" && <button type="button" className="approve" disabled={busyId === entry.id} onClick={() => void changeStatus(entry, "approved")}>✓ Approve</button>}
                  {entry.status !== "rejected" && <button type="button" className="reject" disabled={busyId === entry.id} onClick={() => void changeStatus(entry, "rejected")}>✕ Reject</button>}
                  <button type="button" className="remove" disabled={busyId === entry.id} onClick={() => void removeEntry(entry)}>Delete permanently</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
