
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import "./team-fate-awards.css";
import "./AdminAwards.css";
import { supabase } from "../lib/supabase";

type Category = {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  voting_open: boolean;
};

type Nominee = {
  id: string;
  category_id: string;
  trainer_name: string;
  description: string | null;
  image_url: string | null;
};

type Ranking = {
  category_id: string;
  nominee_id: string;
  weighted_points: number;
  rank: number;
  review_status: string;
  denial_reason: string | null;
};

type AuditRow = {
  vote_id: string;
  category_id: string;
  voter_id: string;
  nominee_id: string;
  category_name: string;
  voter_name: string;
  nominee_name: string;
  vote_weight: number;
  vote_created_at: string;
};

type WinnerRow = {
  category_id: string;
  nominee_id: string;
  award_nominees: Nominee | Nominee[] | null;
};

type HeaderSettings = {
  eyebrow: string;
  title: string;
  description: string;
  year_label: string;
};

type Tab = "ballots" | "results" | "audit" | "header";

const DEFAULT_HEADER: HeaderSettings = {
  eyebrow: "ONE YEAR. ONE TEAM. COUNTLESS MEMORIES.",
  title: "TEAM FATÉ ANNIVERSARY AWARDS",
  description: "Celebrating the trainers, teammates, and unforgettable moments that made our first year legendary.",
  year_label: "2026 · FIRST ANNIVERSARY",
};

const STAFF_ROLES = new Set([
  "admin",
  "leader",
  "commander",
  "officer",
  "staff",
]);

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export default function AdminAwards() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState("member");

  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [winners, setWinners] = useState<Record<string, Nominee>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [headerSettings, setHeaderSettings] = useState<HeaderSettings>(DEFAULT_HEADER);
  const [savingHeader, setSavingHeader] = useState(false);

  const [auditCategory, setAuditCategory] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("ballots");

  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const role = profileRole.trim().toLowerCase();
  const isStaff = STAFF_ROLES.has(role);
  const isAdmin = role === "admin";

  const nomineeMap = useMemo(
    () => new Map(nominees.map((nominee) => [nominee.id, nominee])),
    [nominees],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData.user;
      setUserId(user?.id ?? null);

      if (!user) {
        setProfileRole("member");
        setCategories([]);
        setNominees([]);
        setRankings([]);
        setWinners({});
        setAudit([]);
        return;
      }

      const [
        profileResult,
        categoryResult,
        nomineeResult,
        winnerResult,
        headerResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("award_categories")
          .select("id,name,description,display_order,voting_open")
          .order("display_order"),

        supabase
          .from("award_nominees")
          .select("id,category_id,trainer_name,description,image_url")
          .eq("approved_for_voting", true)
          .order("trainer_name"),

        supabase
          .from("award_winners")
          .select(
            "category_id,nominee_id,award_nominees(id,category_id,trainer_name,description,image_url)",
          ),
        supabase
          .from("award_page_settings")
          .select("eyebrow,title,description,year_label")
          .eq("id", 1)
          .maybeSingle(),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (nomineeResult.error) throw nomineeResult.error;
      if (winnerResult.error) throw winnerResult.error;
      if (headerResult.error) throw headerResult.error;

      setHeaderSettings({ ...DEFAULT_HEADER, ...(headerResult.data ?? {}) });
      const profile = profileResult.data?.role?.trim() || "member";
      setProfileRole(profile);

      const loadedCategories = categoryResult.data ?? [];
      const loadedNominees = nomineeResult.data ?? [];

      setCategories(loadedCategories);
      setNominees(loadedNominees);

      const winnerMap: Record<string, Nominee> = {};

      ((winnerResult.data ?? []) as unknown as WinnerRow[]).forEach(
        (row) => {
          const related = Array.isArray(row.award_nominees)
            ? row.award_nominees[0]
            : row.award_nominees;

          if (related) {
            winnerMap[row.category_id] = related;
          }
        },
      );

      setWinners(winnerMap);

      if (STAFF_ROLES.has(profile.toLowerCase())) {
        const { data, error: rankingError } = await supabase.rpc(
          "get_award_review_rankings",
        );

        if (rankingError) throw rankingError;

        setRankings((data ?? []) as Ranking[]);
      } else {
        setRankings([]);
      }
    } catch (err) {
      setError(
        getErrorMessage(err, "Award management could not be loaded."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setVotingStatus(category: Category) {
    const open = !category.voting_open;

    const confirmed = window.confirm(
      `${open ? "Open" : "Close"} voting for "${category.name}"?`,
    );

    if (!confirmed) return;

    setBusyId(category.id);
    setError("");
    setNotice("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "set_award_voting_status",
        {
          p_category_id: category.id,
          p_voting_open: open,
        },
      );

      if (rpcError) throw rpcError;

      setNotice(
        `${category.name}: voting is now ${open ? "open" : "closed"}.`,
      );

      await load();
    } catch (err) {
      setError(
        getErrorMessage(err, "Voting status could not be changed."),
      );
    } finally {
      setBusyId("");
    }
  }

  async function reviewCandidate(
    categoryId: string,
    nomineeId: string,
    decision: "approve" | "deny",
  ) {
    const nominee = nomineeMap.get(nomineeId);
    const category = categories.find((item) => item.id === categoryId);

    let reason: string | null = null;

    if (decision === "deny") {
      reason =
        window.prompt("Enter a reason for denying this candidate:")?.trim() ||
        null;

      if (!reason) {
        setError("A reason is required to deny a candidate.");
        return;
      }
    }

    if (
      decision === "approve" &&
      !window.confirm(
        `Publish ${nominee?.trainer_name ?? "this trainer"} as winner of ${category?.name ?? "this award"}?`,
      )
    ) {
      return;
    }

    setBusyId(`${categoryId}:${nomineeId}`);
    setError("");
    setNotice("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "review_award_candidate",
        {
          p_category_id: categoryId,
          p_nominee_id: nomineeId,
          p_decision: decision,
          p_reason: reason,
        },
      );

      if (rpcError) throw rpcError;

      setNotice(
        decision === "approve"
          ? "Winner approved and published."
          : "Candidate denied. The next eligible candidate can be reviewed.",
      );

      await load();
    } catch (err) {
      setError(getErrorMessage(err, "The review action failed."));
    } finally {
      setBusyId("");
    }
  }

  async function loadAudit() {
    if (!isAdmin) {
      setError("Administrator access is required for ballot audits.");
      return;
    }

    setAuditLoading(true);
    setError("");
    setNotice("");

    try {
      const { data, error: auditError } = await supabase.rpc(
        "admin_get_award_votes",
        {
          p_category_id: auditCategory || null,
        },
      );

      if (auditError) throw auditError;

      setAudit((data ?? []) as AuditRow[]);
    } catch (err) {
      setError(
        getErrorMessage(err, "The vote audit could not be loaded."),
      );
      setAudit([]);
    } finally {
      setAuditLoading(false);
    }
  }

  async function deleteVote(vote: AuditRow) {
    if (!isAdmin) {
      setError("Administrator access is required to delete votes.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${vote.voter_name}'s vote for "${vote.nominee_name}" in "${vote.category_name}"?\n\nThis cannot be undone.`,
    );

    if (!confirmed) return;

    setBusyId(vote.vote_id);
    setError("");
    setNotice("");

    try {
      const { error: deleteError } = await supabase.rpc(
        "admin_delete_award_vote",
        {
          p_vote_id: vote.vote_id,
        },
      );

      if (deleteError) throw deleteError;

      setNotice(
        `Deleted ${vote.voter_name}'s vote for ${vote.nominee_name}.`,
      );

      await loadAudit();
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "The vote could not be deleted."));
    } finally {
      setBusyId("");
    }
  }

  async function saveHeaderSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) {
      setError("Administrator access is required to edit the public header.");
      return;
    }

    setSavingHeader(true);
    setError("");
    setNotice("");
    try {
      const { error: saveError } = await supabase
        .from("award_page_settings")
        .upsert({ id: 1, ...headerSettings, updated_at: new Date().toISOString() });
      if (saveError) throw saveError;
      setNotice("Public awards header saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Header settings could not be saved."));
    } finally {
      setSavingHeader(false);
    }
  }

  if (!loading && (!userId || !isStaff)) {
    return <Navigate to="/awards" replace />;
  }

  return (
    <main className="fate-awards-page admin-awards-page">
      <div className="awards-shade" />

      <div className="awards-shell admin-awards-shell">
        <header className="awards-hero admin-awards-hero">
          <div className="awards-eyebrow">STAFF CONTROL CENTER</div>

          <h1>
            AWARDS <span>MANAGEMENT</span>
          </h1>

          <p>
            Manage voting windows, review final standings, and publish the
            official Team FATÉ Anniversary Award winners.
          </p>

          <div className="awards-hero-actions">
            <Link className="outline-gold-button" to="/awards">
              ← Back to Awards
            </Link>

            <button
              className="outline-gold-button"
              type="button"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh Data"}
            </button>
          </div>
        </header>

        {(error || notice) && (
          <div
            className={`awards-alert ${error ? "error" : "success"}`}
            role={error ? "alert" : "status"}
          >
            {error || notice}
          </div>
        )}

        <nav
          className="admin-awards-tabs"
          aria-label="Award management sections"
        >
          <button
            type="button"
            className={activeTab === "ballots" ? "active" : ""}
            onClick={() => setActiveTab("ballots")}
          >
            Ballot Management
          </button>

          <button
            type="button"
            className={activeTab === "results" ? "active" : ""}
            onClick={() => setActiveTab("results")}
          >
            Award Status &amp; Results
          </button>

          {isAdmin && (
            <button
              type="button"
              className={activeTab === "audit" ? "active" : ""}
              onClick={() => setActiveTab("audit")}
            >
              Admin Audit
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className={activeTab === "header" ? "active" : ""}
              onClick={() => setActiveTab("header")}
            >
              Public Header
            </button>
          )}
        </nav>

        {loading ? (
          <section className="awards-panel">
            <p>Loading award management…</p>
          </section>
        ) : (
          <>
            {activeTab === "ballots" && (
              <section className="awards-panel">
                <div className="section-head">
                  <div>
                    <span className="section-kicker">VOTING CONTROLS</span>
                    <h2>Manage Ballots</h2>
                  </div>
                  <span className="section-icon">🗳️</span>
                </div>

                <p className="section-description">
                  Open or close voting independently for each award category.
                  Closing a ballot prevents additional votes from being
                  submitted.
                </p>

                <div className="admin-award-list">
                  {categories.map((category) => {
                    const winner = winners[category.id];
                    const busy = busyId === category.id;

                    return (
                      <article
                        className="admin-award-row"
                        key={category.id}
                      >
                        <div className="admin-award-row-main">
                          <span
                            className={`admin-status-pill ${
                              category.voting_open ? "is-open" : "is-closed"
                            }`}
                          >
                            <span />
                            {category.voting_open
                              ? "Voting Open"
                              : "Voting Closed"}
                          </span>

                          <h3>{category.name}</h3>

                          <p>
                            {category.description ??
                              "Anniversary award category."}
                          </p>

                          <small>
                            {winner
                              ? `Published winner: ${winner.trainer_name}`
                              : "Winner not published"}
                          </small>
                        </div>

                        <button
                          type="button"
                          className={
                            category.voting_open
                              ? "outline-gold-button"
                              : "gold-button"
                          }
                          disabled={Boolean(busyId)}
                          onClick={() => void setVotingStatus(category)}
                        >
                          {busy
                            ? "Saving…"
                            : category.voting_open
                              ? "Close Voting"
                              : "Open Voting"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === "results" && (
              <section className="awards-panel">
                <div className="section-head">
                  <div>
                    <span className="section-kicker">FINAL REVIEW</span>
                    <h2>Award Status &amp; Results</h2>
                  </div>
                  <span className="section-icon">🏆</span>
                </div>

                <p className="section-description">
                  Review weighted rankings, then approve the eligible top
                  candidate to publish the official winner. Close voting
                  before finalizing an award. Ties must be resolved by staff.
                </p>

                <div className="admin-award-list">
                  {categories.map((category) => {
                    const rows = rankings.filter(
                      (row) => row.category_id === category.id,
                    );

                    const winner = winners[category.id];

                    const topRank = rows.length
                      ? Math.min(...rows.map((row) => Number(row.rank)))
                      : 0;

                    const tiedTop =
                      topRank > 0 &&
                      rows.filter(
                        (row) =>
                          Number(row.rank) === topRank &&
                          row.review_status !== "denied",
                      ).length > 1;

                    return (
                      <article
                        className="admin-result-card"
                        key={category.id}
                      >
                        <div className="admin-result-heading">
                          <div>
                            <h3>{category.name}</h3>
                            <p>
                              {category.voting_open
                                ? "Close voting before publishing a winner."
                                : "Voting closed; results can be reviewed."}
                            </p>
                          </div>

                          <span
                            className={`admin-status-pill ${
                              winner
                                ? "is-winner"
                                : category.voting_open
                                  ? "is-open"
                                  : "is-closed"
                            }`}
                          >
                            {winner
                              ? "Winner Published"
                              : category.voting_open
                                ? "Voting Open"
                                : "Awaiting Finalization"}
                          </span>
                        </div>

                        {winner && (
                          <div className="admin-published-winner">
                            <span>🏆</span>
                            <div>
                              <small>OFFICIAL WINNER</small>
                              <strong>{winner.trainer_name}</strong>
                            </div>
                          </div>
                        )}

                        {tiedTop && !winner && (
                          <div className="admin-warning">
                            The top rank is tied. Resolve the tie before
                            approving a winner.
                          </div>
                        )}

                        {!rows.length ? (
                          <p className="admin-empty">
                            No ranking data available. Check the ranking RPC
                            and eligible nominees.
                          </p>
                        ) : (
                          <div className="admin-ranking-table">
                            <div className="admin-ranking-head">
                              <span>Rank</span>
                              <span>Trainer</span>
                              <span>Points</span>
                              <span>Review status</span>
                              <span>Action</span>
                            </div>

                            {rows.slice(0, 12).map((row) => {
                              const nominee = nomineeMap.get(row.nominee_id);
                              const rowBusy =
                                busyId === `${category.id}:${row.nominee_id}`;
                              const isTop = Number(row.rank) === topRank;

                              const canApprove =
                                !winner &&
                                !category.voting_open &&
                                !tiedTop &&
                                isTop &&
                                row.review_status !== "denied";

                              return (
                                <div
                                  className="admin-ranking-row"
                                  key={row.nominee_id}
                                >
                                  <span className="admin-rank">
                                    #{row.rank}
                                  </span>

                                  <span className="admin-trainer-name">
                                    {nominee?.trainer_name ??
                                      "Unknown trainer"}
                                  </span>

                                  <span className="admin-points">
                                    {row.weighted_points}
                                  </span>

                                  <span>
                                    <span
                                      className={`review-status status-${row.review_status}`}
                                    >
                                      {row.review_status}
                                    </span>

                                    {row.denial_reason && (
                                      <small className="admin-denial-reason">
                                        {row.denial_reason}
                                      </small>
                                    )}
                                  </span>

                                  <span className="admin-review-actions">
                                    {canApprove && (
                                      <>
                                        <button
                                          className="gold-button"
                                          type="button"
                                          disabled={Boolean(busyId)}
                                          onClick={() =>
                                            void reviewCandidate(
                                              category.id,
                                              row.nominee_id,
                                              "approve",
                                            )
                                          }
                                        >
                                          {rowBusy
                                            ? "Saving…"
                                            : "Publish Winner"}
                                        </button>

                                        <button
                                          className="outline-gold-button"
                                          type="button"
                                          disabled={Boolean(busyId)}
                                          onClick={() =>
                                            void reviewCandidate(
                                              category.id,
                                              row.nominee_id,
                                              "deny",
                                            )
                                          }
                                        >
                                          Deny
                                        </button>
                                      </>
                                    )}

                                    {!canApprove &&
                                      !winner &&
                                      isTop &&
                                      !tiedTop &&
                                      row.review_status !== "denied" && (
                                        <small>
                                          {category.voting_open
                                            ? "Ballot open"
                                            : "Not available"}
                                        </small>
                                      )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {activeTab === "header" && isAdmin && (
              <section className="awards-panel">
                <div className="section-head">
                  <div>
                    <span className="section-kicker">PUBLIC PAGE CUSTOMIZATION</span>
                    <h2>Edit Awards Header</h2>
                  </div>
                  <span className="section-icon">✍️</span>
                </div>
                <p className="section-description">
                  Changes here appear on the public awards page. The duplicate top-row navigation buttons have been removed.
                </p>
                <form className="awards-form" onSubmit={(event) => void saveHeaderSettings(event)}>
                  <div className="vote-category">
                    <label htmlFor="header-eyebrow">Small heading</label>
                    <input id="header-eyebrow" value={headerSettings.eyebrow} maxLength={120}
                      onChange={(event) => setHeaderSettings((s) => ({ ...s, eyebrow: event.target.value }))} required />
                  </div>
                  <div className="vote-category">
                    <label htmlFor="header-title">Main title</label>
                    <input id="header-title" value={headerSettings.title} maxLength={160}
                      onChange={(event) => setHeaderSettings((s) => ({ ...s, title: event.target.value }))} required />
                  </div>
                  <div className="vote-category">
                    <label htmlFor="header-description">Description</label>
                    <textarea id="header-description" value={headerSettings.description} maxLength={500} rows={3}
                      onChange={(event) => setHeaderSettings((s) => ({ ...s, description: event.target.value }))} required />
                  </div>
                  <div className="vote-category">
                    <label htmlFor="header-year">Anniversary label</label>
                    <input id="header-year" value={headerSettings.year_label} maxLength={100}
                      onChange={(event) => setHeaderSettings((s) => ({ ...s, year_label: event.target.value }))} required />
                  </div>
                  <button className="gold-button" type="submit" disabled={savingHeader}>
                    {savingHeader ? "Saving…" : "Save Public Header"}
                  </button>
                </form>
              </section>
            )}

            {activeTab === "audit" && isAdmin && (
              <section className="awards-panel">
                <div className="section-head">
                  <div>
                    <span className="section-kicker">
                      ADMINISTRATOR ONLY
                    </span>
                    <h2>Ballot Audit</h2>
                  </div>
                  <span className="section-icon">🔒</span>
                </div>

                <p className="section-description">
                  Review individual votes and delete a specific vote when
                  necessary. Deleting a vote cannot be undone.
                </p>

                <div className="admin-audit-controls">
                  <label htmlFor="audit-category">Award category</label>

                  <select
                    id="audit-category"
                    value={auditCategory}
                    onChange={(event) =>
                      setAuditCategory(event.target.value)
                    }
                  >
                    <option value="">All categories</option>

                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="gold-button"
                    onClick={() => void loadAudit()}
                    disabled={auditLoading || Boolean(busyId)}
                  >
                    {auditLoading ? "Loading…" : "Load Votes"}
                  </button>
                </div>

                {auditLoading ? (
                  <p className="admin-empty">Loading votes…</p>
                ) : audit.length > 0 ? (
                  <div className="admin-audit-table">
                    <div className="admin-audit-row admin-audit-header">
                      <span>Category</span>
                      <span>Voter</span>
                      <span>Selected trainer</span>
                      <span>Weight</span>
                      <span>Action</span>
                    </div>

                    {audit.map((vote) => (
                      <div
                        className="admin-audit-row"
                        key={vote.vote_id}
                      >
                        <span>{vote.category_name}</span>
                        <span>{vote.voter_name}</span>
                        <span>{vote.nominee_name}</span>
                        <span>{vote.vote_weight}</span>

                        <span>
                          <button
                            type="button"
                            className="outline-gold-button"
                            disabled={Boolean(busyId)}
                            onClick={() => void deleteVote(vote)}
                          >
                            {busyId === vote.vote_id
                              ? "Deleting…"
                              : "Delete Vote"}
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-empty">
                    {audit.length === 0
                      ? "No votes loaded. Choose a category if needed, then click Load Votes."
                      : "No votes found."}
                  </p>
                )}
              </section>
            )}
          </>
        )}

        <footer className="awards-footer">
          <span>TEAM FATÉ</span>
          <p>One team. One legacy. Many legends.</p>
          <span className="footer-year">
            STAFF AWARDS CONTROL CENTER
          </span>
        </footer>
      </div>
    </main>
  );
}
