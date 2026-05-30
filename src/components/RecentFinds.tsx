import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type RecentCatch = {
  id: string;
  pokemon_name: string;
  username: string;
  date_found: string;
};

export default function RecentFinds() {
  const [finds, setFinds] = useState<RecentCatch[]>([]);

  useEffect(() => {
    loadRecentFinds();
  }, []);

  async function loadRecentFinds() {
    const { data: catches } = await supabase
      .from("shiny_catches")
      .select("*")
      .order("date_found", { ascending: false })
      .limit(10);

    const { data: pokemon } = await supabase
      .from("pokemon")
      .select("id,name");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,username");

    const pokemonMap: Record<number, string> = {};
    pokemon?.forEach((p) => {
      pokemonMap[p.id] = p.name;
    });

    const profileMap: Record<string, string> = {};
    profiles?.forEach((p) => {
      profileMap[p.id] = p.username;
    });

    const formatted =
      catches?.map((c) => ({
        id: c.id,
        pokemon_name:
          pokemonMap[c.pokemon_id] || "Unknown",
        username:
          profileMap[c.profile_id] || "Unknown",
        date_found: c.date_found,
      })) || [];

    setFinds(formatted);
  }

  return (
    <div className="recent-finds">
      <h2>Recent Finds</h2>

      {finds.map((find) => (
        <div
          key={find.id}
          className="recent-find"
        >
          <strong>{find.username}</strong>
          {" found "}
          <strong>
            Shiny {find.pokemon_name}
          </strong>

          <div className="find-date">
            {find.date_found}
          </div>
        </div>
      ))}
    </div>
  );
}