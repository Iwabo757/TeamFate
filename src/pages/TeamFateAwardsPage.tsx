
import { useEffect, useMemo, useState } from "react";
import "./team-fate-awards.css";

type AwardCategory = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  criteria: string;
};

type AwardDate = {
  label: string;
  date: string;
  description: string;
};

type NominationPayload = {
  categoryId: string;
  nomineeName: string;
  reason: string;
};

type VotePayload = {
  categoryId: string;
  nomineeName: string;
};

type AwardWinner = {
  year: number;
  categoryId: string;
  categoryTitle: string;
  trainerName: string;
  message: string;
  spriteUrl?: string;
};

type TeamFateAwardsPageProps = {
  currentUser?: string;
  isStaff?: boolean;
  isAdmin?: boolean;
  nominationDates?: AwardDate[];
  onSubmitNomination?: (
    nomination: NominationPayload
  ) => Promise<void>;
  onSubmitVote?: (vote: VotePayload) => Promise<void>;
};

const AWARD_YEAR = 2026;

/*
 * Replace these placeholder dates with the dates approved by staff.
 * Use the visitor's intended timezone consistently across the backend
 * and frontend. These values are examples, not confirmed event dates.
 */
const DEFAULT_DATES: AwardDate[] = [
  {
    label: "Nominations Open",
    date: "",
    description: "The community can nominate deserving trainers.",
  },
  {
    label: "Nominations Close",
    date: "",
    description: "Final chance to submit a nomination.",
  },
  {
    label: "Voting Begins",
    date: "",
    description: "Eligible members choose the award winners.",
  },
  {
    label: "Winner Reveal",
    date: "",
    description: "The anniversary award winners are announced.",
  },
];

const AWARD_CATEGORIES: AwardCategory[] = [
  {
    id: "member-of-the-year",
    title: "Member of the Year",
    subtitle: "The MVP Award",
    description:
      "Recognizes the trainer who made the biggest overall impact on Team FATÉ.",
    icon: "👑",
    criteria:
      "Overall contribution, participation, dedication, and positive impact on the team.",
  },
  {
    id: "competitive-player",
    title: "Competitive Player of the Year",
    subtitle: "The Battle Ace",
    description:
      "Celebrates the member who stood out through competitive skill and performance.",
    icon: "⚔️",
    criteria:
      "Competitive results, improvement, sportsmanship, and involvement in team battles.",
  },
  {
    id: "teammate-of-the-year",
    title: "Teammate of the Year",
    subtitle: "The Heart of FATÉ",
    description:
      "Honors the trainer who consistently helps, supports, and brings members together.",
    icon: "🤝",
    criteria:
      "Reliability, helpfulness, teamwork, encouragement, and community spirit.",
  },
  {
    id: "rising-star",
    title: "Rising Star",
    subtitle: "The Next Legend",
    description:
      "Recognizes a newer or growing member who has made an impressive impact.",
    icon: "🌟",
    criteria:
      "Growth, enthusiasm, engagement, and promising contributions to Team FATÉ.",
  },
];

/*
 * Add official winners here after they have been confirmed.
 * Leaving this array empty avoids displaying invented winners.
 */
const HALL_OF_FAME: AwardWinner[] = [];

function formatDate(dateString: string): string {
  if (!dateString) return "To be announced";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date to be confirmed";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRemaining(dateString: string) {
  if (!dateString) return null;

  const target = new Date(dateString).getTime();

  if (Number.isNaN(target)) return null;

  const difference = target - Date.now();

  if (difference <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  return {
    expired: false,
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor(
      (difference / (1000 * 60 * 60)) % 24
    ),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export default function TeamFateAwardsPage({
  currentUser = "",
  isStaff = false,
  isAdmin = false,
  nominationDates = DEFAULT_DATES,
  onSubmitNomination,
  onSubmitVote,
}: TeamFateAwardsPageProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "nominate" | "vote" | "hall-of-fame"
  >("overview");

  const [selectedNominationCategory, setSelectedNominationCategory] =
    useState(AWARD_CATEGORIES[0].id);

  const [nomineeName, setNomineeName] = useState("");
  const [nominationReason, setNominationReason] = useState("");

  const [selectedVotes, setSelectedVotes] = useState<
    Record<string, string>
  >({});

  const [countdown, setCountdown] = useState<ReturnType<
    typeof getTimeRemaining
  >>(null);

  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [staffNotes, setStaffNotes] = useState("");
  const [reviewedNomination, setReviewedNomination] = useState("");

  const nominationDeadline = nominationDates.find((item) =>
    item.label.toLowerCase().includes("nominations close")
  );

  const votingDate = nominationDates.find((item) =>
    item.label.toLowerCase().includes("voting begins")
  );

  const revealDate = nominationDates.find((item) =>
    item.label.toLowerCase().includes("winner reveal")
  );

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(
        getTimeRemaining(nominationDeadline?.date ?? "")
      );
    };

    updateCountdown();

    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [nominationDeadline?.date]);

  const countdownLabel = useMemo(() => {
    if (!countdown) return "Dates coming soon";
    if (countdown.expired) return "The deadline has passed";

    return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;
  }, [countdown]);

  async function handleNominationSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setNotice("");

    if (!currentUser.trim()) {
      setNotice("Sign in with your Team FATÉ account to nominate a trainer.");
      return;
    }

    if (!nomineeName.trim() || !nominationReason.trim()) {
      setNotice("Enter a trainer name and explain why they deserve the award.");
      return;
    }

    if (!onSubmitNomination) {
      setNotice(
        "Nominations are not connected to the backend yet. Connect the nomination API before accepting submissions."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmitNomination({
        categoryId: selectedNominationCategory,
        nomineeName: nomineeName.trim(),
        reason: nominationReason.trim(),
      });

      setNomineeName("");
      setNominationReason("");
      setNotice("Your nomination was submitted successfully.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Your nomination could not be submitted. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVoteSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setNotice("");

    if (!currentUser.trim()) {
      setNotice("Sign in with your Team FATÉ account to vote.");
      return;
    }

    if (!onSubmitVote) {
      setNotice(
        "Voting is not connected to the backend yet. Connect the voting API before accepting ballots."
      );
      return;
    }

    const completedVotes = Object.entries(selectedVotes).filter(
      ([, trainer]) => trainer.trim()
    );

    if (completedVotes.length === 0) {
      setNotice("Choose at least one nominee before submitting your ballot.");
      return;
    }

    setIsSubmitting(true);

    try {
      for (const [categoryId, trainer] of completedVotes) {
        await onSubmitVote({
          categoryId,
          nomineeName: trainer,
        });
      }

      setSelectedVotes({});
      setNotice("Your ballot was submitted successfully.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Your ballot could not be submitted. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderNotice() {
    if (!notice) return null;

    return (
      <div
        className="awards-notice"
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
    );
  }

  return (
    <main className="fate-awards-page">
      <div className="awards-shell">
        {/* HERO */}
        <section className="awards-hero">
          <div className="awards-eyebrow">
            ✦ ONE YEAR. ONE TEAM. COUNTLESS MEMORIES. ✦
          </div>

          <h1>
            TEAM FATÉ
            <span>ANNIVERSARY AWARDS</span>
          </h1>

          <p className="awards-hero-description">
            Celebrating the trainers, teammates, and unforgettable
            moments that made our first year legendary.
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
              onClick={() => {
                setActiveTab("nominate");
                setNotice("");
              }}
            >
              Nominate a Trainer
            </button>

            <button
              type="button"
              className="outline-gold-button"
              onClick={() => {
                setActiveTab("vote");
                setNotice("");
              }}
            >
              Cast Your Vote
            </button>
          </div>
        </section>

        {/* NAVIGATION */}
        <nav
          className="awards-tabs"
          aria-label="Anniversary awards sections"
        >
          <button
            type="button"
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => {
              setActiveTab("overview");
              setNotice("");
            }}
          >
            Overview
          </button>

          <button
            type="button"
            className={activeTab === "nominate" ? "active" : ""}
            onClick={() => {
              setActiveTab("nominate");
              setNotice("");
            }}
          >
            Nominations
          </button>

          <button
            type="button"
            className={activeTab === "vote" ? "active" : ""}
            onClick={() => {
              setActiveTab("vote");
              setNotice("");
            }}
          >
            Voting
          </button>

          <button
            type="button"
            className={activeTab === "hall-of-fame" ? "active" : ""}
            onClick={() => {
              setActiveTab("hall-of-fame");
              setNotice("");
            }}
          >
            Hall of Fame
          </button>
        </nav>

        {renderNotice()}

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <section className="awards-panel important-dates">
              <div className="section-head">
                <div>
                  <span className="section-kicker">THE ROAD TO THE REVEAL</span>
                  <h2>Important Dates</h2>
                </div>

                <span className="section-icon">⌛</span>
              </div>

              <div className="date-grid">
                {nominationDates.map((item) => (
                  <article className="date-card" key={item.label}>
                    <span className="date-card-label">{item.label}</span>
                    <strong>{formatDate(item.date)}</strong>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>

              <div className="awards-countdown">
                <div>
                  <span className="countdown-label">
                    COUNTDOWN TO NOMINATION CLOSE
                  </span>
                  <strong>{countdownLabel}</strong>
                </div>
                <span className="countdown-icon">⏳</span>
              </div>
            </section>

            <section className="awards-panel">
              <div className="section-head">
                <div>
                  <span className="section-kicker">FOUR WAYS TO BE LEGENDARY</span>
                  <h2>The Anniversary Awards</h2>
                </div>
              </div>

              <div className="award-category-grid">
                {AWARD_CATEGORIES.map((category) => (
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

                      <button
                        type="button"
                        className="outline-gold-button"
                        onClick={() => {
                          setSelectedNominationCategory(category.id);
                          setActiveTab("nominate");
                          setNotice("");
                        }}
                      >
                        Nominate
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="awards-panel awards-steps">
              <div className="section-head">
                <div>
                  <span className="section-kicker">HOW IT WORKS</span>
                  <h2>From Nomination to Legend</h2>
                </div>
              </div>

              <div className="awards-steps-grid">
                <article>
                  <span className="step-number">01</span>
                  <h3>Nominate</h3>
                  <p>
                    Recognize a teammate and explain why they deserve
                    the award.
                  </p>
                </article>

                <article>
                  <span className="step-number">02</span>
                  <h3>Review</h3>
                  <p>
                    Staff review submissions and prepare the official
                    ballot.
                  </p>
                </article>

                <article>
                  <span className="step-number">03</span>
                  <h3>Vote</h3>
                  <p>
                    Eligible members vote for their choices in each
                    category.
                  </p>
                </article>

                <article>
                  <span className="step-number">04</span>
                  <h3>Celebrate</h3>
                  <p>
                    The winners are revealed and added to the
                    permanent Hall of Fame.
                  </p>
                </article>
              </div>
            </section>

            <section className="awards-panel winner-reveal-section">
              <div className="section-head">
                <div>
                  <span className="section-kicker">THE LEGENDS WILL BE REMEMBERED</span>
                  <h2>Winner Reveal</h2>
                </div>
              </div>

              <p className="section-description">
                The official winners will appear here once results
                have been verified and released.
              </p>

              <div className="winner-grid">
                {AWARD_CATEGORIES.map((category) => (
                  <article
                    className="winner-card winner-pending"
                    key={category.id}
                  >
                    <div className="winner-medal">{category.icon}</div>
                    <span className="winner-award-label">
                      {category.subtitle}
                    </span>
                    <h3>{category.title}</h3>
                    <div className="winner-placeholder">
                      <span>?</span>
                    </div>
                    <p className="winner-name">Winner to be revealed</p>
                    <p className="winner-message">
                      The next name in Team FATÉ history has yet to be
                      announced.
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="awards-panel hall-of-fame-preview">
              <div className="section-head">
                <div>
                  <span className="section-kicker">A LEGACY THAT LASTS</span>
                  <h2>Hall of Fame</h2>
                </div>

                <button
                  type="button"
                  className="outline-gold-button"
                  onClick={() => setActiveTab("hall-of-fame")}
                >
                  View Hall of Fame
                </button>
              </div>

              <p className="section-description">
                Every anniversary adds another chapter to the history
                of Team FATÉ. Award winners will remain here for future
                members to remember.
              </p>
            </section>
          </>
        )}

        {/* NOMINATIONS */}
        {activeTab === "nominate" && (
          <section className="awards-panel nomination-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">GIVE A TEAMMATE THEIR MOMENT</span>
                <h2>Submit a Nomination</h2>
              </div>
              <span className="section-icon">✍️</span>
            </div>

            <p className="section-description">
              Choose an award, enter the trainer's name, and tell us
              what makes them deserving of recognition.
            </p>

            <form
              className="awards-form"
              onSubmit={handleNominationSubmit}
            >
              <label htmlFor="nomination-category">
                Award Category
              </label>

              <select
                id="nomination-category"
                value={selectedNominationCategory}
                onChange={(event) =>
                  setSelectedNominationCategory(event.target.value)
                }
                required
              >
                {AWARD_CATEGORIES.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>

              <label htmlFor="nominee-name">
                Trainer to Nominate
              </label>

              <input
                id="nominee-name"
                type="text"
                value={nomineeName}
                onChange={(event) => setNomineeName(event.target.value)}
                placeholder="Enter their in-game trainer name"
                maxLength={80}
                required
              />

              <label htmlFor="nomination-reason">
                Why do they deserve this award?
              </label>

              <textarea
                id="nomination-reason"
                value={nominationReason}
                onChange={(event) =>
                  setNominationReason(event.target.value)
                }
                placeholder="Share what they have done for Team FATÉ..."
                rows={6}
                maxLength={1500}
                required
              />

              <p className="form-help">
                Keep nominations respectful and specific. Staff may
                review nominations before they appear on the ballot.
              </p>

              <button
                type="submit"
                className="gold-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Nomination"}
              </button>
            </form>
          </section>
        )}

        {/* VOTING */}
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
              Select your choice in each award category. You can leave
              a category blank if you do not wish to vote in it.
            </p>

            <div className="staff-note">
              <strong>Fair voting matters.</strong>
              <p>
                The official system should enforce one ballot per
                eligible member per category. Individual votes and
                live vote totals should not be shown publicly.
              </p>
            </div>

            <form className="awards-form" onSubmit={handleVoteSubmit}>
              {AWARD_CATEGORIES.map((category) => (
                <div className="vote-category" key={category.id}>
                  <label htmlFor={`vote-${category.id}`}>
                    <span>{category.icon}</span>
                    {category.title}
                  </label>

                  <input
                    id={`vote-${category.id}`}
                    type="text"
                    value={selectedVotes[category.id] ?? ""}
                    onChange={(event) =>
                      setSelectedVotes((previous) => ({
                        ...previous,
                        [category.id]: event.target.value,
                      }))
                    }
                    placeholder="Enter a verified ballot nominee"
                    maxLength={80}
                  />
                </div>
              ))}

              <p className="form-help">
                This form expects the backend to validate each nominee
                against the official ballot. It does not load verified
                nominees by itself.
              </p>

              <button
                type="submit"
                className="gold-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Ballot"}
              </button>
            </form>
          </section>
        )}

        {/* HALL OF FAME */}
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
              A permanent record of the trainers who have earned
              anniversary honors throughout Team FATÉ's history.
            </p>

            {HALL_OF_FAME.length === 0 ? (
              <div className="awards-empty-state">
                <span className="empty-state-icon">🏆</span>
                <h3>The Hall of Fame awaits its first legends</h3>
                <p>
                  Official winners will be added here after the
                  anniversary awards are completed.
                </p>
                <button
                  type="button"
                  className="outline-gold-button"
                  onClick={() => setActiveTab("overview")}
                >
                  Back to Awards
                </button>
              </div>
            ) : (
              <div className="winner-grid">
                {HALL_OF_FAME.map((winner) => (
                  <article
                    className="winner-card"
                    key={`${winner.year}-${winner.categoryId}-${winner.trainerName}`}
                  >
                    <span className="winner-award-label">
                      {winner.year} ANNIVERSARY
                    </span>

                    {winner.spriteUrl ? (
                      <img
                        className="winner-avatar"
                        src={winner.spriteUrl}
                        alt={`${winner.trainerName}'s trainer sprite`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="winner-placeholder">
                        <span>🏆</span>
                      </div>
                    )}

                    <h3>{winner.trainerName}</h3>
                    <p className="winner-name">{winner.categoryTitle}</p>
                    <p className="winner-message">{winner.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* STAFF REVIEW */}
        {isStaff && (
          <section className="awards-panel review-block">
            <div className="section-head">
              <div>
                <span className="section-kicker">STAFF ACCESS</span>
                <h2>Awards Review</h2>
              </div>
              <span className="section-icon">🛡️</span>
            </div>

            <p className="section-description">
              Staff tools belong behind role checks and authenticated
              backend endpoints. This section is a starting point for
              the review workflow.
            </p>

            <div className="staff-note">
              <strong>Recommended review workflow</strong>
              <ul>
                <li>Review incoming nominations.</li>
                <li>Approve or reject nominations with a reason.</li>
                <li>Publish the verified candidate list.</li>
                <li>Close voting before verifying the final results.</li>
                <li>Publish winners and archive the completed year.</li>
              </ul>
            </div>

            <label htmlFor="staff-review-notes">
              Internal review notes
            </label>

            <textarea
              id="staff-review-notes"
              value={staffNotes}
              onChange={(event) => setStaffNotes(event.target.value)}
              rows={4}
              placeholder="Record internal review notes..."
            />

            <label htmlFor="review-nomination-id">
              Nomination reference
            </label>

            <input
              id="review-nomination-id"
              type="text"
              value={reviewedNomination}
              onChange={(event) =>
                setReviewedNomination(event.target.value)
              }
              placeholder="Enter a backend nomination ID"
            />

            <p className="form-help">
              These fields do not save or approve nominations. Connect
              them to staff-authorized backend actions before use.
            </p>

            {isAdmin && (
              <div className="staff-note">
                <strong>Administrator controls</strong>
                <p>
                  Reserve ballot audits, voter identity access, date
                  configuration, and final result publishing for
                  authorized administrators. Never expose ballot
                  identities or private totals to ordinary members.
                </p>
              </div>
            )}
          </section>
        )}

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
