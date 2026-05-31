import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AddShiny() {
  const [pokemon, setPokemon] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [pokemonId, setPokemonId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [dateFound, setDateFound] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const pokemonResult = await supabase
      .from("pokemon")
      .select("*")
      .order("name");

    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .order("nickname");

    setPokemon(pokemonResult.data || []);
    setProfiles(profileResult.data || []);
  }

  async function uploadScreenshot() {
    if (!imageFile) return null;

    const fileName =
      `${Date.now()}-${imageFile.name}`;

    const { error } = await supabase
      .storage
      .from("shiny-screenshots")
      .upload(fileName, imageFile);

    if (error) {
      throw error;
    }

    const { data } = supabase
      .storage
      .from("shiny-screenshots")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function addShiny() {
    try {
      if (
        !pokemonId ||
        !profileId ||
        !dateFound
      ) {
        alert(
          "Please fill out all required fields."
        );
        return;
      }

      setLoading(true);

      let screenshotUrl = null;

      if (imageFile) {
        screenshotUrl =
          await uploadScreenshot();
      }

      const { error } = await supabase
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
          screenshot_url:
            screenshotUrl,
        });

      if (error) {
        throw error;
      }

      alert("Shiny added!");

      setPokemonId("");
      setProfileId("");
      setDateFound("");
      setMethod("");
      setNotes("");
      setImageFile(null);
      setPreviewUrl("");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setImageFile(file);
    setPreviewUrl(
      URL.createObjectURL(file)
    );
  }

  return (
    <div className="page">

      <h1 className="page-title">
        Add Shiny
      </h1>

      <div className="card">

        <div className="admin-form">

          <select
            value={pokemonId}
            onChange={(e) =>
              setPokemonId(
                e.target.value
              )
            }
          >
            <option value="">
              Select Pokémon
            </option>

            {pokemon.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.name}
                {" • "}
                {p.region}
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
            <option value="">
              Select Member
            </option>

            {profiles.map((p) => (
              <option
                key={p.id}
                value={p.id}
              >
                {p.nickname ||
                  p.username}
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

          <select
            value={method}
            onChange={(e) =>
              setMethod(
                e.target.value
              )
            }
          >
            <option value="">
              Select Method
            </option>

            <option>
              Horde
            </option>

            <option>
              Single Encounter
            </option>

            <option>
              Egg
            </option>

            <option>
              Fishing
            </option>

            <option>
              Safari
            </option>

            <option>
              Gift
            </option>

            <option>
              Other
            </option>
          </select>

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) =>
              setNotes(
                e.target.value
              )
            }
          />

          <div>
            <label>
              Screenshot
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={
                handleImageChange
              }
            />
          </div>

          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                width: "100%",
                maxWidth: "500px",
                borderRadius:
                  "12px",
              }}
            />
          )}

          <button
            className="submit-btn"
            disabled={loading}
            onClick={addShiny}
          >
            {loading
              ? "Uploading..."
              : "Add Shiny"}
          </button>

        </div>

      </div>

    </div>
  );
}