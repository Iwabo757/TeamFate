import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  username: string;
  role: string;
};

type Pokemon = {
  id: number;
  name: string;
};

type ShinyRecord = {
  id: number;
  date_found: string;
  method: string;
  screenshot_url: string;
  notes: string;

  pokemon: {
    name: string;
  };

  profiles: {
    username: string;
  };
};

export default function Admin() {
  const [isAdmin, setIsAdmin] =
    useState(false);

const [
  screenshotFile,
  setScreenshotFile,
] = useState<File | null>(null);

  const [users, setUsers] =
    useState<Profile[]>([]);

  const [pokemon, setPokemon] =
    useState<Pokemon[]>([]);

  const [shinies, setShinies] =
    useState<ShinyRecord[]>([]);

  const [pokemonId, setPokemonId] =
    useState<number>(0);

  const [profileId, setProfileId] =
    useState("");

  const [dateFound, setDateFound] =
    useState("");

  const [method, setMethod] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [startTime, setStartTime] =
    useState("");

  const [endTime, setEndTime] =
    useState("");

  const [prize, setPrize] =
    useState("");

  useEffect(() => {
    checkAdmin();
    loadData();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setIsAdmin(data?.role === "admin");
  }

  async function loadData() {
    const usersResult = await supabase
      .from("profiles")
      .select("*")
      .order("username");

    const pokemonResult = await supabase
      .from("pokemon")
      .select("id,name")
      .order("name");

    const shinyResult = await supabase
      .from("shiny_catches")
      .select(`
        *,
        pokemon (
          name
        ),
        profiles (
          username
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    setUsers(usersResult.data || []);
    setPokemon(pokemonResult.data || []);
    setShinies(shinyResult.data || []);
  }

  async function makeAdmin(id: string) {
    await supabase
      .from("profiles")
      .update({
        role: "admin",
      })
      .eq("id", id);

    loadData();
  }

  async function makeMember(id: string) {
    await supabase
      .from("profiles")
      .update({
        role: "member",
      })
      .eq("id", id);

    loadData();
  }

async function addShiny() {
  let screenshotUrl = "";

  if (screenshotFile) {
    const fileName =
      `${Date.now()}-${screenshotFile.name}`;

    const uploadResult =
      await supabase.storage
        .from(
          "shiny-screenshots"
        )
        .upload(
          fileName,
          screenshotFile
        );

    if (
      uploadResult.error
    ) {
      alert(
        uploadResult.error.message
      );
      return;
    }

    screenshotUrl =
      supabase.storage
        .from(
          "shiny-screenshots"
        )
        .getPublicUrl(
          fileName
        ).data.publicUrl;
  }

  const { error } =
    await supabase
      .from("shiny_catches")
      .insert({
        pokemon_id:
          pokemonId,

        profile_id:
          profileId,

        date_found:
          dateFound,

        method,

        screenshot_url:
          screenshotUrl,

        notes,
      });

console.log("SHINY ERROR:", error);

  if (error) {
    alert(error.message);
    return;
  }

alert("Shiny Added!");

setPokemonId(0);
setProfileId("");
setDateFound("");
setMethod("");
setNotes("");
setScreenshotFile(null);

loadData();
}

async function deleteShiny(
  id: number
) {
  if (
    !window.confirm(
      "Delete this shiny record?"
    )
  ) {
    return;
  }

  await supabase
    .from("shiny_catches")
    .delete()
    .eq("id", id);

  loadData();
}

async function createEvent() {
  const { error } =
    await supabase
      .from("events")
      .insert({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        prize,
      });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Event created!");

  setTitle("");
  setDescription("");
  setStartTime("");
  setEndTime("");
  setPrize("");

  loadData();
}

  if (!isAdmin) {
    return (
      <div className="page">
        <h1>Access Denied</h1>
        <p>
          You must be an admin to view
          this page.
        </p>
      </div>
    );
  }

  return (
    <div className="page">

      <h1>🛠 Admin Panel</h1>

      <section className="admin-section">
        <h2>Manage Users</h2>

        {users.map((user) => (
          <div
            key={user.id}
            className="admin-row"
          >
            <strong>
              {user.username}
            </strong>

            {" "}
            ({user.role})

            {user.role === "member" ? (
              <button
                onClick={() =>
                  makeAdmin(user.id)
                }
              >
                Make Admin
              </button>
            ) : (
              <button
                onClick={() =>
                  makeMember(user.id)
                }
              >
                Make Member
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="admin-section">
        <h2>Add Shiny</h2>

        <select
          value={pokemonId}
          onChange={(e) =>
            setPokemonId(
              Number(e.target.value)
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

          {users.map((u) => (
            <option
              key={u.id}
              value={u.id}
            >
              {u.username}
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

<input
  type="file"
  accept="image/*"
  onChange={(e) => {
    if (!e.target.files?.[0]) return;

    setScreenshotFile(
      e.target.files[0]
    );
  }}
/>

{screenshotFile && (
  <p>
    Selected:
    {" "}
    {screenshotFile.name}
  </p>
)}
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
      </section>

      <section className="admin-section">
        <h2>Shiny Records</h2>

        {shinies.length === 0 && (
          <p>
            No shiny records found.
          </p>
        )}

        {shinies.map((shiny) => (
          <div
            key={shiny.id}
            className="shiny-admin-card"
          >
            <h3>
              {shiny.pokemon?.name}
            </h3>

            <p>
              <strong>
                Member:
              </strong>{" "}
              {
                shiny.profiles
                  ?.username
              }
            </p>

            <p>
              <strong>
                Date:
              </strong>{" "}
              {shiny.date_found}
            </p>

            <p>
              <strong>
                Method:
              </strong>{" "}
              {shiny.method}
            </p>

            {shiny.notes && (
              <p>
                <strong>
                  Notes:
                </strong>{" "}
                {shiny.notes}
              </p>
            )}

            {shiny.screenshot_url && (
<img
  src={
    shiny.screenshot_url
  }
  alt=""
  className="shiny-proof"
/>
            )}

            <br />

<button
  className="delete-btn"
  onClick={() =>
    deleteShiny(shiny.id)
  }
>
  Delete
</button>
          </div>
        ))}
      </section>

      <section className="admin-section">
        <h2>Create Event</h2>

        <input
          placeholder="Title"
          value={title}
          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
        />

<input
  type="datetime-local"
  value={startTime}
  onChange={(e) =>
    setStartTime(e.target.value)
  }
/>

<input
  type="datetime-local"
  value={endTime}
  onChange={(e) =>
    setEndTime(e.target.value)
  }
/>

<input
  placeholder="Prize"
  value={prize}
  onChange={(e) =>
    setPrize(e.target.value)
  }
/>

<button onClick={createEvent}>
  Create Event
</button>

        <input
          placeholder="Prize"
          value={prize}
          onChange={(e) =>
            setPrize(
              e.target.value
            )
          }
        />

        <button
          onClick={createEvent}
        >
          Create Event
        </button>
      </section>

    </div>
  );
}