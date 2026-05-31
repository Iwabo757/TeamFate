import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type RecentCatch = {
  id: string;
  pokemon_id: number;
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
    try {
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
        .select("id,nickname");

      const pokemonMap: Record<number, string> = {};

      pokemon?.forEach((p: any) => {
        pokemonMap[p.id] = p.name;
      });

      const profileMap: Record<string, string> = {};

      profiles?.forEach((p: any) => {
        profileMap[p.id] =
          p.nickname || "Unknown";
      });

      const recentFinds: RecentCatch[] =
        catches?.map((c: any) => ({
          id: c.id,
          pokemon_id: c.pokemon_id,
          pokemon_name:
            pokemonMap[c.pokemon_id] ||
            "Unknown",
          username:
            profileMap[c.profile_id] ||
            "Unknown",
          date_found: c.date_found,
        })) || [];

      setFinds(recentFinds);
    } catch (error) {
      console.error(
        "Error loading finds:",
        error
      );
    }
  }

  return (
    <div className="recent-finds">
      <h2>Recent Finds</h2>

      {finds.length === 0 ? (
        <p>No shiny finds yet.</p>
      ) : (
        finds.map((find) => (
          <div
            key={find.id}
            className="recent-find"
          >
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${find.pokemon_id}.png`}
              alt={find.pokemon_name}
              style={{
                width: "64px",
                height: "64px",
                imageRendering:
                  "pixelated",
              }}
            />

            <div>
              <strong>
                {find.username}
              </strong>{" "}
              found{" "}
              <strong>
                Shiny {find.pokemon_name}
              </strong>

              <div className="find-date">
                {new Date(
                  find.date_found
                ).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}