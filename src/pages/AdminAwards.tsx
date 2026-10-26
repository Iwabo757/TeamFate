import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import "./team-fate-awards.css";
import "./AdminAwards.css";
import { supabase } from "../lib/supabase";

type Category = { id: string; name: string; description: string | null; display_order: number; voting_open: boolean };
type Nominee = { id: string; category_id: string; trainer_name: string; description: string | null; image_url: string | null };
type Ranking = { category_id: string; nominee_id: string; weighted_points: number; rank: number; review_status: string; denial_reason: string | null };
type AuditRow = { category_name: string; voter_name: string; nominee_name: string; weight: number };
type WinnerRow = { category_id: string; nominee_id: string; award_nominees: Nominee | Nominee[] | null };
const STAFF_ROLES = new Set(["admin", "leader", "commander", "officer"]);

export default function AdminAwards() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState("member");
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [winners, setWinners] = useState<Record<string, Nominee>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditCategory, setAuditCategory] = useState("");
  const [activeTab, setActiveTab] = useState<"ballots" | "results" | "audit">("ballots");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const role = profileRole.toLowerCase();
  const isStaff = STAFF_ROLES.has(role);
  const isAdmin = role === "admin";
  const nomineeMap = useMemo(() => new Map(nominees.map((n) => [n.id, n])), [nominees]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      setUserId(user?.id ?? null);
      if (!user) { setProfileRole("member"); setCategories([]); setNominees([]); setRankings([]); setWinners({}); return; }

      const [profileResult, categoryResult, nomineeResult, winnerResult] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("award_categories").select("id,name,description,display_order,voting_open").order("display_order"),
        supabase.from("award_nominees").select("id,category_id,trainer_name,description,image_url").eq("approved_for_voting", true).order("trainer_name"),
        supabase.from("award_winners").select("category_id,nominee_id,award_nominees(id,category_id,trainer_name,description,image_url)"),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (nomineeResult.error) throw nomineeResult.error;
      if (winnerResult.error) throw winnerResult.error;
      const profile = profileResult.data?.role ?? "member";
      setProfileRole(profile);
      setCategories(categoryResult.data ?? []);
      setNominees(nomineeResult.data ?? []);
      const winnerMap: Record<string, Nominee> = {};
      ((winnerResult.data ?? []) as unknown as WinnerRow[]).forEach((row) => {
        const related = Array.isArray(row.award_nominees) ? row.award_nominees[0] : row.award_nominees;
        if (related) winnerMap[row.category_id] = related;
      });
      setWinners(winnerMap);
      if (STAFF_ROLES.has(profile.toLowerCase())) {
        const { data, error: rankingError } = await supabase.rpc("get_award_review_rankings");
        if (rankingError) throw rankingError;
        setRankings((data ?? []) as Ranking[]);
      } else setRankings([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Award management could not be loaded.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function setVotingStatus(category: Category) {
    const open = !category.voting_open;
    const confirmation = window.confirm(`${open ? "Open" : "Close"} voting for “${category.name}”?`);
    if (!confirmation) return;
    setBusyId(category.id); setError(""); setNotice("");
    try {
      const { error: rpcError } = await supabase.rpc("set_award_voting_status", { p_category_id: category.id, p_voting_open: open });
      if (rpcError) throw rpcError;
      setNotice(`${category.name}: voting is now ${open ? "open" : "closed"}.`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Voting status could not be changed."); }
    finally { setBusyId(""); }
  }

  async function reviewCandidate(categoryId: string, nomineeId: string, decision: "approve" | "deny") {
    let reason: string | null = null;
    if (decision === "deny") {
      reason = window.prompt("Enter a reason for denying this candidate:")?.trim() || null;
      if (!reason) { setError("A reason is required to deny a candidate."); return; }
    }
    const nominee = nomineeMap.get(nomineeId);
    const category = categories.find((item) => item.id === categoryId);
    if (decision === "approve" && !window.confirm(`Publish ${nominee?.trainer_name ?? "this trainer"} as winner of ${category?.name ?? "this award"}?`)) return;
    setBusyId(`${categoryId}:${nomineeId}`); setError(""); setNotice("");
    try {
      const { error: rpcError } = await supabase.rpc("review_award_candidate", {
        p_category_id: categoryId, p_nominee_id: nomineeId, p_decision: decision, p_reason: reason,
      });
      if (rpcError) throw rpcError;
      setNotice(decision === "approve" ? "Winner approved and published." : "Candidate denied. The next eligible candidate can be reviewed.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "The review action failed."); }
    finally { setBusyId(""); }
  }

  async function loadAudit() {
    if (!isAdmin) { setError("Administrator access is required for ballot audits."); return; }
    setError("");
    const { data, error: auditError } = await supabase.rpc("admin_get_award_ballot_audit", { p_category_id: auditCategory || null });
    if (auditError) { setError(auditError.message); return; }
    setAudit((data ?? []) as AuditRow[]);
  }

  if (!loading && (!userId || !isStaff)) return <Navigate to="/awards" replace />;

  return <main className="fate-awards-page admin-awards-page">
    <div className="awards-shade" />
    <div className="awards-shell admin-awards-shell">
      <header className="awards-hero admin-awards-hero">
        <div className="awards-eyebrow">STAFF CONTROL CENTER</div>
        <h1>AWARDS <span>MANAGEMENT</span></h1>
        <p>Manage voting windows, review final standings, and publish the official Team FATÉ Anniversary Award winners.</p>
        <div className="awards-hero-actions"><Link className="outline-gold-button" to="/awards">← Back to Awards</Link><button className="outline-gold-button" type="button" onClick={() => void load()} disabled={loading}>Refresh Data</button></div>
      </header>

      {(error || notice) && <div className={`awards-alert ${error ? "error" : "success"}`} role="status">{error || notice}</div>}
      <nav className="admin-awards-tabs" aria-label="Award management sections">
        <button type="button" className={activeTab === "ballots" ? "active" : ""} onClick={() => setActiveTab("ballots")}>Ballot Management</button>
        <button type="button" className={activeTab === "results" ? "active" : ""} onClick={() => setActiveTab("results")}>Award Status & Results</button>
        {isAdmin && <button type="button" className={activeTab === "audit" ? "active" : ""} onClick={() => setActiveTab("audit")}>Admin Audit</button>}
      </nav>

      {loading ? <section className="awards-panel"><p>Loading award management…</p></section> : <>
        {activeTab === "ballots" && <section className="awards-panel">
          <div className="section-head"><div><span className="section-kicker">VOTING CONTROLS</span><h2>Manage Ballots</h2></div><span className="section-icon">🗳️</span></div>
          <p className="section-description">Open or close voting independently for each award category. Closing a ballot prevents additional votes from being submitted.</p>
          <div className="admin-award-list">{categories.map((category) => {
            const winner = winners[category.id]; const busy = busyId === category.id;
            return <article className="admin-award-row" key={category.id}>
              <div className="admin-award-row-main"><span className={`admin-status-pill ${category.voting_open ? "is-open" : "is-closed"}`}><span />{category.voting_open ? "Voting Open" : "Voting Closed"}</span><h3>{category.name}</h3><p>{category.description ?? "Anniversary award category."}</p><small>{winner ? `Published winner: ${winner.trainer_name}` : "Winner not published"}</small></div>
              <button type="button" className={category.voting_open ? "outline-gold-button" : "gold-button"} disabled={busy} onClick={() => void setVotingStatus(category)}>{busy ? "Saving…" : category.voting_open ? "Close Voting" : "Open Voting"}</button>
            </article>;
          })}</div>
        </section>}

        {activeTab === "results" && <section className="awards-panel">
          <div className="section-head"><div><span className="section-kicker">FINAL REVIEW</span><h2>Award Status & Results</h2></div><span className="section-icon">🏆</span></div>
          <p className="section-description">Review weighted rankings, then approve the eligible top candidate to publish the official winner. Close voting before finalizing an award. Ties should be resolved by staff before publishing.</p>
          <div className="admin-award-list">{categories.map((category) => {
            const rows = rankings.filter((row) => row.category_id === category.id);
            const winner = winners[category.id];
            const topRank = rows.length ? Math.min(...rows.map((row) => Number(row.rank))) : 0;
            const tiedTop = topRank > 0 && rows.filter((row) => Number(row.rank) === topRank && row.review_status !== "denied").length > 1;
            return <article className="admin-result-card" key={category.id}>
              <div className="admin-result-heading"><div><h3>{category.name}</h3><p>{category.voting_open ? "Close voting before publishing a winner." : "Voting closed; results can be reviewed."}</p></div><span className={`admin-status-pill ${winner ? "is-winner" : category.voting_open ? "is-open" : "is-closed"}`}>{winner ? "Winner Published" : category.voting_open ? "Voting Open" : "Awaiting Finalization"}</span></div>
              {winner && <div className="admin-published-winner"><span>🏆</span><div><small>OFFICIAL WINNER</small><strong>{winner.trainer_name}</strong></div></div>}
              {tiedTop && !winner && <div className="admin-warning">The top rank is tied. Resolve the tie before approving a winner.</div>}
              {!rows.length ? <p className="admin-empty">No ranking data available. Check that eligible nominees and the review-ranking RPC are configured.</p> : <div className="admin-ranking-table"><div className="admin-ranking-head"><span>Rank</span><span>Trainer</span><span>Points</span><span>Review status</span><span>Action</span></div>
                {rows.slice(0, 12).map((row) => { const nominee = nomineeMap.get(row.nominee_id); const rowBusy = busyId === `${category.id}:${row.nominee_id}`; const isTop = Number(row.rank) === topRank; const canApprove = !winner && !category.voting_open && !tiedTop && isTop && row.review_status !== "denied";
                  return <div className="admin-ranking-row" key={row.nominee_id}><span className="admin-rank">#{row.rank}</span><span className="admin-trainer-name">{nominee?.trainer_name ?? "Unknown trainer"}</span><span className="admin-points">{row.weighted_points}</span><span><span className={`review-status status-${row.review_status}`}>{row.review_status}</span>{row.denial_reason && <small className="admin-denial-reason">{row.denial_reason}</small>}</span><span className="admin-review-actions">{canApprove && <><button className="gold-button" type="button" disabled={Boolean(busyId)} onClick={() => void reviewCandidate(category.id, row.nominee_id, "approve")}>{rowBusy ? "Saving…" : "Publish Winner"}</button><button className="outline-gold-button" type="button" disabled={Boolean(busyId)} onClick={() => void reviewCandidate(category.id, row.nominee_id, "deny")}>Deny</button></>}{!canApprove && !winner && isTop && !tiedTop && row.review_status !== "denied" && <small>{category.voting_open ? "Ballot open" : "Not available"}</small>}</span></div>;
                })}</div>}
            </article>;
          })}</div>
        </section>}

        {activeTab === "audit" && isAdmin && <section className="awards-panel">
          <div className="section-head"><div><span className="section-kicker">ADMINISTRATOR ONLY</span><h2>Ballot Audit</h2></div><span className="section-icon">🔒</span></div>
          <p className="section-description">This sensitive audit can reveal voter identities. Keep access limited to administrators and use it only when needed to investigate voting integrity.</p>
          <div className="admin-audit-controls"><label htmlFor="audit-category">Award category</label><select id="audit-category" value={auditCategory} onChange={(event) => setAuditCategory(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" className="gold-button" onClick={() => void loadAudit()}>Load Audit</button></div>
          {audit.length > 0 ? <div className="admin-audit-table"><div className="admin-audit-row admin-audit-header"><span>Category</span><span>Voter</span><span>Selected trainer</span><span>Weight</span></div>{audit.map((row, index) => <div className="admin-audit-row" key={`${row.category_name}-${row.voter_name}-${index}`}><span>{row.category_name}</span><span>{row.voter_name}</span><span>{row.nominee_name}</span><span>{row.weight}</span></div>)}</div> : <p className="admin-empty">No audit rows loaded. Select a category if needed, then choose Load Audit.</p>}
        </section>}
      </>}
      <footer className="awards-footer"><span>TEAM FATÉ</span><p>One team. One legacy. Many legends.</p><span className="footer-year">STAFF AWARDS CONTROL CENTER</span></footer>
    </div>
  </main>;
}
