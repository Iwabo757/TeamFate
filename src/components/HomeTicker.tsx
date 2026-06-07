import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function HomeTicker() {
  const [items, setItems] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    loadTicker();
  }, []);

  useEffect(() => {
    if (!items.length) return;

    const timer = setInterval(() => {
      setCurrent(
        (prev) => (prev + 1) % items.length
      );
    }, 8000);

    return () => clearInterval(timer);
  }, [items]);

  async function loadTicker() {
    const { data: catches } = await supabase
      .from("shiny_catches")
      .select(`
        *,
        profiles(nickname)
      `)
      .order("date_found", {
        ascending: false,
      })
      .limit(10);

    const { data: pokemon } =
      await supabase
        .from("pokemon")
        .select("id,name");

    const pokemonMap: Record<
      number,
      string
    > = {};

    pokemon?.forEach((p) => {
      pokemonMap[p.id] = p.name;
    });

    const shinyItems =
      catches?.map((c) => ({
        type: "shiny",
        pokemonId: c.pokemon_id,
        pokemonName:
          pokemonMap[c.pokemon_id],
        trainer:
          c.profiles?.nickname ||
          "Unknown",
        date: c.date_found,
      })) || [];

    const now =
      new Date().toISOString();

    const { data: events } =
      await supabase
        .from("events")
        .select("*")
        .gte("start_time", now)
        .order("start_time")
        .limit(5);

    const eventItems =
      events?.map((e) => ({
        type: "event",
        title: e.title,
        prize: e.prize,
        start: e.start_time,
      })) || [];


console.log("Shiny Items:", shinyItems);
console.log("Event Items:", eventItems);
console.log(
  "Total Items:",
  [...shinyItems, ...eventItems]
);

const merged = [];

const max = Math.max(
  shinyItems.length,
  eventItems.length
);

for (let i = 0; i < max; i++) {
  if (shinyItems[i])
    merged.push(shinyItems[i]);

  if (eventItems[i])
    merged.push(eventItems[i]);
}

setItems(merged);
  }

  if (!items.length) {
    return (
      <div className="home-ticker">
        Loading...
      </div>
    );
  }

  const item = items[current];

return (
  <div
    key={current}
    className="home-ticker"
  >
      {item.type === "shiny" ? (
        <>
          <img
            className="ticker-sprite"
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${item.pokemonId}.png`}
          />

          <div>
            <h2>
              {item.trainer}
              {" caught Shiny "}
              {item.pokemonName}
            </h2>

            <p>{item.date}</p>
          </div>
        </>
      ) : (
        <div>
          <h2>🎉 {item.title}</h2>

          <p>
            Prize:
            {" "}
            {item.prize || "TBA"}
          </p>

          <p>
            Starts:
            {" "}
            {new Date(
              item.start
            ).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}