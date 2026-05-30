import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

export default function ManageShinies() {
  const [shinies, setShinies] =
    useState<any[]>([]);

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
          profiles(username)
        `);

    setShinies(data || []);
  }

async function deleteShiny(
  id: string
) {
  const result =
    await supabase
      .from("shiny_catches")
      .delete()
      .eq("id", id);

  console.log(result);

  if (result.error) {
    alert(result.error.message);
    return;
  }

  loadShinies();
}

  return (
    <div className="page">

      <h1>
        Manage Shiny Records
      </h1>

      {shinies.map((shiny) => (
        <div
          key={shiny.id}
          className="card"
        >
          <h3>
            {shiny.pokemon?.name}
          </h3>

          <p>
            Hunter:
            {" "}
            {
              shiny.profiles
                ?.username
            }
          </p>

          <p>
            Method:
            {" "}
            {shiny.method}
          </p>

          <button
            onClick={() =>
              deleteShiny(
                shiny.id
              )
            }
          >
            Delete
          </button>
        </div>
      ))}

    </div>
  );
}