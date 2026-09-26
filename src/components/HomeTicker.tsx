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

  const SPEED = 45;

  useEffect(() => {
    loadTicker();

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
      const { data: catches, error } = await supabase
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

      if (error) {
        console.error("Failed to load shiny ticker:", error);
        return;
      }

      const { data: pokemon } = await supabase
        .from("pokemon")
        .select("id,name");

      const pokemonMap: Record<number, string> = {};

      pokemon?.forEach((p) => {
        pokemonMap[p.id] = p.name;
      });

      setItems(
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
        })) ?? []
      );
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
        {/* FIRST SET */}
        <div
          ref={firstSetRef}
          style={{
            display: "flex",
            flex: "0 0 auto",
          }}
        >
          {items.map((item) => renderCard(item))}
        </div>

        {/* SECOND IDENTICAL SET FOR SEAMLESS LOOP */}
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
