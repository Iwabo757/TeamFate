import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

interface MemberGroup {
  username: string;
  shinies: any[];
}

export default function ManageShinies() {

  const [
    groupedMembers,
    setGroupedMembers,
  ] = useState<MemberGroup[]>([]);

  const [
    selectedMember,
    setSelectedMember,
  ] = useState<string | null>(
    null
  );

const [editingMethod, setEditingMethod] =
  useState<Record<string, string>>({});

const [editingDate, setEditingDate] =
  useState<Record<string, string>>({});

const [isSecret, setIsSecret] =
  useState<Record<string, boolean>>({});


  useEffect(() => {
    loadShinies();
  }, []);

  async function loadShinies() {

    const { data } =
      await supabase
        .from("shiny_catches")
        .select(`
          *,
          pokemon(name),
          profiles(
            username,
            nickname
          )
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    const groups:
      Record<
        string,
        any[]
      > = {};

    (data || []).forEach(
      (shiny) => {

const username =
  shiny.profiles
    ?.nickname ||
  shiny.profiles
    ?.username ||
  "Unknown";

        if (
          !groups[
            username
          ]
        ) {
          groups[
            username
          ] = [];
        }

        groups[
          username
        ].push(shiny);
      }
    );

    const result =
      Object.entries(
        groups
      ).map(
        ([
          username,
          shinies,
        ]) => ({
          username,
          shinies,
        })
      );

    setGroupedMembers(
      result
    );
  }


async function updateShiny(
  shiny: any
) {
  const { error } =
    await supabase
      .from("shiny_catches")
.update({
  date_found:
    editingDate[shiny.id] ??
    shiny.date_found,

  method:
    editingMethod[shiny.id] ??
    shiny.method,

  is_secret:
    isSecret[shiny.id] ??
    shiny.is_secret ??
    false,


})
      .eq("id", shiny.id);

  if (error) {
    alert(error.message);
    return;
  }

  loadShinies();
}


  async function deleteShiny(
    id: string
  ) {

    const confirmDelete =
      window.confirm(
        "Delete shiny?"
      );

    if (
      !confirmDelete
    )
      return;

    const { error } =
      await supabase
        .from(
          "shiny_catches"
        )
        .delete()
        .eq("id", id);

    if (error) {
      alert(
        error.message
      );
      return;
    }

    loadShinies();
  }

  if (
    selectedMember
  ) {

    const member =
      groupedMembers.find(
        (m) =>
          m.username ===
          selectedMember
      );

    return (
      <div className="page">

        <h1>
          {
            selectedMember
          }
        </h1>

        <button
          className="submit-btn"
          onClick={() =>
            setSelectedMember(
              null
            )
          }
        >
          ← Back To Members
        </button>

        {member?.shinies.map(
          (shiny) => (

            <div
              key={
                shiny.id
              }
              className="card"
            >

              <h3>
                {
                  shiny
                    .pokemon
                    ?.name
                }
              </h3>

<p>Method:</p>

<select
  value={
    editingMethod[shiny.id] ??
    shiny.method
  }
  onChange={(e) =>
    setEditingMethod({
      ...editingMethod,
      [shiny.id]: e.target.value,
    })
  }
>

  <option value="Single">
    Single
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
  Shalpha
</option>

<option value="Wild Shalpha">
  Wild Shalpha
</option>
            <option value="Legendary">
              Legendary
            </option>

            <option value="Event">
              Event
            </option>

</select>

<div className="checkbox-group">
  <label>
    <input
      type="checkbox"
      checked={
        isSecret[shiny.id] ??
        shiny.is_secret ??
        false
      }
      onChange={(e) =>
        setIsSecret({
          ...isSecret,
          [shiny.id]:
            e.target.checked,
        })
      }
    />
    Secret Shiny
  </label>

</div>

<p>
  Caught:
</p>

<input
  type="date"
  value={
    editingDate[shiny.id] ??
    shiny.date_found
  }
  onChange={(e) =>
    setEditingDate({
      ...editingDate,
      [shiny.id]: e.target.value,
    })
  }
/>

<button
  onClick={() =>
    updateShiny(shiny)
  }
>
  Save Changes
</button>
              <button
                className="delete-btn"
                onClick={() =>
                  deleteShiny(
                    shiny.id
                  )
                }
              >
                Delete
              </button>

            </div>
          )
        )}

      </div>
    );
  }

  return (
    <div className="page">

      <h1>
        Manage Shiny Records
      </h1>

      <div className="member-grid">

        {groupedMembers.map(
          (
            member
          ) => (

            <div
              key={
                member.username
              }
              className="card clickable"
              onClick={() =>
                setSelectedMember(
                  member.username
                )
              }
            >

              <h2>
                {
                  member.username
                }
              </h2>

              <p>
                {
                  member
                    .shinies
                    .length
                }{" "}
                Shinies
              </p>

            </div>
          )
        )}

      </div>

    </div>
  );
}