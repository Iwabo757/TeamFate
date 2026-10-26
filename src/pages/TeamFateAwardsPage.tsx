import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./team-fate-awards.css";
import { supabase } from "../lib/supabase";
/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AwardCategory = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  criteria: string;
  votingOpen: boolean;
};

export type AwardMember = {
  id: string;
  trainerName: string;
  avatarUrl?: string | null;
};

export type AwardWinner = {
  categoryId: string;
  trainerName: string;
  message?: string;
  avatarUrl?: string | null;
  year?: number;
};

type TeamFateAwardsPageProps = {
  currentUser?: string;
  isStaff?: boolean;
  isAdmin?: boolean;

  /** The authenticated member's eligible ballot candidates. */
  members?: AwardMember[];

  /** Category IDs for which the current user has already voted. */
  votedCategoryIds?: string[];

  /** Published winners keyed by category ID. */
  winners?: AwardWinner[];

  /** Submit a vote using the real Supabase category and nominee UUIDs. */
  onSubmitVote?: (
    categoryId: string,
    nomineeId: string
  ) => Promise<void>;

  /** Staff-only server action to open or close a category. */
  onSetVotingOpen?: (
    categoryId: string,
    votingOpen: boolean
  ) => Promise<void>;

  /** Staff-only server action to publish the winning nominee. */
  onPublishWinner?: (categoryId: string) => Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Award configuration                                                        */
/* -------------------------------------------------------------------------- */

const AWARD_YEAR = 2026;

const AWARD_CATEGORIES: AwardCategory[] = [
  {
    id: "1ae98000-69b4-4397-8e65-882393432951",
    title: "Member of the Year",
    subtitle: "The MVP Award",
    description:
      "Recognizes the trainer who made the biggest overall impact on Team FATÉ.",
    icon: "👑",
    criteria:
      "Overall contribution, participation, dedication, and positive impact on the team.",
    votingOpen: false,
  },
  {
    id: "8ec95d76-ebda-4cbc-b335-54a81780fba5",
    title: "Competitive Player of the Year",
    subtitle: "The Battle Ace",
    description:
      "Celebrates the member who stood out through competitive skill and performance.",
    icon: "⚔️",
    criteria:
      "Competitive results, improvement, sportsmanship, and involvement in team battles.",
    votingOpen: false,
  },
  {
    id: "6393c5d6-c674-4f70-a2e9-c8cd036251c2",
    title: "Teammate of the Year",
    subtitle: "The Heart of FATÉ",
    description:
      "Honors the trainer who consistently helps, supports, and brings members together.",
    icon: "🤝",
    criteria:
      "Reliability, helpfulness, teamwork, encouragement, and community spirit.",
    votingOpen: false,
  },
  {
    id: "8ca680bb-21e1-4143-95d5-ab2fa437bff8",
    title: "Rising Star",
    subtitle: "The Next Legend",
    description:
      "Recognizes a newer or growing member who has made an impressive impact.",
    icon: "🌟",
    criteria:
      "Growth, enthusiasm, engagement, and promising contributions to Team FATÉ.",
    votingOpen: false,
  },
];

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function TeamFateAwardsPage({
  currentUser = "",
  isStaff = false,
  isAdmin = false,
  members = [],
  votedCategoryIds = [],
  winners = [],
  onSubmitVote,
  onSetVotingOpen,
  onPublishWinner,
}: TeamFateAwardsPageProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "vote" | "hall-of-fame"
  >("overview");

  const [selectedVotes, setSelectedVotes] = useState<
    Record<string, string>
  >({});

  const [searchTerms, setSearchTerms] = useState<
    Record<string, string>
  >({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(
    null
  );
  const [notice, setNotice] = useState("");

  /* Apply the existing awards theme only while this page is mounted. */
  useEffect(() => {
    document.body.classList.add("team-fate-awards-theme");

    return () => {
      document.body.classList.remove("team-fate-awards-theme");
    };
  }, []);

  const categories = useMemo(() => AWARD_CATEGORIES, []);

  const memberLookup = useMemo(() => {
    return new Map(members.map((member) => [member.id, member]));
  }, [members]);

  const winnerLookup = useMemo(() => {
    return new Map(winners.map((winner) => [winner.categoryId, winner]));
  }, [winners]);

  function changeTab(
    tab: "overview" | "vote" | "hall-of-fame"
  ) {
    setActiveTab(tab);
    setNotice("");
  }

  function renderNotice() {
    if (!notice) return null;

    return (
      <div className="awards-notice" role="status" aria-live="polite">
        {notice}
      </div>
    );
  }

  async function handleVoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (!currentUser.trim()) {
      setNotice("Sign in with your Team FATÉ account to vote.");
      return;
    }

    if (!onSubmitVote) {
      setNotice(
        "Voting is not connected yet. Connect the authenticated Supabase voting action."
      );
      return;
    }

    const choices = Object.entries(selectedVotes).filter(
      ([categoryId, nomineeId]) =>
        nomineeId.trim() &&
        !votedCategoryIds.includes(categoryId)
    );

    if (choices.length === 0) {
      setNotice(
        "Choose at least one available award category before submitting."
      );
      return;
    }

    const invalidChoice = choices.find(([categoryId, nomineeId]) => {
      const category = categories.find((item) => item.id === categoryId);
      const nominee = memberLookup.get(nomineeId);

      return !category?.votingOpen || !nominee;
    });

    if (invalidChoice) {
      setNotice(
        "One of your choices is no longer available. Refresh the page and try again."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      for (const [categoryId, nomineeId] of choices) {
        await onSubmitVote(categoryId, nomineeId);
      }

      setSelectedVotes({});
      setNotice(
        "Your vote submission was processed. Categories you voted in will update after the ballot refreshes."
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Your vote could not be submitted. Refresh the page and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVotingToggle(category: AwardCategory) {
    if (!isStaff || !onSetVotingOpen) {
      setNotice("You do not have access to change voting status.");
      return;
    }

    setNotice("");
    setBusyCategoryId(category.id);

    try {
      await onSetVotingOpen(category.id, !category.votingOpen);
      setNotice(
        `${category.title}: voting ${category.votingOpen ? "close" : "open"} request completed.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Voting status could not be changed."
      );
    } finally {
      setBusyCategoryId(null);
    }
  }

  async function handlePublishWinner(category: AwardCategory) {
    if (!isStaff || !onPublishWinner) {
      setNotice("You do not have access to publish winners.");
      return;
    }

    if (category.votingOpen) {
      setNotice("Close voting for this category before publishing a winner.");
      return;
    }

    const confirmed = window.confirm(
      `Publish the winner for ${category.title}? Make sure the final result has been verified.`
    );

    if (!confirmed) return;

    setNotice("");
    setBusyCategoryId(category.id);

    try {
      await onPublishWinner(category.id);
      setNotice(
        `Winner publishing request completed for ${category.title}.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The winner could not be published."
      );
    } finally {
      setBusyCategoryId(null);
    }
  }

  return (
    <main className="fate-awards-page">
      <div className="awards-shell">
        {/* Hero */}
        <section className="awards-hero">
          <div className="awards-eyebrow">
            ✦ ONE YEAR. ONE TEAM. COUNTLESS MEMORIES. ✦
          </div>

          <h1>
            TEAM FATÉ
            <span>ANNIVERSARY AWARDS</span>
          </h1>

          <p className="awards-hero-description">
            Celebrating the trainers, teammates, and unforgettable moments
            that made our first year legendary.
          </p>

          <div className="awards-hero-year">
            <span className="awards-hero-year-line" />
            <span>{AWARD_YEAR} · FIRST ANNIVERSARY</span>
            <span className="awards-hero-year-line" />
          </div>

          <div className="awards-hero-actions">
            <button
              type="button"
              className="gold-button"
              onClick={() => changeTab("vote")}
            >
              Cast Your Vote
            </button>

            <button
              type="button"
              className="outline-gold-button"
              onClick={() => changeTab("hall-of-fame")}
            >
              View Hall of Fame
            </button>
          </div>
        </section>

        {/* Navigation */}
        <nav className="awards-tabs" aria-label="Anniversary awards sections">
          <button
            type="button"
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => changeTab("overview")}
          >
            Overview
          </button>

          <button
            type="button"
            className={activeTab === "vote" ? "active" : ""}
            onClick={() => changeTab("vote")}
          >
            Voting
          </button>

          <button
            type="button"
            className={activeTab === "hall-of-fame" ? "active" : ""}
            onClick={() => changeTab("hall-of-fame")}
          >
            Hall of Fame
          </button>
        </nav>

        {renderNotice()}

        {/* Overview */}
        {activeTab === "overview" && (
          <>
            <section className="awards-panel">
              <div className="section-head">
                <div>
                  <span className="section-kicker">
                    FOUR WAYS TO BE LEGENDARY
                  </span>
                  <h2>The Anniversary Awards</h2>
                </div>
              </div>

              <div className="award-category-grid">
                {categories.map((category) => {
                  const winner = winnerLookup.get(category.id);

                  return (
                    <article
                      className="award-category-card"
                      key={category.id}
                    >
                      <div className="award-card-art" aria-hidden="true">
                        <span>{category.icon}</span>
                      </div>

                      <div className="award-card-content">
                        <span className="award-subtitle">
                          {category.subtitle}
                        </span>

                        <h3>{category.title}</h3>
                        <p>{category.description}</p>

                        <details className="award-criteria">
                          <summary>What this award recognizes</summary>
                          <p>{category.criteria}</p>
                        </details>

                        <p className="form-help">
                          {winner
                            ? `Winner: ${winner.trainerName}`
                            : category.votingOpen
                              ? "Voting is open."
                              : "Voting is currently closed."}
                        </p>

                        <button
                          type="button"
                          className="outline-gold-button"
                          onClick={() => changeTab("vote")}
                        >
                          Choose a Trainer
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="awards-panel awards-steps">
              <div className="section-head">
                <div>
                  <span className="section-kicker">HOW IT WORKS</span>
                  <h2>One Team. Four Awards.</h2>
                </div>
              </div>

              <div className="awards-steps-grid">
                <article>
                  <span className="step-number">01</span>
                  <h3>Choose</h3>
                  <p>
                    Select a trainer from the official Team FATÉ member list.
                  </p>
                </article>

                <article>
                  <span className="step-number">02</span>
                  <h3>Vote</h3>
                  <p>
                    Cast one vote per category while voting is open.
                  </p>
                </article>

                <article>
                  <span className="step-number">03</span>
                  <h3>Verify</h3>
                  <p>
                    Staff close voting and verify the final results.
                  </p>
                </article>

                <article>
                  <span className="step-number">04</span>
                  <h3>Celebrate</h3>
                  <p>
                    Published winners join the Team FATÉ Hall of Fame.
                  </p>
                </article>
              </div>
            </section>

            <section className="awards-panel winner-reveal-section">
              <div className="section-head">
                <div>
                  <span className="section-kicker">
                    THE LEGENDS WILL BE REMEMBERED
                  </span>
                  <h2>Winner Reveal</h2>
                </div>
              </div>

              <p className="section-description">
                Official winners appear here after staff publish the verified
                results.
              </p>

              <div className="winner-grid">
                {categories.map((category) => {
                  const winner = winnerLookup.get(category.id);

                  return (
                    <article
                      className={`winner-card ${winner ? "" : "winner-pending"}`}
                      key={category.id}
                    >
                      <div className="winner-medal">{category.icon}</div>

                      <span className="winner-award-label">
                        {category.subtitle}
                      </span>

                      <h3>{category.title}</h3>

                      {winner?.avatarUrl ? (
                        <img
                          className="winner-avatar"
                          src={winner.avatarUrl}
                          alt={`${winner.trainerName}'s avatar`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="winner-placeholder">
                          <span>{winner ? "🏆" : "?"}</span>
                        </div>
                      )}

                      <p className="winner-name">
                        {winner?.trainerName ?? "Winner to be revealed"}
                      </p>

                      <p className="winner-message">
                        {winner?.message ??
                          "The next name in Team FATÉ history has yet to be announced."}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* Voting */}
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
              Choose one trainer for each award. You may leave a category
              blank. Each eligible member gets one vote per category.
            </p>

            {!currentUser.trim() && (
              <div className="staff-note">
                <strong>Sign-in required</strong>
                <p>Sign in with your Team FATÉ account to cast your ballot.</p>
              </div>
            )}

            <div className="staff-note">
              <strong>Fair voting matters.</strong>
              <p>
                Every vote has equal weight. Members cannot vote more than once
                in a category, and private vote totals should not be displayed
                publicly.
              </p>
            </div>

            {members.length === 0 ? (
              <div className="awards-empty-state">
                <span className="empty-state-icon">👥</span>
                <h3>Member list unavailable</h3>
                <p>
                  The page has not received the official member list from the
                  backend. Connect the members query before enabling voting.
                </p>
              </div>
            ) : (
              <form className="awards-form" onSubmit={handleVoteSubmit}>
                {categories.map((category) => {
                  const alreadyVoted = votedCategoryIds.includes(category.id);
                  const selectedMemberId = selectedVotes[category.id] ?? "";
                  const searchTerm = (
                    searchTerms[category.id] ?? ""
                  ).toLowerCase();

                  const filteredMembers = members.filter((member) =>
                    member.trainerName.toLowerCase().includes(searchTerm)
                  );

                  return (
                    <div className="vote-category" key={category.id}>
                      <label htmlFor={`vote-search-${category.id}`}>
                        <span>{category.icon}</span> {category.title}
                      </label>

                      <p className="form-help">
                        {alreadyVoted
                          ? "You have already voted in this category."
                          : category.votingOpen
                            ? "Voting is open."
                            : "Voting is closed."}
                      </p>

                      {alreadyVoted ? (
                        <div className="staff-note">
                          Your vote for this category has already been
                          submitted.
                        </div>
                      ) : (
                        <>
                          <input
                            id={`vote-search-${category.id}`}
                            type="search"
                            value={searchTerms[category.id] ?? ""}
                            onChange={(event) =>
                              setSearchTerms((previous) => ({
                                ...previous,
                                [category.id]: event.target.value,
                              }))
                            }
                            placeholder="Search Team FATÉ members..."
                            autoComplete="off"
                            disabled={!category.votingOpen || !currentUser}
                          />

                          <select
                            aria-label={`Choose a trainer for ${category.title}`}
                            value={selectedMemberId}
                            onChange={(event) =>
                              setSelectedVotes((previous) => ({
                                ...previous,
                                [category.id]: event.target.value,
                              }))
                            }
                            disabled={!category.votingOpen || !currentUser}
                          >
                            <option value="">Select a trainer...</option>

                            {filteredMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.trainerName}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  );
                })}

                <p className="form-help">
                  Check your selections before submitting. Submitted votes
                  should not be changeable unless an administrator explicitly
                  provides a secure correction process.
                </p>

                <button
                  type="submit"
                  className="gold-button"
                  disabled={
                    isSubmitting ||
                    !currentUser.trim() ||
                    !onSubmitVote ||
                    !categories.some(
                      (category) =>
                        category.votingOpen &&
                        !votedCategoryIds.includes(category.id) &&
                        Boolean(selectedVotes[category.id])
                    )
                  }
                >
                  {isSubmitting ? "Submitting..." : "Submit Ballot"}
                </button>
              </form>
            )}
          </section>
        )}

        {/* Hall of Fame */}
        {activeTab === "hall-of-fame" && (
          <section className="awards-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">TEAM FATÉ HISTORY</span>
                <h2>Hall of Fame</h2>
              </div>

              <span className="section-icon">🏆</span>
            </div>

            <p className="section-description">
              A permanent record of trainers who have earned anniversary
              honors throughout Team FATÉ's history.
            </p>

            {winners.length === 0 ? (
              <div className="awards-empty-state">
                <span className="empty-state-icon">🏆</span>
                <h3>The Hall of Fame awaits its first legends</h3>
                <p>
                  Official winners will appear here once the results are
                  published.
                </p>

                <button
                  type="button"
                  className="outline-gold-button"
                  onClick={() => changeTab("overview")}
                >
                  Back to Awards
                </button>
              </div>
            ) : (
              <div className="winner-grid">
                {winners.map((winner) => {
                  const category = categories.find(
                    (item) => item.id === winner.categoryId
                  );

                  return (
                    <article
                      className="winner-card"
                      key={`${winner.year ?? AWARD_YEAR}-${winner.categoryId}`}
                    >
                      <span className="winner-award-label">
                        {winner.year ?? AWARD_YEAR} ANNIVERSARY
                      </span>

                      {winner.avatarUrl ? (
                        <img
                          className="winner-avatar"
                          src={winner.avatarUrl}
                          alt={`${winner.trainerName}'s avatar`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="winner-placeholder">
                          <span>🏆</span>
                        </div>
                      )}

                      <h3>{winner.trainerName}</h3>

                      <p className="winner-name">
                        {category?.title ?? "Team FATÉ Award"}
                      </p>

                      <p className="winner-message">
                        {winner.message ?? "An honored member of Team FATÉ."}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Staff controls */}
        {isStaff && (
          <section className="awards-panel review-block">
            <div className="section-head">
              <div>
                <span className="section-kicker">STAFF ACCESS</span>
                <h2>Awards Management</h2>
              </div>

              <span className="section-icon">🛡️</span>
            </div>

            <p className="section-description">
              Open or close voting for each award. Close voting and verify
              the final result before publishing a winner.
            </p>

            <div className="award-category-grid">
              {categories.map((category) => {
                const winner = winnerLookup.get(category.id);
                const busy = busyCategoryId === category.id;

                return (
                  <article
                    className="award-category-card"
                    key={category.id}
                  >
                    <div className="award-card-content">
                      <span className="award-subtitle">
                        {category.subtitle}
                      </span>

                      <h3>{category.title}</h3>

                      <p>
                        Voting status:{" "}
                        <strong>
                          {category.votingOpen ? "Open" : "Closed"}
                        </strong>
                      </p>

                      <p>
                        Published winner:{" "}
                        <strong>{winner?.trainerName ?? "Not published"}</strong>
                      </p>

                      <button
                        type="button"
                        className="outline-gold-button"
                        disabled={busy || !onSetVotingOpen}
                        onClick={() => void handleVotingToggle(category)}
                      >
                        {busy
                          ? "Working..."
                          : category.votingOpen
                            ? "Close Voting"
                            : "Open Voting"}
                      </button>

                      <button
                        type="button"
                        className="gold-button"
                        disabled={
                          busy ||
                          category.votingOpen ||
                          !onPublishWinner
                        }
                        onClick={() => void handlePublishWinner(category)}
                      >
                        {busy ? "Working..." : "Publish Winner"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {isAdmin && (
              <div className="staff-note">
                <strong>Administrator access</strong>
                <p>
                  Sensitive ballot audits and voter identity records must
                  remain behind administrator-authorized server functions.
                  Do not expose private ballots or unreleased totals to
                  ordinary members.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="awards-footer">
          <span>TEAM FATÉ</span>
          <p>One team. One legacy. Many legends.</p>
          <span className="footer-year">
            ANNIVERSARY AWARDS · {AWARD_YEAR}
          </span>
        </footer>
      </div>
    </main>
  );
}