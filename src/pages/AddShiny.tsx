import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

export default function AddShiny() {
  const [pokemon, setPokemon] =
    useState<any[]>([]);

  const [profiles, setProfiles] =
    useState<any[]>([]);

  const [pokemonId, setPokemonId] =
    useState("");

  const [profileId, setProfileId] =
    useState("");

  const [dateFound, setDateFound] =
    useState("");

  const [method, setMethod] =
    useState("");

  const [notes, setNotes] =
    useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const pokemonResult =
      await supabase
        .from("pokemon")
        .select("*")
        .order("name");

    const profileResult =
      await supabase
        .from("profiles")
        .select("*")
        .order("username");

    setPokemon(
      pokemonResult.data || []
    );

    setProfiles(
      profileResult.data || []
    );
  }

  async function addShiny() {
    const { error } =
      await supabase
        .from("shiny_catches")
        .insert({
          pokemon_id:
            Number(pokemonId),
          profile_id:
            profileId,
          date_found:
            dateFound,
          method,
          notes,
        });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Shiny added");
  }

  return (
    <div className="page">

      <h1>Add Shiny</h1>

      <div className="card">

        <select
          value={pokemonId}
          onChange={(e) =>
            setPokemonId(
              e.target.value
            )
          }
        >
          <option>
            Select Pokémon
          </option>

          {pokemon.map((p) => (
            <option
              key={p.id}
              value={p.id}
            >
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={profileId}
          onChange={(e) =>
            setProfileId(
              e.target.value
            )
          }
        >
          <option>
            Select Member
          </option>

          {profiles.map((p) => (
            <option
              key={p.id}
              value={p.id}
            >
              {p.username}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFound}
          onChange={(e) =>
            setDateFound(
              e.target.value
            )
          }
        />

        <input
          placeholder="Method"
          value={method}
          onChange={(e) =>
            setMethod(
              e.target.value
            )
          }
        />

        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) =>
            setNotes(
              e.target.value
            )
          }
        />

        <button
          onClick={addShiny}
        >
          Add Shiny
        </button>

      </div>

    </div>
  );
}