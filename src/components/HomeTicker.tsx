import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

function getGifName(name: string) {
  return name
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/ /g, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/:/g, "")
    .replace(/-/g, "");
}

type ShinyItem = {
  id: string;
  pokemonId: number;
  pokemonName: string;
  trainer: string;
  date: string;
};

export default function HomeTicker() {
  const [items, setItems] = useState<ShinyItem[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);

  // Continuous scrolling speed.
  const SPEED = 45;

  useEffect(() => {
    loadTicker();

    // Look for newly caught shinies every 30 seconds.
    const refreshTimer = window.setInterval(loadTicker, 30000);

    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const firstSet = firstSetRef.current;

    if (!track || !firstSet || items.length === 0) return;

    let animationFrame = 0;
    let lastTime = performance.now();
    let offset = 0;

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      offset += SPEED * delta;

      const loopWidth = firstSet.offsetWidth;

      if (loopWidth > 0 && offset >= loopWidth) {
        offset -= loopWidth;
      }

      track.style.transform = `translate3d(${-offset}px, 0, 0)`;

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [items]);

  async function loadTicker() {
    try {
      // Only show the 20 most recently caught shinies.
      const { data: catches, error: catchesError } = await supabase
        .from("shiny_catches")
        .select(`
          id,
          pokemon_id,
          method,
          date_found,
          profiles(nickname)
        `)
        .order("date_found", {
          ascending: false,
        })
        .limit(20);

      if (catchesError) {
        console.error("Failed to load shiny ticker:", catchesError);
        return;
      }

      const { data: pokemon, error: pokemonError } = await supabase
        .from("pokemon")
        .select("id,name");

      if (pokemonError) {
        console.error("Failed to load Pokemon:", pokemonError);
      }

      const pokemonMap: Record<number, string> = {};

      pokemon?.forEach((p) => {
        pokemonMap[p.id] = p.name;
      });

      const shinyItems: ShinyItem[] =
        catches?.map((c: any, index: number) => ({
          id: String(
            c.id ?? `${c.pokemon_id}-${c.date_found}-${index}`
          ),
          pokemonId: c.pokemon_id,
          pokemonName:
            pokemonMap[c.pokemon_id] ??
            "Unknown Pokémon",
          trainer:
            c.profiles?.nickname ??
            "Unknown Trainer",
          date: c.date_found,
        })) ?? [];

      setItems(shinyItems);
    } catch (error) {
      console.error("Failed to load home shiny ticker:", error);
    }
  }

  if (!items.length) {
    return null;
  }

  const renderCard = (
    item: ShinyItem,
    duplicate = false
  ) => (
    <div
      key={`${duplicate ? "duplicate-" : ""}${item.id}`}
      className="card home-ticker-card"
      style={{
        flex: "0 0 auto",
        minWidth: "300px",
        marginRight: "16px",
        boxSizing: "border-box",
      }}
    >
      <img
        className="ticker-sprite"
        src={`https://play.pokemonshowdown.com/sprites/ani-shiny/${getGifName(
          item.pokemonName
        )}.gif`}
        onError={(e) => {
          e.currentTarget.src =
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${item.pokemonId}.png`;
        }}
        alt={`Shiny ${item.pokemonName}`}
        style={{
          width: "64px",
          height: "64px",
          objectFit: "contain",
        }}
      />

      <div>
        <h2>
          ✨ {item.trainer} caught Shiny {item.pokemonName}
        </h2>

        <p>
          {new Date(item.date).toLocaleDateString()}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className="home-ticker"
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        background: "transparent",
        border: "none",
        boxShadow: "none",
        padding: 0,
      }}
    >
      <div
        ref={trackRef}
        style={{
          display: "flex",
          width: "max-content",
          willChange: "transform",
        }}
      >
        <div
          ref={firstSetRef}
          style={{
            display: "flex",
            flex: "0 0 auto",
          }}
        >
          {items.map((item) => renderCard(item))}
        </div>

        {/* Identical second set creates the seamless infinite loop. */}
        <div
          style={{
            display: "flex",
            flex: "0 0 auto",
          }}
          aria-hidden="true"
        >
          {items.map((item) => renderCard(item, true))}
        </div>
      </div>
    </div>
  );
}
