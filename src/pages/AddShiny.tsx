import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";


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

const [memberName, setMemberName] =
  useState("");

  const [loading, setLoading] =
    useState(false);

const [isSecret, setIsSecret] =
  useState(false);

const [isAlpha, setIsAlpha] =
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

    console.log(
      "Uploading screenshot:",
      fileName
    );

    const result = await supabase
      .storage
      .from("shiny-screenshots")
      .upload(
        fileName,
        imageFile,
        {
          upsert: false,
        }
      );

    console.log(
      "UPLOAD RESULT",
      result
    );

    if (result.error) {
      console.error(
        "UPLOAD ERROR",
        result.error
      );

      alert(
        JSON.stringify(
          result.error,
          null,
          2
        )
      );

      throw result.error;
    }

    const { data } = supabase
      .storage
      .from("shiny-screenshots")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function addShiny() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log(
        "CURRENT USER",
        user
      );

      if (!user) {
        alert(
          "No authenticated user found."
        );
        return;
      }

      if (
        !pokemonId ||
        !memberName ||
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

const insertResult =
  await supabase
    .from("shiny_catches")
    .insert({
      pokemon_id:
        Number(
          pokemonId
        ),

      profile_id:
        profileId || null,

      member_name:
        memberName,

      date_found:
        dateFound,

      method,

      notes,

      screenshot_url:
        screenshotUrl,
    });

      console.log(
        "INSERT RESULT",
        insertResult
      );

      if (
        insertResult.error
      ) {
        console.error(
          "INSERT ERROR",
          insertResult.error
        );

        alert(
          JSON.stringify(
            insertResult.error,
            null,
            2
          )
        );

        throw insertResult.error;
      }

      alert(
        "Shiny added successfully!"
      );

      setPokemonId("");
      setProfileId("");
      setDateFound("");
      setMethod("");
      setNotes("");
      setImageFile(null);
      setPreviewUrl("");

    } catch (err: any) {
      console.error(
        "ADD SHINY ERROR",
        err
      );

      alert(
        err?.message ||
          "Unknown error"
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

    const url =
      URL.createObjectURL(file);

    setPreviewUrl(url);
  }
const selectStyles = {
  control: (
    provided: any
  ) => ({
    ...provided,
    background:
      "#001a66",
    border:
      "1px solid #4da6ff",
    minHeight:
      "68px",
  }),

  menu: (
    provided: any
  ) => ({
    ...provided,
    background:
      "#001a66",
  }),

  option: (
    provided: any,
    state: any
  ) => ({
    ...provided,
    background:
      state.isFocused
        ? "#003399"
        : "#001a66",
    color: "white",
  }),

  singleValue: (
    provided: any
  ) => ({
    ...provided,
    color: "white",
  }),

  input: (
    provided: any
  ) => ({
    ...provided,
    color: "white",
  }),

  placeholder: (
    provided: any
  ) => ({
    ...provided,
    color:
      "#c6d8ff",
  }),
};
  return (
    <div className="page">
      <h1 className="page-title">
        Add Shiny
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
  onChange={(option) =>
    setPokemonId(
      String(
        option?.value || ""
      )
    )
  }
  placeholder="Search Pokémon..."
  isSearchable
/>
          
<CreatableSelect
  styles={selectStyles}
  options={profiles.map(
    (p) => ({
      value: p.id,
      label:
        p.nickname ||
        p.username,
    })
  )}
  value={
    profileId
      ? profiles
          .filter(
            (p) =>
              String(p.id) ===
              profileId
          )
          .map((p) => ({
            value: p.id,
            label:
              p.nickname ||
              p.username,
          }))[0]
      : memberName
      ? {
          value:
            memberName,
          label:
            memberName,
        }
      : null
  }
  onChange={(option) => {
    const selected =
      profiles.find(
        (p) =>
          String(p.id) ===
          String(option?.value)
      );

    setProfileId(
      selected
        ? String(
            selected.id
          )
        : ""
    );

    setMemberName(
      selected?.nickname ||
      selected?.username ||
      option?.label ||
      ""
    );
  }}
  onCreateOption={(
    inputValue
  ) => {
    setProfileId("");

    setMemberName(
      inputValue
    );
  }}
  placeholder="Search or type member..."
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

is_secret: isSecret,
is_alpha: isAlpha,

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

            <option value="Shalpha">
              Gift
            </option>

            <option value="Wild Shalpha">
              Wild Shalpha
            </option>

            <option value="Secret Shiny">
              Secret Shiny
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
                width:
                  "100%",
                maxWidth:
                  "600px",
                borderRadius:
                  "12px",
                marginTop:
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