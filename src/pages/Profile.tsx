import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);

const [shinies, setShinies] =
  useState<any[]>([]);

const [selectedPokemon, setSelectedPokemon] =
  useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);

const { data: catches } = await supabase
  .from("shiny_catches")
  .select(`
    pokemon_id,
    method,
    date_found,
    pokemon (
      id,
      name
    )
  `)
  .eq("profile_id", user.id);

setShinies(catches || []);
  }

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile-page">
      <img
        src={profile.avatar_url}
        alt=""
        className="profile-avatar"
      />

<h1>
  {profile.nickname ||
    profile.username}
</h1>

      <p>Role: {profile.role}</p>

      <p>Discord ID: {profile.discord_id}</p>

<h2>My Shinies</h2>

<div className="dex-grid">
  {shinies.map((entry) => (
    <div
      key={entry.pokemon_id}
      className="dex-card caught"
      onClick={() => setSelectedPokemon(entry)}
    >
      <img
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${entry.pokemon_id}.png`}
        alt={entry.pokemon.name}
      />

      <span>{entry.pokemon.name}</span>
    </div>
  ))}
</div>

{selectedPokemon && (
  <div
    className="modal-overlay"
    onClick={() => setSelectedPokemon(null)}
  >
    <div
      className="pokemon-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="close-btn"
        onClick={() => setSelectedPokemon(null)}
      >
        ×
      </button>

      <h2>
        #{selectedPokemon.pokemon.id}{" "}
        {selectedPokemon.pokemon.name}
      </h2>
<p>Method: {selectedPokemon.method}</p>

<p>
  Caught:{" "}
  {new Date(
    selectedPokemon.date_found
  ).toLocaleDateString()}
</p>

      <p>
        Owned by{" "}
        {profile.nickname || profile.username}
      </p>

      <img
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${selectedPokemon.pokemon_id}.png`}
        alt={selectedPokemon.pokemon.name}
        className="modal-sprite"
      />

    </div>
  </div>
)}


    </div>
  );
}
