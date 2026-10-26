import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import "./team-fate-awards.css";
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
type WinnerRow = {
  category_id: string;
  nominee_id: string;
  award_nominees: Nominee | Nominee[] | null;
};
type VoteRow = { category_id: string; nominee_id: string };

const AWARD_ICONS = ["👑", "⚔️", "🤝", "🌟"];
const AWARD_ARTWORK = [
  "/images/awards/mvp-award.png",
  "/images/awards/competitive-player-award.png",
  "/images/awards/teammate-award.png",
  "/images/awards/rising-star-award.png",
];
const STAFF_ROLES = new Set(["admin", "leader", "commander", "officer"]);

export default function TeamFateAwardsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState("member");
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [winners, setWinners] = useState<Record<string, Nominee>>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [search, setSearch] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"overview" | "vote" | "hall">("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isStaff = STAFF_ROLES.has(profileRole.toLowerCase());

  const loadAwards = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      setUserId(user?.id ?? null);

      if (!user) {
        setProfileRole("member");
        setCategories([]);
        setNominees([]);
        setVotes({});
        setWinners({});
        return;
      }

      const [profileResult, categoryResult, nomineeResult, voteResult, winnerResult] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase.from("award_categories").select("id,name,description,display_order,voting_open").order("display_order"),
        supabase.from("award_nominees").select("id,category_id,trainer_name,description,image_url").eq("approved_for_voting", true).order("trainer_name"),
        supabase.rpc("get_my_award_votes"),
        supabase.from("award_winners").select("category_id,nominee_id,award_nominees(id,category_id,trainer_name,description,image_url)"),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (nomineeResult.error) throw nomineeResult.error;
      if (voteResult.error) throw voteResult.error;
      if (winnerResult.error) throw winnerResult.error;

      setProfileRole(profileResult.data?.role ?? "member");
      setCategories(categoryResult.data ?? []);
      setNominees(nomineeResult.data ?? []);
      const voteMap: Record<string, string> = {};
      ((voteResult.data ?? []) as VoteRow[]).forEach((vote) => { voteMap[vote.category_id] = vote.nominee_id; });
      setVotes(voteMap);
      const winnerMap: Record<string, Nominee> = {};
      ((winnerResult.data ?? []) as unknown as WinnerRow[]).forEach((row) => {
        const related = Array.isArray(row.award_nominees) ? row.award_nominees[0] : row.award_nominees;
        if (related) winnerMap[row.category_id] = related;
      });
      setWinners(winnerMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Awards could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  // The awards stylesheet is scoped to this body class. Without it, the page
  // falls back to the site's default styles instead of the anniversary design.
  useEffect(() => {
    document.body.classList.add("team-fate-awards-theme");
    return () => {
      document.body.classList.remove("team-fate-awards-theme");
    };
  }, []);

  useEffect(() => { void loadAwards(); }, [loadAwards]);

  async function submitBallot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!userId) { setError("Sign in with your Team FATÉ account to vote."); return; }
    const pending = categories.filter((category) => category.voting_open && !votes[category.id] && choices[category.id]);
    if (!pending.length) { setError("Choose a trainer in at least one open category."); return; }
    setBusy(true);
    try {
      for (const category of pending) {
        const { error: voteError } = await supabase.rpc("cast_award_vote", {
          p_category_id: category.id,
          p_nominee_id: choices[category.id],
        });
        if (voteError) throw voteError;
      }
      setChoices({});
      setNotice("Your vote has been recorded.");
      await loadAwards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your vote could not be submitted.");
      await loadAwards();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="fate-awards-page">
      <div className="awards-shade" />
      <div className="awards-shell">
        <header className="awards-hero">
          <div className="awards-eyebrow">ONE YEAR. ONE TEAM. COUNTLESS MEMORIES.</div>
          <h1>TEAM FATÉ <span>ANNIVERSARY AWARDS</span></h1>
          <p>Celebrating the trainers, teammates, and unforgettable moments that made our first year legendary.</p>
          <div className="awards-hero-year"><span className="awards-hero-year-line" /><span>2026 · FIRST ANNIVERSARY</span><span className="awards-hero-year-line" /></div>
          <div className="awards-hero-actions">
            <button className="gold-button" type="button" onClick={() => setActiveTab("vote")}>Cast Your Vote</button>
            <button className="outline-gold-button" type="button" onClick={() => setActiveTab("hall")}>View Hall of Fame</button>
            {isStaff && <Link className="outline-gold-button" to="/awards/manage">Manage Awards</Link>}
          </div>
        </header>

        <nav className="awards-tabs" aria-label="Awards sections">
          <button type="button" className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button>
          <button type="button" className={activeTab === "vote" ? "active" : ""} onClick={() => setActiveTab("vote")}>Voting</button>
          <button type="button" className={activeTab === "hall" ? "active" : ""} onClick={() => setActiveTab("hall")}>Hall of Fame</button>
        </nav>

        {(error || notice) && <div className={`awards-alert ${error ? "error" : "success"}`} role="status">{error || notice}</div>}
        {loading ? <section className="awards-panel"><p>Loading Team FATÉ Awards…</p></section> : !userId ? (
          <section className="awards-panel"><div className="awards-empty-state"><span className="empty-state-icon">🔐</span><h2>Sign-in required</h2><p>Sign in to your Team FATÉ account to view the ballot and cast a vote.</p></div></section>
        ) : categories.length === 0 ? (
          <section className="awards-panel"><div className="awards-empty-state"><h2>Awards are being prepared</h2><p>Award categories could not be found.</p></div></section>
        ) : (
          <>
            {activeTab === "overview" && <>
              <section className="awards-panel">
                <div className="section-head"><div><span className="section-kicker">FOUR WAYS TO BE LEGENDARY</span><h2>The Anniversary Awards</h2></div></div>
                <div className="award-category-grid">
                  {categories.map((category, index) => {
                    const winner = winners[category.id];
                    return <article className="award-category-card" key={category.id}>
                      <div className="award-card-art">
                        <img
                          src={AWARD_ARTWORK[index] ?? AWARD_ARTWORK[0]}
                          alt={`${category.name} award artwork`}
                          loading="lazy"
                        />
                      </div>
                      <div className="award-card-content"><span className="award-subtitle">{index === 0 ? "The MVP Award" : index === 1 ? "The Battle Ace" : index === 2 ? "The Heart of FATÉ" : "The Next Legend"}</span>
                        <h3>{category.name}</h3><p>{category.description ?? "Celebrating an outstanding Team FATÉ member."}</p>
                        <p className="form-help">{winner ? `Winner: ${winner.trainer_name}` : category.voting_open ? "Voting is open." : "Voting is currently closed."}</p>
                        <button className="outline-gold-button" type="button" onClick={() => setActiveTab("vote")}>View Ballot</button>
                      </div>
                    </article>;
                  })}
                </div>
              </section>
              <section className="awards-panel winner-reveal-section"><div className="section-head"><div><span className="section-kicker">THE LEGENDS WILL BE REMEMBERED</span><h2>Winner Reveal</h2></div></div>
                <div className="winner-grid">{categories.map((category, index) => { const winner = winners[category.id]; return <article className={`winner-card ${winner ? "" : "winner-pending"}`} key={category.id}>
                  <div className="winner-medal">
                    <img
                      src={AWARD_ARTWORK[index] ?? AWARD_ARTWORK[0]}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                    />
                  </div><span className="winner-award-label">{category.name}</span>
                  {winner?.image_url ? <img className="winner-avatar" src={winner.image_url} alt={`${winner.trainer_name} avatar`} loading="lazy" /> : <div className="winner-placeholder"><span>{winner ? "🏆" : "?"}</span></div>}
                  <p className="winner-name">{winner?.trainer_name ?? "Winner to be revealed"}</p><p className="winner-message">{winner?.description ?? "Official results will appear here once verified."}</p>
                </article>; })}</div>
              </section>
            </>}

            {activeTab === "vote" && <section className="awards-panel voting-panel">
              <div className="section-head"><div><span className="section-kicker">YOUR VOICE. YOUR TEAM.</span><h2>Cast Your Ballot</h2></div><span className="section-icon">🗳️</span></div>
              <p className="section-description">Choose one trainer for each open award. You may leave a category blank. Each member gets one vote per category.</p>
              <div className="staff-note"><strong>Fair voting matters.</strong><p>Every vote is private. The database prevents duplicate votes in a category.</p></div>
              <form className="awards-form" onSubmit={(event) => void submitBallot(event)}>
                {categories.map((category, index) => {
                  const categoryNominees = nominees.filter((nominee) => nominee.category_id === category.id);
                  const alreadyVoted = Boolean(votes[category.id]);
                  const term = (search[category.id] ?? "").trim().toLowerCase();
                  const filtered = categoryNominees.filter((nominee) => nominee.trainer_name.toLowerCase().includes(term));
                  return <div className="vote-category" key={category.id}>
                    <label htmlFor={`award-search-${category.id}`}><span>{AWARD_ICONS[index % AWARD_ICONS.length]}</span> {category.name}</label>
                    <p className="form-help">{alreadyVoted ? "Your vote has been submitted." : category.voting_open ? "Voting is open." : "Voting is closed."}</p>
                    {alreadyVoted ? <div className="staff-note">Your vote in this category has already been recorded.</div> : <>
                      <input id={`award-search-${category.id}`} type="search" placeholder="Search eligible trainers…" value={search[category.id] ?? ""} onChange={(event) => setSearch((prev) => ({ ...prev, [category.id]: event.target.value }))} disabled={!category.voting_open} />
                      <select aria-label={`Choose a trainer for ${category.name}`} value={choices[category.id] ?? ""} onChange={(event) => setChoices((prev) => ({ ...prev, [category.id]: event.target.value }))} disabled={!category.voting_open}>
                        <option value="">Select a trainer…</option>
                        {filtered.map((nominee) => <option key={nominee.id} value={nominee.id}>{nominee.trainer_name}</option>)}
                      </select>
                      {category.voting_open && filtered.length === 0 && <p className="form-help">No eligible trainers match that search.</p>}
                    </>}
                  </div>;
                })}
                <button type="submit" className="gold-button" disabled={busy || !categories.some((c) => c.voting_open && !votes[c.id] && Boolean(choices[c.id]))}>{busy ? "Submitting…" : "Submit Ballot"}</button>
              </form>
            </section>}

            {activeTab === "hall" && <section className="awards-panel"><div className="section-head"><div><span className="section-kicker">TEAM FATÉ HISTORY</span><h2>Hall of Fame</h2></div><span className="section-icon">🏆</span></div>
              {Object.keys(winners).length === 0 ? <div className="awards-empty-state"><span className="empty-state-icon">🏆</span><h3>The Hall of Fame awaits its first legends</h3><p>Official winners will appear here once staff approve the final results.</p></div> : <div className="winner-grid">{categories.filter((category) => winners[category.id]).map((category) => { const winner = winners[category.id]; return <article className="winner-card" key={category.id}><span className="winner-award-label">{category.name}</span>{winner.image_url ? <img className="winner-avatar" src={winner.image_url} alt={`${winner.trainer_name} avatar`} loading="lazy" /> : <div className="winner-placeholder"><span>🏆</span></div>}<h3>{winner.trainer_name}</h3><p className="winner-message">{winner.description ?? "An honored member of Team FATÉ."}</p></article>; })}</div>}
            </section>}
          </>
        )}
        <footer className="awards-footer"><span>TEAM FATÉ</span><p>One team. One legacy. Many legends.</p><span className="footer-year">ANNIVERSARY AWARDS · 2026</span></footer>
      </div>
    </main>
  );
}
