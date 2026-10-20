import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./ShinyGraveyard.css";

type PokemonOption = { id: number | string; name: string; region?: string | null };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_STORY_LENGTH = 10000;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function SubmitShinyGraveyard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [pokemon, setPokemon] = useState<PokemonOption[]>([]);
  const [pokemonQuery, setPokemonQuery] = useState("");
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonOption | null>(null);
  const [encounterDate, setEncounterDate] = useState("");
  const [causeOfLoss, setCauseOfLoss] = useState("Fainted");
  const [story, setStory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let preview = "";
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase.from("profiles").select("nickname, username, discord_name").eq("id", user.id).maybeSingle();
        setMemberName(profile?.nickname || profile?.username || profile?.discord_name || user.user_metadata?.name || user.email?.split("@")[0] || "Member");
      }
      const { data, error } = await supabase.from("pokemon").select("id, name, region").order("name");
      if (!error && data) setPokemon(data as PokemonOption[]);
      else console.error("Could not load Pokémon autocomplete list:", error?.message);
      setLoading(false);
    }
    void init();
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, []);

  const matches = useMemo(() => {
    const q = pokemonQuery.trim().toLowerCase();
    if (!q || selectedPokemon?.name.toLowerCase() === q) return [];
    return pokemon.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [pokemon, pokemonQuery, selectedPokemon]);

  function chooseImage(file?: File) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMessage("Please choose a PNG, JPG, WEBP, or GIF image."); return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setMessage("Image must be 8 MB or smaller."); return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!userId) { setMessage("Please log in before submitting a memorial."); return; }
    if (!selectedPokemon) { setMessage("Choose a Pokémon from the autocomplete suggestions."); return; }
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const extension = imageFile.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from("shiny-graveyard-images").upload(path, imageFile, { upsert: false, contentType: imageFile.type });
        if (upload.error) throw new Error(`Image upload failed: ${upload.error.message}. Check the shiny-graveyard-images storage bucket and its upload policy.`);
        const { data } = supabase.storage.from("shiny-graveyard-images").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
      const { error } = await supabase.from("shiny_graveyard_submissions").insert({
        user_id: userId,
        pokemon_name: selectedPokemon.name,
        trainer_name: memberName,
        encounter_date: encounterDate || null,
        cause_of_loss: causeOfLoss,
        story: story.trim() || null,
        image_url: imageUrl,
        status: "pending",
      });
      if (error) throw error;
      setMessage("Memorial submitted for staff approval. May your shiny rest in peace.");
      window.setTimeout(() => navigate("/shiny-graveyard"), 1800);
    } catch (error) {
      console.error("Shiny Graveyard submission failed:", error);
      setMessage(error instanceof Error ? error.message : "Submission failed. Please try again.");
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="graveyard-page"><p className="graveyard-empty">The mist is clearing...</p></div>;

  return <div className="graveyard-page graveyard-submit-page">
    <header className="graveyard-hero">
      <p className="graveyard-eyebrow">TEAM FATÉ • MEMORIAL RECORDS</p>
      <h1>Lay a Shiny to Rest</h1>
      <p className="graveyard-subtitle">A lost encounter should never be forgotten.</p>
      <div className="graveyard-divider"><span>✦</span></div>
    </header>
    {!userId ? <div className="graveyard-submission-panel graveyard-login-note"><p>You must be logged in to submit a memorial.</p><a href="/login">Log in to the site</a></div> :
      <form className="graveyard-form graveyard-submission-panel" onSubmit={handleSubmit}>
        <div className="graveyard-form-wide graveyard-member-display"><span>Submitting as</span><strong>{memberName || "Your member account"}</strong><small>Your member name is filled automatically from your account.</small></div>
        <label className="graveyard-form-wide">Shiny Pokémon
          <input value={pokemonQuery} onChange={(e) => { setPokemonQuery(e.target.value); setSelectedPokemon(null); }} placeholder="Start typing a Pokémon name…" autoComplete="off" required />
          {matches.length > 0 && <div className="graveyard-autocomplete" role="listbox">{matches.map((p) => <button type="button" key={p.id} role="option" onClick={() => { setSelectedPokemon(p); setPokemonQuery(p.name); }}>{p.name}{p.region ? <span> · {p.region}</span> : null}</button>)}</div>}
          {selectedPokemon && <small className="graveyard-selected">Selected: {selectedPokemon.name}</small>}
        </label>
        <label>Date of encounter <span>(optional)</span><input type="date" value={encounterDate} onChange={(e) => setEncounterDate(e.target.value)} /></label>
        <label>Cause of loss<select value={causeOfLoss} onChange={(e) => setCauseOfLoss(e.target.value)}><option>Fainted</option><option>Fled / ran away</option><option>Poké Balls ran out</option><option>Accidental escape</option><option>Disconnected</option><option>Other cruel fate</option></select></label>
        <label className="graveyard-form-wide">The story <span>(optional)</span>
          <textarea value={story} onChange={(e) => setStory(e.target.value)} maxLength={MAX_STORY_LENGTH} rows={8} placeholder="Tell us how this shiny met its untimely end…" />
          <small className="graveyard-story-count">{story.length.toLocaleString()} / {MAX_STORY_LENGTH.toLocaleString()} characters</small>
        </label>
        <label className="graveyard-form-wide">Screenshot <span>(optional · PNG, JPG, WEBP, or GIF · 8 MB max)</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => chooseImage(e.target.files?.[0])} />{previewUrl && <img className="graveyard-upload-preview" src={previewUrl} alt="Screenshot preview" />}</label>
        <div className="graveyard-form-footer graveyard-form-wide"><p>Submissions remain private until a staff member approves them.</p><button type="submit" disabled={submitting || !selectedPokemon}>{submitting ? "Placing memorial…" : "Submit Memorial for Review"}</button></div>
        {message && <p className="graveyard-message graveyard-form-wide" role="status">{message}</p>}
      </form>}
    <p className="graveyard-back-link"><Link to="/shiny-graveyard">← Return to the Shiny Graveyard</Link></p>
  </div>;
}
