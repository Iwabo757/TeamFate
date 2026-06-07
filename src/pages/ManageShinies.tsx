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
    x3 Horde
  </option>

  <option value="x5 Horde">
    x5 Horde
  </option>

  <option value="Fishing">
    Fishing
  </option>

  <option value="Egg">
    Egg
  </option>

  <option value="Fossil">
    Fossil
  </option>

  <option value="Legendary">
    Legendary
  </option>

  <option value="Sceret Shiny">
    Sceret Shiny
  </option>


</select>

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