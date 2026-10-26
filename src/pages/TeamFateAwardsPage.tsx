import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  awarded_at?: string | null;
};
type WinnerRow = {
  category_id: string;
  nominee_id: string;
  approved_at: string | null;
  award_categories: { name: string } | { name: string }[] | null;
  award_nominees: Nominee | Nominee[] | null;
};
type VoteRow = { category_id: string; nominee_id: string };
type WinnerHistoryRow = {
  history_id: string;
  category_id: string;
  category_name: string;
  nominee_id: string;
  trainer_name: string;
  description: string | null;
  image_url: string | null;
  awarded_at: string;
};
type HallOfFameEntry = {
  key: string;
  category_id: string;
  category_name: string;
  trainer_name: string;
  description: string | null;
  image_url: string | null;
  awarded_at: string;
  is_current: boolean;
};

const AWARD_ICONS = ["👑", "⚔️", "🤝", "🌟"];
const AWARD_ARTWORK = [
  "/images/awards/mvp-award.png",
  "/images/awards/competitive-player-award.png",
  "/images/awards/teammate-award.png",
  "/images/awards/rising-star-award.png",
];
type HeaderSettings = {
  eyebrow: string;
  title: string;
  description: string;
  year_label: string;
};

const DEFAULT_HEADER: HeaderSettings = {
  eyebrow: "ONE YEAR. ONE TEAM. COUNTLESS MEMORIES.",
  title: "TEAM FATÉ ANNIVERSARY AWARDS",
  description: "Celebrating the trainers, teammates, and unforgettable moments that made our first year legendary.",
  year_label: "2026 · FIRST ANNIVERSARY",
};


function getCategoryDescription(name: string, fallback: string | null): string {
  const normalized = name.toLowerCase();

  if (normalized.includes("member of the year") || normalized.includes("mvp")) {
    return "Recognizes the member who made the biggest overall impact on Team FATÉ through activity, dedication, leadership, and contributions to the team.";
  }
  if (normalized.includes("competitive") || normalized.includes("player of the year")) {
    return "Recognizes the competitive player who stood out through skill, preparation, sportsmanship, and performance in team battles or tournaments.";
  }
  if (normalized.includes("teammate")) {
    return "Recognizes the teammate who consistently supports others, helps build team spirit, and makes Team FATÉ a better community.";
  }
  if (normalized.includes("rising star")) {
    return "Recognizes a newer or up-and-coming member who has shown impressive growth, potential, and enthusiasm for Team FATÉ.";
  }

  return fallback?.trim() || "Vote for the trainer whose contributions best represent this award.";
}

export default function TeamFateAwardsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [headerSettings, setHeaderSettings] = useState<HeaderSettings>(DEFAULT_HEADER);
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [winners, setWinners] = useState<Record<string, Nominee>>({});
  const [winnerHistory, setWinnerHistory] = useState<WinnerHistoryRow[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [search, setSearch] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"overview" | "vote" | "hall">("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAwards = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      setUserId(user?.id ?? null);

      const headerResult = await supabase
        .from("award_page_settings")
        .select("eyebrow,title,description,year_label")
        .eq("id", 1)
        .maybeSingle();
      if (headerResult.error) throw headerResult.error;
      setHeaderSettings({ ...DEFAULT_HEADER, ...(headerResult.data ?? {}) });

      if (!user) {
        setCategories([]);
        setNominees([]);
        setVotes({});
        setWinners({});
        setWinnerHistory([]);
        return;
      }

      const [categoryResult, nomineeResult, voteResult, winnerResult, historyResult] = await Promise.all([
        supabase.from("award_categories").select("id,name,description,display_order,voting_open").order("display_order"),
        supabase.from("award_nominees").select("id,category_id,trainer_name,description,image_url").eq("approved_for_voting", true).order("trainer_name"),
        supabase.rpc("get_my_award_votes"),
        supabase.from("award_winners").select("category_id,nominee_id,approved_at,award_categories(name),award_nominees(id,category_id,trainer_name,description,image_url)"),
        supabase.from("award_winner_history").select("history_id,category_id,category_name,nominee_id,trainer_name,description,image_url,awarded_at").order("awarded_at", { ascending: false }),
      ]);
      if (categoryResult.error) throw categoryResult.error;
      if (nomineeResult.error) throw nomineeResult.error;
      if (voteResult.error) throw voteResult.error;
      if (winnerResult.error) throw winnerResult.error;
      if (historyResult.error) throw historyResult.error;
      setWinnerHistory((historyResult.data ?? []) as WinnerHistoryRow[]);

      setCategories(categoryResult.data ?? []);
      setNominees(nomineeResult.data ?? []);
      const voteMap: Record<string, string> = {};
      ((voteResult.data ?? []) as VoteRow[]).forEach((vote) => { voteMap[vote.category_id] = vote.nominee_id; });
      setVotes(voteMap);
      const winnerMap: Record<string, Nominee> = {};
      ((winnerResult.data ?? []) as unknown as WinnerRow[]).forEach((row) => {
        const related = Array.isArray(row.award_nominees) ? row.award_nominees[0] : row.award_nominees;
        if (related) winnerMap[row.category_id] = { ...related, awarded_at: row.approved_at };
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
          <div className="awards-eyebrow">{headerSettings.eyebrow}</div>
          <h1>{headerSettings.title}</h1>
          <p>{headerSettings.description}</p>
          <div className="awards-hero-year">
            <span className="awards-hero-year-line" />
            <span>{headerSettings.year_label}</span>
            <span className="awards-hero-year-line" />
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

            {activeTab === "vote" && (
              <section className="awards-panel voting-panel">
                <div className="section-head">
                  <div>
                    <span className="section-kicker">YOUR VOICE. YOUR TEAM.</span>
                    <h2>Cast Your Ballot</h2>
                  </div>
                  <span className="section-icon">🗳️</span>
                </div>

                <p className="section-description">
                  Choose one trainer for each open award. Start typing a trainer's name
                  and select them from the suggestions. You may leave a category blank.
                  Each member gets one vote per category.
                </p>

                <div className="staff-note">
                  <strong>Fair voting matters.</strong>
                  <p>Every vote is private. The database prevents duplicate votes in a category.</p>
                </div>

                <form className="awards-form" onSubmit={(event) => void submitBallot(event)}>
                  {categories.map((category, index) => {
                    const categoryNominees = nominees.filter(
                      (nominee) => nominee.category_id === category.id,
                    );
                    const alreadyVoted = Boolean(votes[category.id]);
                    const query = (search[category.id] ?? "").trim().toLowerCase();
                    const selectedNominee = categoryNominees.find(
                      (nominee) => nominee.id === choices[category.id],
                    );
                    const filtered = categoryNominees
                      .filter((nominee) => nominee.trainer_name.toLowerCase().includes(query))
                      .slice(0, 8);
                    const categoryDescription = getCategoryDescription(category.name, category.description);

                    return (
                      <div className="vote-category" key={category.id}>
                        <label htmlFor={`award-search-${category.id}`}>
                          <span>{AWARD_ICONS[index % AWARD_ICONS.length]}</span> {category.name}
                        </label>
                        <p className="award-vote-description">{categoryDescription}</p>
                        <p className="form-help">
                          {alreadyVoted
                            ? "Your vote has been submitted."
                            : category.voting_open
                              ? "Voting is open."
                              : "Voting is closed."}
                        </p>

                        {alreadyVoted ? (
                          <div className="staff-note">
                            Your vote in this category has already been recorded.
                          </div>
                        ) : !category.voting_open ? (
                          <div className="staff-note">This ballot is currently closed.</div>
                        ) : (
                          <div className="trainer-autocomplete">
                            <input
                              id={`award-search-${category.id}`}
                              type="search"
                              autoComplete="off"
                              placeholder="Start typing a trainer's name…"
                              value={search[category.id] ?? ""}
                              aria-label={`Search trainers for ${category.name}`}
                              aria-autocomplete="list"
                              aria-expanded={Boolean(query && !selectedNominee && filtered.length)}
                              onChange={(event) => {
                                const value = event.target.value;
                                setSearch((prev) => ({ ...prev, [category.id]: value }));
                                setChoices((prev) => ({ ...prev, [category.id]: "" }));
                              }}
                            />

                            {selectedNominee && (
                              <div className="trainer-selected">
                                <span>Selected:</span>
                                <strong>{selectedNominee.trainer_name}</strong>
                                <button
                                  type="button"
                                  className="trainer-change-button"
                                  onClick={() => {
                                    setChoices((prev) => ({ ...prev, [category.id]: "" }));
                                    setSearch((prev) => ({ ...prev, [category.id]: "" }));
                                  }}
                                >
                                  Change
                                </button>
                              </div>
                            )}

                            {!selectedNominee && query && (
                              <div className="trainer-suggestions" role="listbox" aria-label={`Trainer suggestions for ${category.name}`}>
                                {filtered.length ? (
                                  filtered.map((nominee) => (
                                    <button
                                      key={nominee.id}
                                      type="button"
                                      className="trainer-suggestion"
                                      role="option"
                                      aria-selected={false}
                                      onClick={() => {
                                        setChoices((prev) => ({ ...prev, [category.id]: nominee.id }));
                                        setSearch((prev) => ({ ...prev, [category.id]: nominee.trainer_name }));
                                      }}
                                    >
                                      {nominee.image_url ? (
                                        <img src={nominee.image_url} alt="" loading="lazy" />
                                      ) : (
                                        <span className="trainer-suggestion-avatar" aria-hidden="true">
                                          {nominee.trainer_name.slice(0, 1).toUpperCase()}
                                        </span>
                                      )}
                                      <span className="trainer-suggestion-name">{nominee.trainer_name}</span>
                                      <span className="trainer-suggestion-action">Select</span>
                                    </button>
                                  ))
                                ) : (
                                  <p className="trainer-no-results">No eligible trainers match that name.</p>
                                )}
                              </div>
                            )}

                            {!query && !selectedNominee && (
                              <p className="form-help">Type at least part of a trainer's name to see suggestions.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="submit"
                    className="gold-button"
                    disabled={busy || !categories.some(
                      (category) =>
                        category.voting_open &&
                        !votes[category.id] &&
                        Boolean(choices[category.id]),
                    )}
                  >
                    {busy ? "Submitting…" : "Submit Ballot"}
                  </button>
                </form>
              </section>
            )}

            {activeTab === "hall" && <section className="awards-panel">
              <div className="section-head"><div><span className="section-kicker">TEAM FATÉ HISTORY</span><h2>Hall of Fame</h2></div><span className="section-icon">🏆</span></div>
              <p className="section-description">A permanent record of every published winner, the award they earned, and when they received it.</p>
              {(() => {
                const currentEntries: HallOfFameEntry[] = Object.entries(winners).map(([categoryId, winner]) => {
                  const category = categories.find((item) => item.id === categoryId);
                  return {
                    key: `current-${categoryId}-${winner.id}`,
                    category_id: categoryId,
                    category_name: category?.name ?? "Team FATÉ Award",
                    trainer_name: winner.trainer_name,
                    description: winner.description,
                    image_url: winner.image_url,
                    awarded_at: winner.awarded_at ?? "",
                    is_current: true,
                  };
                });
                const archivedEntries: HallOfFameEntry[] = winnerHistory.map((entry) => ({ ...entry, key: entry.history_id, is_current: false }));
                const allEntries = [...currentEntries, ...archivedEntries].sort((a, b) => {
                  const aTime = a.awarded_at ? new Date(a.awarded_at).getTime() : 0;
                  const bTime = b.awarded_at ? new Date(b.awarded_at).getTime() : 0;
                  return bTime - aTime;
                });
                if (allEntries.length === 0) return <div className="awards-empty-state"><span className="empty-state-icon">🏆</span><h3>The Hall of Fame awaits its first legends</h3><p>Official winners will appear here once staff approve the final results.</p></div>;
                return <div className="winner-grid">{allEntries.map((entry) => <article className="winner-card" key={entry.key}>
                  <span className="winner-award-label">{entry.category_name}</span>
                  {entry.image_url ? <img className="winner-avatar" src={entry.image_url} alt={`${entry.trainer_name} avatar`} loading="lazy" /> : <div className="winner-placeholder"><span>🏆</span></div>}
                  <h3>{entry.trainer_name}</h3>
                  <p className="winner-name">{entry.awarded_at ? new Date(entry.awarded_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : entry.is_current ? "Current published winner" : "Award date unavailable"}</p>
                  <p className="winner-message">{entry.description ?? "An honored member of Team FATÉ."}</p>
                  {entry.is_current && <span className="admin-status-pill is-winner">Current Winner</span>}
                </article>)}</div>;
              })()}
            </section>}
          </>
        )}
        <footer className="awards-footer"><span>TEAM FATÉ</span><p>One team. One legacy. Many legends.</p><span className="footer-year">ANNIVERSARY AWARDS · 2026</span></footer>
      </div>
    </main>
  );
}
