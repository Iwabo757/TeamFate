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

  // Pixels per second.
  const SPEED = 45;

  useEffect(() => {
    // Load the complete shiny history once.
    loadTicker();
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

      /*
       * The second set is an exact copy of the first set.
       * When the first set has completely passed, reset by exactly
       * its width. Because the second set is identical, the reset
       * is invisible and the ticker continues forever.
       */
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
      /*
       * Load ALL shinies once, newest first.
       *
       * There is intentionally NO .limit() and NO recurring
       * database refresh. The returned data stays in memory while
       * the ticker continuously loops through it.
       */
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
        });

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
            pokemonMap[c.pokemon_id] ?? "Unknown Pokémon",
          trainer:
            c.profiles?.nickname ?? "Unknown Trainer",
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
        width: "340px",
        minHeight: "104px",
        marginRight: "16px",
        padding: "12px 18px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: "18px",
      }}
    >
      {/* SHINY SPRITE */}
      <div
        style={{
          width: "76px",
          height: "76px",
          flex: "0 0 76px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
            width: "72px",
            height: "72px",
            objectFit: "contain",
          }}
        />
      </div>

      {/* SHINY INFORMATION */}
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "3px",
          lineHeight: 1.2,
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Shiny {item.pokemonName}
        </div>

        <div
          style={{
            fontSize: "15px",
            opacity: 0.85,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.trainer}
        </div>

        <div
          style={{
            fontSize: "13px",
            opacity: 0.6,
            whiteSpace: "nowrap",
          }}
        >
          {new Date(item.date).toLocaleDateString()}
        </div>
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
        {/* ORIGINAL FULL SHINY HISTORY */}
        <div
          ref={firstSetRef}
          style={{
            display: "flex",
            flex: "0 0 auto",
          }}
        >
          {items.map((item) => renderCard(item))}
        </div>

        {/* IDENTICAL COPY FOR SEAMLESS INFINITE LOOP */}
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
