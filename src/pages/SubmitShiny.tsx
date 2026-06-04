import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function SubmitShiny() {
  const [pokemon, setPokemon] = useState<any[]>([]);
  const [pokemonId, setPokemonId] = useState("");

  const [dateFound, setDateFound] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

const [profile, setProfile] =
  useState<any>(null);

  useEffect(() => {
    loadPokemon();
    loadProfile();
  }, []);
async function loadProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const result =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

  if (result.data) {
    setProfile(result.data);
  }
}
if (
  profile?.role === "guest"
) {
  return (
    <div className="page">
      <div className="card">
        <h2>
          Members Only
        </h2>

        <p>
          You must be promoted
          to Member before
          submitting shinies.
        </p>
      </div>
    </div>
  );
}
  async function loadPokemon() {
    const result = await supabase
      .from("pokemon")
      .select("*")
      .order("name");

    setPokemon(result.data || []);
  }

  async function uploadScreenshot() {
    if (!imageFile) return null;

    const fileName =
      `${Date.now()}-${imageFile.name}`;

    const result = await supabase
      .storage
      .from("shiny-screenshots")
      .upload(fileName, imageFile);

    if (result.error)
      throw result.error;

    const { data } = supabase
      .storage
      .from("shiny-screenshots")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function submitShiny() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login.");
        return;
      }

      const profileResult =
        await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

      if (!profileResult.data) {
        alert("Profile not found.");
        return;
      }

      if (
        !pokemonId ||
        !dateFound
      ) {
        alert(
          "Please fill out required fields."
        );
        return;
      }

      setLoading(true);

      let screenshotUrl = null;

      if (imageFile) {
        screenshotUrl =
          await uploadScreenshot();
      }

      const result =
        await supabase
          .from(
            "shiny_submissions"
          )
          .insert({
            pokemon_id:
              Number(
                pokemonId
              ),

            profile_id:
              profileResult
                .data.id,

            date_found:
              dateFound,

            method,

            notes,

            screenshot_url:
              screenshotUrl,

            status:
              "pending",
          });

      if (result.error)
        throw result.error;

      alert(
        "Submission sent for review!"
      );

      setPokemonId("");
      setDateFound("");
      setMethod("");
      setNotes("");
      setImageFile(null);
      setPreviewUrl("");

    } catch (err: any) {
      alert(
        err.message
      );
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
        Submit Shiny
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

            {pokemon.map(
              (p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name}
                  {" • "}
                  {p.region}
                </option>
              )
            )}
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

          {previewUrl && (
            <img
              src={previewUrl}
              alt=""
              style={{
                width:
                  "100%",
                maxWidth:
                  "600px",
                borderRadius:
                  "12px",
              }}
            />
          )}

          <button
            className="submit-btn"
            disabled={loading}
            onClick={
              submitShiny
            }
          >
            {loading
              ? "Uploading..."
              : "Submit Shiny"}
          </button>

        </div>
      </div>
    </div>
  );
}