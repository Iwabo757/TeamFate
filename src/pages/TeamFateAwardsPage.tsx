
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "./team-fate-awards.css";

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

type AwardVote = {
  category_id: string;
  nominee_id: string;
};

type AwardRole = "member" | "staff" | "admin";

type Tab = "overview" | "voting" | "hall";

const AWARD_INFO: Record<
  string,
  { subtitle: string; icon: string; criteria: string }
> = {
  "Member of the Year": {
    subtitle: "The MVP Award",
    icon: "👑",
    criteria:
      "Overall contribution, participation, dedication, and impact on Team FATÉ.",
  },
  "Competitive Player of the Year": {
    subtitle: "The Battle Ace",
    icon: "⚔️",
    criteria:
      "Competitive performance, improvement, sportsmanship, and battle involvement.",
  },
  "Teammate of the Year": {
    subtitle: "The Heart of FATÉ",
    icon: "🤝",
    criteria:
      "Reliability, helpfulness, teamwork, and support for other members.",
  },
  "Rising Star": {
    subtitle: "The Next Legend",
    icon: "🌟",
    criteria:
      "Growth, enthusiasm, engagement, and promising contributions to the team.",
  },
};

function getAwardInfo(name: string) {
  return (
    AWARD_INFO[name] ?? {
      subtitle: "Team FATÉ Anniversary Award",
      icon: "🏆",
      criteria: "Recognizing an outstanding Team FATÉ member.",
    }
  );
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function TeamFateAwardsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState<AwardRole>("member");

  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [winners, setWinners] = useState<Record<string, Nominee>>({});

  const [selectedVotes, setSelectedVotes] = useState<
    Record<string, string>
  >({});
  const [searchTerms, setSearchTerms] = useState<
    Record<string, string>
  >({});

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [submittingCategory, setSubmittingCategory] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isStaff = role === "staff" || role === "admin";

  const nomineesByCategory = useMemo(() => {
    const grouped: Record<string, Nominee[]> = {};

    for (const nominee of nominees) {
      (grouped[nominee.category_id] ??= []).push(nominee);
    }

    for (const list of Object.values(grouped)) {
      list.sort((a, b) =>
        a.trainer_name.localeCompare(b.trainer_name)
      );
    }

    return grouped;
  }, [nominees]);

  useEffect(() => {
    document.body.classList.add("team-fate-awards-theme");

    return () => {
      document.body.classList.remove("team-fate-awards-theme");
    };
  }, []);

  const loadAwards = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Check the real Supabase session first. Do not infer login state
      // from a missing React prop or a username displayed in the navbar.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setUserId(null);
        setUserName("");
        setRole("member");
        setCategories([]);
        setNominees([]);
        setVotes({});
        setWinners({});
        return;
      }

      setUserId(user.id);

      const metadataName =
        user.user_metadata?.nickname ||
        user.user_metadata?.username ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "";

      setUserName(
        typeof metadataName === "string" ? metadataName : ""
      );

      // Load the live categories and current user's role/votes.
      // The nominee query returns the official eligible candidates.
      const [categoryResult, nomineeResult, roleResult, voteResult, winnerResult] =
        await Promise.all([
          supabase
            .from("award_categories")
            .select("id,name,description,display_order,voting_open")
            .order("display_order"),

          supabase
            .from("award_nominees")
            .select("id,category_id,trainer_name,description,image_url")
            .eq("approved_for_voting", true)
            .order("trainer_name"),

          supabase.rpc("get_my_award_role"),

          supabase.rpc("get_my_award_votes"),

          supabase
            .from("award_winners")
            .select(
              "category_id,nominee_id,award_nominees(id,category_id,trainer_name,description,image_url)"
            ),
        ]);

      if (categoryResult.error) throw categoryResult.error;
      if (nomineeResult.error) throw nomineeResult.error;
      if (roleResult.error) throw roleResult.error;
      if (voteResult.error) throw voteResult.error;
      if (winnerResult.error) throw winnerResult.error;

      const loadedCategories = (categoryResult.data ?? []) as Category[];
      const loadedNominees = (nomineeResult.data ?? []) as Nominee[];
      const loadedVotes = (voteResult.data ?? []) as AwardVote[];

      setCategories(loadedCategories);
      setNominees(loadedNominees);

      const loadedRole = roleResult.data;
      setRole(
        loadedRole === "admin" || loadedRole === "staff"
          ? loadedRole
          : "member"
      );

      const voteMap: Record<string, string> = {};

      for (const vote of loadedVotes) {
        voteMap[vote.category_id] = vote.nominee_id;
      }

      setVotes(voteMap);

      const winnerMap: Record<string, Nominee> = {};

      for (const row of winnerResult.data ?? []) {
        const result = row as unknown as {
          category_id: string;
          nominee_id: string;
          award_nominees: Nominee | Nominee[] | null;
        };

        const related = Array.isArray(result.award_nominees)
          ? result.award_nominees[0]
          : result.award_nominees;

        if (related) {
          winnerMap[result.category_id] = related;
        }
      }

      setWinners(winnerMap);

      // Clear any stale selections after refreshing live data.
      setSelectedVotes((previous) => {
        const next = { ...previous };

        for (const category of loadedCategories) {
          if (
            !category.voting_open ||
            voteMap[category.id] ||
            !loadedNominees.some(
              (nominee) =>
                nominee.id === next[category.id] &&
                nominee.category_id === category.id
            )
          ) {
            delete next[category.id];
          }
        }

        return next;
      });
    } catch (loadError) {
      console.error("Failed to load Team FATÉ awards:", loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAwards();
  }, [loadAwards]);

  async function castVote(category: Category) {
    setError("");
    setNotice("");

    if (!userId) {
      setError("Your Team FATÉ session is not authenticated. Please sign in again.");
      return;
    }

    if (!category.voting_open) {
      setError("Voting is closed for this category.");
      return;
    }

    if (votes[category.id]) {
      setError("You have already voted in this category.");
      return;
    }

    const nomineeId = selectedVotes[category.id];

    if (!nomineeId) {
      setError("Choose a trainer before submitting your vote.");
      return;
    }

    const nominee = nominees.find(
      (candidate) =>
        candidate.id === nomineeId &&
        candidate.category_id === category.id
    );

    if (!nominee) {
      setError("That trainer is not eligible for this award.");
      return;
    }

    setSubmittingCategory(category.id);

    try {
      // The server verifies the session, category, nominee eligibility,
      // open voting status, and duplicate votes.
      const { error: voteError } = await supabase.rpc("cast_award_vote", {
        p_category_id: category.id,
        p_nominee_id: nominee.id,
      });

      if (voteError) throw voteError;

      setNotice(`Your vote for ${category.name} was recorded.`);
      setSelectedVotes((previous) => {
        const next = { ...previous };
        delete next[category.id];
        return next;
      });

      await loadAwards();
    } catch (voteError) {
      setError(getErrorMessage(voteError));
    } finally {
      setSubmittingCategory(null);
    }
  }


async function setVotingStatus(category: Category, open: boolean) {
  setError("");
  setNotice("");

  if (!userId || !isStaff) {
    setError("Staff access required.");
    return;
  }

  setSubmittingCategory(category.id);

  try {
    const { error: rpcError } = await supabase.rpc(
      "set_award_voting_status",
      {
        p_category_id: category.id,
        p_voting_open: open,
      }
    );

    if (rpcError) throw rpcError;

    setNotice(
      `${category.name}: voting ${open ? "opened" : "closed"}.`
    );

    await loadAwards();
  } catch (statusError) {
    setError(getErrorMessage(statusError));
  } finally {
    setSubmittingCategory(null);
  }
}

  function renderAlerts() {
    if (!error && !notice) return null;

    return (
      <div
        className={`awards-alert ${error ? "error" : "success"}`}
        role={error ? "alert" : "status"}
      >
        <span>{error || notice}</span>
        <button
          type="button"
          aria-label="Dismiss message"
          onClick={() => {
            setError("");
            setNotice("");
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <main className="fate-awards-page">
      <div className="awards-shade" />

      <div className="awards-shell">
        <header className="awards-hero">
          <div className="awards-eyebrow">
            ONE WISH. ONE FATÉ.
          </div>

          <h1>
            TEAM FATÉ
            <span> ANNIVERSARY AWARDS</span>
          </h1>

          <p>
            Celebrating the trainers, teammates, and unforgettable moments
            that made our first year legendary.
          </p>

          <div className="awards-hero-year">
            2026 · FIRST ANNIVERSARY
          </div>

          <div className="awards-hero-actions">
            <button
              type="button"
              className="gold-button"
              onClick={() => setActiveTab("voting")}
            >
              Cast Your Vote
            </button>

            <button
              type="button"
              className="outline-gold-button"
              onClick={() => setActiveTab("hall")}
            >
              View Hall of Fame
            </button>
          </div>
        </header>

        <nav className="awards-tabs" aria-label="Awards sections">
          <button
            type="button"
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>

          <button
            type="button"
            className={activeTab === "voting" ? "active" : ""}
            onClick={() => setActiveTab("voting")}
          >
            Voting
          </button>

          <button
            type="button"
            className={activeTab === "hall" ? "active" : ""}
            onClick={() => setActiveTab("hall")}
          >
            Hall of Fame
          </button>
        </nav>

        {renderAlerts()}

        {loading ? (
          <section className="awards-panel">
            <p className="empty">Loading your awards and ballot...</p>
          </section>
        ) : !userId ? (
          <section className="awards-panel">
            <div className="section-head">
              <div>
                <small>TEAM FATÉ MEMBERS</small>
                <h2>Sign-in Required</h2>
              </div>
            </div>

            <p>
              The awards page could not find an authenticated Supabase
              session. If the main site still shows you as logged in,
              check that the navbar and awards page use the same Supabase
              client and project configuration.
            </p>

            <button
              type="button"
              className="outline-gold-button"
              onClick={() => void loadAwards()}
            >
              Check Session Again
            </button>
          </section>
        ) : (
          <>
            <div className="awards-session-line">
              Signed in{userName ? ` as ${userName}` : ""}.
              
{isStaff && (
  <section className="awards-panel review-block">
    <div className="section-head">
      <div>
        <small>STAFF CONTROL PANEL</small>
        <h2>Ballot Management</h2>
      </div>
    </div>

    <p className="section-description">
      Open or close voting independently for each anniversary award.
      Changes take effect immediately.
    </p>

    {categories.map((category) => (
      <article className="vote-category" key={category.id}>
        <div className="category-heading">
          <div>
            <h3>{category.name}</h3>
            <p>
              Members {category.voting_open ? "can" : "cannot"} currently
              submit votes for this category.
            </p>
          </div>

          <span className={category.voting_open ? "open" : "closed"}>
            {category.voting_open ? "Voting Open" : "Voting Closed"}
          </span>
        </div>

        <div className="vote-row">
          <button
            type="button"
            className={
              category.voting_open
                ? "outline-gold-button"
                : "gold-button"
            }
            disabled={submittingCategory !== null}
            onClick={() =>
              void setVotingStatus(category, !category.voting_open)
            }
          >
            {submittingCategory === category.id
              ? "Updating..."
              : category.voting_open
                ? "Close Ballot"
                : "Open Ballot"}
          </button>
        </div>
      </article>
    ))}
  </section>
)}

            </div>

            {activeTab === "overview" && (
              <>
                <section className="awards-panel">
                  <div className="section-head">
                    <div>
                      <small>FOUR WAYS TO BE LEGENDARY</small>
                      <h2>The Anniversary Awards</h2>
                    </div>
                  </div>

                  <div className="award-category-grid">
                    {categories.map((category) => {
                      const info = getAwardInfo(category.name);
                      const winner = winners[category.id];
                      const hasVoted = Boolean(votes[category.id]);

                      return (
                        <article
                          className="award-category-card"
                          key={category.id}
                        >
                          <div className="award-card-art">
                            <span>{info.icon}</span>
                          </div>

                          <div className="award-card-content">
                            <span className="award-subtitle">
                              {info.subtitle}
                            </span>

                            <h3>{category.name}</h3>
                            <p>
                              {category.description || info.criteria}
                            </p>

                            <p className="form-help">
                              {winner
                                ? `Winner: ${winner.trainer_name}`
                                : hasVoted
                                  ? "Your vote has been recorded."
                                  : category.voting_open
                                    ? "Voting is open."
                                    : "Voting is closed."}
                            </p>

                            <button
                              type="button"
                              className="outline-gold-button"
                              onClick={() => setActiveTab("voting")}
                            >
                              {hasVoted ? "View Ballot" : "Choose a Trainer"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="awards-panel">
                  <div className="section-head">
                    <div>
                      <small>HOW IT WORKS</small>
                      <h2>One Team. Four Awards.</h2>
                    </div>
                  </div>

                  <div className="awards-steps-grid">
                    <article>
                      <span className="step-number">01</span>
                      <h3>Choose</h3>
                      <p>Select a trainer for each award.</p>
                    </article>

                    <article>
                      <span className="step-number">02</span>
                      <h3>Vote</h3>
                      <p>Cast one vote per category while voting is open.</p>
                    </article>

                    <article>
                      <span className="step-number">03</span>
                      <h3>Celebrate</h3>
                      <p>Published winners join the Hall of Fame.</p>
                    </article>
                  </div>
                </section>
              </>
            )}

            {activeTab === "voting" && (
              <section className="awards-panel voting-panel">
                <div className="section-head">
                  <div>
                    <small>YOUR VOICE. YOUR TEAM.</small>
                    <h2>Cast Your Ballot</h2>
                  </div>
                  <span className="section-icon">🗳️</span>
                </div>

                <p className="section-description">
                  Choose one trainer for each award. You may leave any
                  category blank. Each member gets one vote per category.
                </p>

                <div className="staff-note">
                  <strong>Fair voting matters.</strong>
                  <p>
                    Votes are submitted privately. The server prevents
                    duplicate votes and validates every selection.
                  </p>
                </div>

                {categories.length === 0 ? (
                  <p className="empty">
                    No award categories were returned by Supabase.
                  </p>
                ) : (
                  categories.map((category) => {
                    const info = getAwardInfo(category.name);
                    const candidates =
                      nomineesByCategory[category.id] ?? [];
                    const votedFor = votes[category.id];
                    const search = (
                      searchTerms[category.id] ?? ""
                    ).trim().toLowerCase();

                    const filteredCandidates = candidates.filter((candidate) =>
                      candidate.trainer_name.toLowerCase().includes(search)
                    );

                    return (
                      <article
                        className="vote-category"
                        key={category.id}
                      >
                        <div className="category-heading">
                          <div>
                            <span className="award-subtitle">
                              {info.icon} {info.subtitle}
                            </span>
                            <h3>{category.name}</h3>
                            <p>
                              {category.description || info.criteria}
                            </p>
                          </div>

                          <span
                            className={
                              category.voting_open ? "open" : "closed"
                            }
                          >
                            {category.voting_open
                              ? "Voting Open"
                              : "Voting Closed"}
                          </span>
                        </div>

                        {winners[category.id] && (
                          <div className="winner-banner">
                            <span>♛ OFFICIAL WINNER</span>
                            <strong>
                              {winners[category.id].trainer_name}
                            </strong>
                          </div>
                        )}

                        {votedFor ? (
                          <div className="confirmed">
                            ✓ Your vote has been recorded.
                            <p>
                              Your selection is kept private and cannot be
                              changed through this ballot.
                            </p>
                          </div>
                        ) : !category.voting_open ? (
                          <p className="empty">
                            Voting is closed for this category.
                          </p>
                        ) : (
                          <>
                            <label
                              className="search-label"
                              htmlFor={`award-search-${category.id}`}
                            >
                              Search members
                            </label>

                            <input
                              id={`award-search-${category.id}`}
                              type="search"
                              className="award-member-search"
                              placeholder="Type a trainer name..."
                              value={searchTerms[category.id] ?? ""}
                              onChange={(event) =>
                                setSearchTerms((previous) => ({
                                  ...previous,
                                  [category.id]: event.target.value,
                                }))
                              }
                            />

                            {filteredCandidates.length === 0 ? (
                              <p className="empty">
                                {candidates.length === 0
                                  ? "No eligible members were returned for this category. Check approved_for_voting in Supabase."
                                  : "No members match your search."}
                              </p>
                            ) : (
                              <div className="nominee-grid">
                                {filteredCandidates.map((candidate) => {
                                  const selected =
                                    selectedVotes[category.id] ===
                                    candidate.id;

                                  return (
                                    <button
                                      type="button"
                                      key={candidate.id}
                                      className={`nominee ${
                                        selected ? "chosen" : ""
                                      }`}
                                      onClick={() =>
                                        setSelectedVotes((previous) => ({
                                          ...previous,
                                          [category.id]: candidate.id,
                                        }))
                                      }
                                    >
                                      <div className="avatar">
                                        {candidate.image_url ? (
                                          <img
                                            src={candidate.image_url}
                                            alt=""
                                            loading="lazy"
                                          />
                                        ) : (
                                          candidate.trainer_name
                                            .slice(0, 1)
                                            .toUpperCase()
                                        )}
                                      </div>

                                      <strong>
                                        {candidate.trainer_name}
                                      </strong>

                                      {candidate.description && (
                                        <small>
                                          {candidate.description}
                                        </small>
                                      )}

                                      <em>
                                        {selected ? "✓ Selected" : "Select"}
                                      </em>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            <div className="vote-row">
                              <span>
                                {candidates.length} eligible members
                              </span>

                              <button
                                type="button"
                                className="gold-button"
                                disabled={
                                  submittingCategory !== null ||
                                  !selectedVotes[category.id]
                                }
                                onClick={() => void castVote(category)}
                              >
                                {submittingCategory === category.id
                                  ? "Submitting..."
                                  : "Submit Vote"}
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })
                )}

                <button
                  type="button"
                  className="outline-gold-button"
                  onClick={() => void loadAwards()}
                  disabled={loading || submittingCategory !== null}
                >
                  Refresh Ballot
                </button>
              </section>
            )}

            {activeTab === "hall" && (
              <section className="awards-panel">
                <div className="section-head">
                  <div>
                    <small>THE LEGACY</small>
                    <h2>Hall of Fame</h2>
                  </div>
                </div>

                <p className="section-description">
                  Official winners appear here once the results have been
                  published in Supabase.
                </p>

                <div className="winner-grid">
                  {categories.map((category) => {
                    const info = getAwardInfo(category.name);
                    const winner = winners[category.id];

                    return (
                      <article className="winner-card" key={category.id}>
                        <span>{info.icon}</span>
                        <small>{category.name}</small>

                        {winner?.image_url && (
                          <img
                            className="winner-avatar"
                            src={winner.image_url}
                            alt=""
                            loading="lazy"
                          />
                        )}

                        <strong>
                          {winner?.trainer_name || "Winner to be announced"}
                        </strong>

                        <p>
                          {winner
                            ? "Official Team FATÉ anniversary award winner."
                            : "The next legend has yet to be announced."}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {isStaff && (
              <section className="awards-panel review-block">
                <div className="section-head">
                  <div>
                    <small>STAFF ACCESS</small>
                    <h2>Awards Status</h2>
                  </div>
                </div>

                <p className="staff-note">
                  Staff permissions were confirmed by the existing
                  get_my_award_role RPC. Open and close voting and winner
                  publishing must use server-side staff-authorized actions.
                  This page does not attempt unrestricted table updates.
                </p>

                {categories.map((category) => (
                  <div className="rank-row" key={category.id}>
                    <span>{category.name}</span>
                    <strong>
                      {category.voting_open ? "Voting Open" : "Voting Closed"}
                    </strong>
                    <small>
                      {winners[category.id]
                        ? `Winner: ${winners[category.id].trainer_name}`
                        : "Winner not published"}
                    </small>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        <footer className="awards-footer">
          <b>TEAM FATÉ</b>
          <span>ONE WISH. ONE FATÉ.</span>
        </footer>
      </div>
    </main>
  );
}
