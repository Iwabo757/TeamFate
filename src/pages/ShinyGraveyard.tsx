import { type FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./ShinyGraveyard.css";

type GraveyardEntry = {
  id: string;
  pokemon_name: string;
  trainer_name: string;
  encounter_date: string | null;
  cause_of_loss: string;
  story: string | null;
  image_url: string | null;
  created_at: string;
};

export default function ShinyGraveyard() {
  const [entries, setEntries] = useState<GraveyardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fogVisible, setFogVisible] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState("");
  const [pokemonName, setPokemonName] = useState("");
  const [encounterDate, setEncounterDate] = useState("");
  const [causeOfLoss, setCauseOfLoss] = useState("Fainted");
  const [story, setStory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.body.classList.add("shiny-graveyard-theme");
    const fogTimer = window.setTimeout(() => setFogVisible(false), 15000);

    void loadEntries();
    void loadCurrentUser();

    return () => {
      document.body.classList.remove("shiny-graveyard-theme");
      window.clearTimeout(fogTimer);
    };
  }, []);

  async function loadCurrentUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setUserId(null);
      return;
    }

    setUserId(data.user.id);
    const metadataName =
      data.user.user_metadata?.name ||
      data.user.user_metadata?.username ||
      data.user.email?.split("@")[0] ||
      "";
    setTrainerName(metadataName);
  }

  async function loadEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from("shiny_graveyard_submissions")
      .select("id, pokemon_name, trainer_name, encounter_date, cause_of_loss, story, image_url, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Unable to load Shiny Graveyard entries:", error.message);
      setMessage("The memorial gallery could not load. The database table may need to be set up.");
    } else {
      setEntries((data || []) as GraveyardEntry[]);
    }
    setLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!userId) {
      setMessage("Please log in before submitting a lost shiny memorial.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("shiny_graveyard_submissions").insert({
      user_id: userId,
      pokemon_name: pokemonName.trim(),
      trainer_name: trainerName.trim(),
      encounter_date: encounterDate || null,
      cause_of_loss: causeOfLoss,
      story: story.trim() || null,
      image_url: imageUrl.trim() || null,
      status: "pending",
    });

    if (error) {
      console.error("Unable to submit Shiny Graveyard entry:", error.message);
      setMessage("Your memorial could not be submitted. Please check the database setup and try again.");
    } else {
      setMessage("Your memorial has been submitted for review. May your shiny rest in peace.");
      setPokemonName("");
      setEncounterDate("");
      setCauseOfLoss("Fainted");
      setStory("");
      setImageUrl("");
    }
    setSubmitting(false);
  }

  return (
    <div className="graveyard-page">
      {fogVisible && (
        <div className="graveyard-fog" aria-hidden="true">
          <span className="fog-layer fog-layer-one" />
          <span className="fog-layer fog-layer-two" />
          <span className="fog-layer fog-layer-three" />
        </div>
      )}

      <header className="graveyard-hero">
        <p className="graveyard-eyebrow">TEAM FATÉ • MEMORIAL GROUNDS</p>
        <h1>The Shiny Graveyard</h1>
        <p className="graveyard-subtitle">
          Not every shiny makes it home. Here lie the ones that got away.
        </p>
        <div className="graveyard-divider"><span>✦</span></div>
        <p className="graveyard-intro">
          A place to remember the rare encounters lost to a critical hit, a broken
          Poké Ball plan, a runaway, or one cruel twist of fate. Their names—and
          their stories—live on.
        </p>
      </header>

      <section className="graveyard-stats" aria-label="Graveyard statistics">
        <div className="graveyard-stat">
          <span className="graveyard-stat-number">{entries.length}</span>
          <span className="graveyard-stat-label">Memorials</span>
        </div>
        <div className="graveyard-stat">
          <span className="graveyard-stat-icon">☾</span>
          <span className="graveyard-stat-label">Gone, not forgotten</span>
        </div>
        <div className="graveyard-stat">
          <span className="graveyard-stat-icon">✝</span>
          <span className="graveyard-stat-label">Resting in peace</span>
        </div>
      </section>

      <section className="graveyard-submission-panel">
        <div className="graveyard-section-heading">
          <span className="graveyard-kicker">LEAVE A TRIBUTE</span>
          <h2>Memorialize a Lost Shiny</h2>
          <p>Submit your story. After staff approval, it will be added to the graveyard.</p>
        </div>

        {!userId ? (
          <div className="graveyard-login-note">
            <p>You must be logged in to submit a memorial.</p>
            <a href="/login">Log in to the site</a>
          </div>
        ) : (
          <form className="graveyard-form" onSubmit={handleSubmit}>
            <label>
              Trainer name
              <input
                value={trainerName}
                onChange={(event) => setTrainerName(event.target.value)}
                maxLength={60}
                required
                placeholder="Your in-game name"
              />
            </label>
            <label>
              Shiny Pokémon
              <input
                value={pokemonName}
                onChange={(event) => setPokemonName(event.target.value)}
                maxLength={80}
                required
                placeholder="The shiny that got away"
              />
            </label>
            <label>
              Date of encounter <span>(optional)</span>
              <input
                type="date"
                value={encounterDate}
                onChange={(event) => setEncounterDate(event.target.value)}
              />
            </label>
            <label>
              Cause of loss
              <select value={causeOfLoss} onChange={(event) => setCauseOfLoss(event.target.value)}>
                <option>Fainted</option>
                <option>Fled / ran away</option>
                <option>Poké Balls ran out</option>
                <option>Accidental escape</option>
                <option>Disconnected</option>
                <option>Other cruel fate</option>
              </select>
            </label>
            <label className="graveyard-form-wide">
              The story <span>(optional)</span>
              <textarea
                value={story}
                onChange={(event) => setStory(event.target.value)}
                maxLength={1500}
                rows={4}
                placeholder="Tell us how this shiny met its untimely end..."
              />
            </label>
            <label className="graveyard-form-wide">
              Screenshot URL <span>(optional)</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                maxLength={1000}
                placeholder="https://..."
              />
            </label>
            <div className="graveyard-form-footer graveyard-form-wide">
              <p>Submissions are held for staff review before appearing publicly.</p>
              <button type="submit" disabled={submitting}>
                {submitting ? "Placing memorial..." : "Lay This Shiny to Rest"}
              </button>
            </div>
          </form>
        )}
        {message && <p className="graveyard-message" role="status">{message}</p>}
      </section>

      <section className="graveyard-gallery-section">
        <div className="graveyard-section-heading">
          <span className="graveyard-kicker">THE FALLEN</span>
          <h2>Those Who Got Away</h2>
          <p>Each stone marks a story that deserves to be remembered.</p>
        </div>

        {loading ? (
          <p className="graveyard-empty">The mist is clearing...</p>
        ) : entries.length === 0 ? (
          <div className="graveyard-empty">
            <span className="graveyard-empty-icon">🪦</span>
            <h3>The grounds are quiet... for now.</h3>
            <p>No approved memorials have been entered yet. Be the first to honor a lost shiny.</p>
          </div>
        ) : (
          <div className="graveyard-grid">
            {entries.map((entry) => (
              <article className="grave-marker" key={entry.id}>
                <div className="grave-marker-top"><span>✦</span></div>
                {entry.image_url ? (
                  <img className="grave-marker-image" src={entry.image_url} alt={`${entry.pokemon_name} memorial`} loading="lazy" />
                ) : (
                  <div className="grave-marker-silhouette" aria-hidden="true">☠</div>
                )}
                <p className="grave-marker-label">IN LOVING MEMORY OF</p>
                <h3>{entry.pokemon_name}</h3>
                <p className="grave-marker-trainer">Lost by {entry.trainer_name}</p>
                <div className="grave-marker-rule" />
                <p className="grave-marker-cause">{entry.cause_of_loss}</p>
                {entry.story && <p className="grave-marker-story">“{entry.story}”</p>}
                {entry.encounter_date && (
                  <p className="grave-marker-date">
                    Encountered {new Date(`${entry.encounter_date}T12:00:00`).toLocaleDateString()}
                  </p>
                )}
                <p className="grave-marker-rest">MAY IT REST IN PEACE</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="graveyard-footer">
        <p>“The rarest lights sometimes fade the fastest.”</p>
        <span>TEAM FATÉ • NEVER FORGOTTEN</span>
      </footer>
    </div>
  );
}
