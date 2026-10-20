import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
  const [fogVisible, setFogVisible] = useState(true);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(() => new Set());
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.2);
  const [musicMuted, setMusicMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [, setMessage] = useState("");

  useEffect(() => {
    document.body.classList.add("shiny-graveyard-theme");
    const fogTimer = window.setTimeout(() => setFogVisible(false), 15000);

    // Try autoplay on page entry. Browsers may block audio until the visitor interacts.
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.2;
      const playAttempt = audio.play();
      if (playAttempt) {
        playAttempt
          .then(() => {
            setMusicPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch(() => {
            setMusicPlaying(false);
            setAutoplayBlocked(true);
          });
      }
    }

    void loadEntries();

    return () => {
      document.body.classList.remove("shiny-graveyard-theme");
      window.clearTimeout(fogTimer);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
      audioRef.current.muted = musicMuted;
    }
  }, [musicVolume, musicMuted]);

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
      return;
    }

    try {
      await audio.play();
      setMusicPlaying(true);
      setAutoplayBlocked(false);
    } catch (error) {
      console.error("Could not play Shiny Graveyard music:", error);
      setAutoplayBlocked(true);
    }
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

  return (
    <div className="graveyard-page">
      <audio
        ref={audioRef}
        src="/audio/in-the-arms-of-fate.mp3"
        loop
        preload="auto"
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
      />
      <div className="graveyard-music-control-wrap">
        <div className="graveyard-music-controls">
          <button
            type="button"
            className="graveyard-music-control"
            onClick={() => void toggleMusic()}
            aria-label={musicPlaying ? "Pause Shiny Graveyard music" : "Play Shiny Graveyard music"}
          >
            <span aria-hidden="true">{musicPlaying ? "Ⅱ" : "♫"}</span>
            {musicPlaying ? "Pause music" : autoplayBlocked ? "Play graveyard music" : "Play music"}
          </button>
          <button
            type="button"
            className="graveyard-music-control graveyard-mute-control"
            onClick={() => setMusicMuted((muted) => !muted)}
            aria-pressed={musicMuted}
          >
            {musicMuted ? "Unmute" : "Mute"}
          </button>
        </div>
        <label className="graveyard-volume-control">
          <span>Volume</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={musicVolume * 100}
            onChange={(event) => setMusicVolume(Number(event.target.value) / 100)}
            aria-label="Graveyard music volume"
          />
          <span className="graveyard-volume-value">{Math.round(musicVolume * 100)}%</span>
        </label>
        {autoplayBlocked && !musicPlaying && (
          <span className="graveyard-music-hint">Your browser blocked autoplay. Press play to start the music.</span>
        )}
      </div>
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
          <span className="graveyard-kicker">HONOR THE LOST</span>
          <h2>Have a Shiny That Got Away?</h2>
          <p>Give the encounter a place in Team Faté history. Every memorial is reviewed by staff before it appears here.</p>
          <Link className="graveyard-submit-link" to="/shiny-graveyard/submit">🪦 Submit a Lost Shiny</Link>
        </div>
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
                {entry.story && (
                  <div className={`grave-marker-story-wrap${expandedStories.has(entry.id) ? " is-expanded" : ""}`}>
                    <p className="grave-marker-story">“{entry.story}”</p>
                    {entry.story.length > 220 && (
                      <button
                        type="button"
                        className="grave-marker-toggle"
                        aria-expanded={expandedStories.has(entry.id)}
                        onClick={() => {
                          setExpandedStories((current) => {
                            const next = new Set(current);
                            if (next.has(entry.id)) next.delete(entry.id);
                            else next.add(entry.id);
                            return next;
                          });
                        }}
                      >
                        {expandedStories.has(entry.id) ? "Collapse story ↑" : "Read full story ↓"}
                      </button>
                    )}
                  </div>
                )}
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
