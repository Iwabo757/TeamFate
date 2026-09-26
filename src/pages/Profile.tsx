import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  getAchievements,
  getUnlockedAchievements,
} from "../lib/fateProgression";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [shinies, setShinies] = useState<any[]>([]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [eventWins, setEventWins] = useState(0);
  const [bountyCaught, setBountyCaught] = useState(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [selectedPokemon, setSelectedPokemon] = useState<any>(null);

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
      .select(
        "pokemon_id, method, date_found, pokemon (id, name)"
      )
      .eq("profile_id", user.id);

    const shinyRows = catches || [];
    setShinies(shinyRows);

    const { data: tx } = await supabase
      .from("fate_point_transactions")
      .select("amount")
      .eq("profile_id", user.id);

    setPoints(
      (tx || []).reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0
      )
    );

    const { data: daily } = await supabase
      .from("fate_daily_completions")
      .select("streak")
      .eq("profile_id", user.id)
      .order("challenge_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setStreak(Number(daily?.streak || 0));

    const { count: participation } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .or(
        `first_place.eq.${user.id},second_place.eq.${user.id},third_place.eq.${user.id},fourth_place.eq.${user.id}`
      );

    const { count: wins } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("first_place", user.id);

    const { count: bountyCaught } = await supabase
      .from("bounties")
      .select("id", { count: "exact", head: true })
      .eq("claimed_by", user.id)
      .eq("claimed", true);

    setEventWins(wins || 0);

    const { count: bountyCount } = await supabase
      .from("bounties")
      .select("id", { count: "exact", head: true })
      .eq("claimed", true)
      .eq("claimed_by", user.id);

    setBountyCaught(bountyCount || 0);

    const {
      data: achievementRows,
      error: achievementError,
    } = await getAchievements();

    if (!achievementError) {
      setAchievements(
        getUnlockedAchievements({
          achievements: achievementRows,
          shinyCount: shinyRows.length,
          eventCount: participation || 0,
          eventWins: wins || 0,
          dailyStreak: Number(daily?.streak || 0),
          bountyCaught: bountyCount || 0,
          bountyCaught: bountyCaught || 0,
        })
      );
    }
  }

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="profile-page">
      <img
        src={profile.avatar_url}
        alt=""
        className="profile-avatar"
      />

      <h1>{profile.nickname || profile.username}</h1>
      <p>Role: {profile.role}</p>
      <p>Discord ID: {profile.discord_id}</p>

      <div className="event-grid">
        <div className="card">
          <h2>⭐ Faté Points</h2>
          <strong style={{ fontSize: 28 }}>
            {points.toLocaleString()}
          </strong>
        </div>

        <div className="card">
          <h2>✨ Shinies</h2>
          <strong style={{ fontSize: 28 }}>
            {shinies.length}
          </strong>
        </div>

        <div className="card">
          <h2>🔥 Daily Streak</h2>
          <strong style={{ fontSize: 28 }}>
            {streak}
          </strong>
        </div>

        <div className="card">
          <h2>🏆 Event Wins</h2>
          <strong style={{ fontSize: 28 }}>
            {eventWins}
          </strong>
        </div>
      </div>

      <h2>🏆 Achievements</h2>

      <div className="event-grid">
        {achievements.map((a) => (
          <div
            className="card"
            key={a.id || a.key}
            style={{
              opacity: a.unlocked ? 1 : 0.45,
            }}
          >
            <div style={{ fontSize: 32 }}>
              {a.icon}
            </div>

            <h3>{a.name}</h3>

            <p>{a.description}</p>

            <p>
              Progress:{" "}
              <strong>
                {Math.min(
                  a.currentValue,
                  a.threshold
                )}{" "}
                / {a.threshold}
              </strong>
            </p>

            <strong>
              {a.unlocked
                ? `✓ Unlocked · +${a.reward}`
                : `Locked · +${a.reward}`}
            </strong>
          </div>
        ))}
      </div>

      <h2>My Shinies</h2>

      <div className="dex-grid">
        {shinies.map((entry) => (
          <div
            key={`${entry.pokemon_id}-${entry.date_found}`}
            className="dex-card caught"
            onClick={() =>
              setSelectedPokemon(entry)
            }
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
          onClick={() =>
            setSelectedPokemon(null)
          }
        >
          <div
            className="pokemon-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close-btn"
              onClick={() =>
                setSelectedPokemon(null)
              }
            >
              ×
            </button>

            <h2>
              #{selectedPokemon.pokemon.id}{" "}
              {selectedPokemon.pokemon.name}
            </h2>

            <p>
              Method: {selectedPokemon.method}
            </p>

            <p>
              Caught:{" "}
              {new Date(
                selectedPokemon.date_found
              ).toLocaleDateString()}
            </p>

            <p>
              Owned by{" "}
              {profile.nickname ||
                profile.username}
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
