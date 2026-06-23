import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Select from "react-select";

const selectStyles = {
  control: (base: any) => ({
    ...base,
    background: "#111827",
    borderColor: "#374151",
    color: "white",
  }),
  menu: (base: any) => ({
    ...base,
    background: "#111827",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "white",
  }),
  option: (base: any) => ({
    ...base,
    color: "white",
    background: "#111827",
  }),
};

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

const [isSecret, setIsSecret] =
  useState(false);

const [isAlpha, setIsAlpha] =
  useState(false);

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

           is_secret: isSecret,

           is_alpha: isAlpha,

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

<Select
  styles={selectStyles}
  options={pokemon.map(
    (p) => ({
      value: p.id,
      label: `${p.name} • ${p.region}`,
    })
  )}
  value={
    pokemon
      .filter(
        (p) =>
          String(p.id) ===
          pokemonId
      )
      .map((p) => ({
        value: p.id,
        label: `${p.name} • ${p.region}`,
      }))[0] || null
  }
  onChange={(option: any) =>
    setPokemonId(
      String(
        option?.value || ""
      )
    )
  }
  placeholder="Search Pokémon..."
  isSearchable
/>

<div className="checkbox-group">
  <label>
    <input
      type="checkbox"
      checked={isSecret}
      onChange={(e) =>
        setIsSecret(
          e.target.checked
        )
      }
    />
    Secret Shiny
  </label>

  <label>
    <input
      type="checkbox"
      checked={isAlpha}
      onChange={(e) =>
        setIsAlpha(
          e.target.checked
        )
      }
    />
    Alpha
  </label>
</div>


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


            <option value="Single Encounter">
              Single Encounter
            </option>

            <option value="x3 Horde">
              3x Horde
            </option>

            <option value="x5 Horde">
              5x Horde
            </option>

            <option value="Egg">
              Egg
            </option>

            <option value="Fossil">
              Fossil
            </option>

            <option value="Fishing">
              Fishing
            </option>

            <option value="Safari">
              Safari
            </option>

            <option value="Legendary">
              Legendary
            </option>

            <option value="Event">
              Event
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