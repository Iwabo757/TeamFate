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

type TickerItem =
  | {
      type: "shiny";
      id: string;
      pokemonId: number;
      pokemonName: string;
      trainer: string;
      date: string;
    }
  | {
      type: "event";
      id: string;
      title: string;
      prize: string;
      start: string;
    };

export default function HomeTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);

  // Pixels per second. Lower = slower, higher = faster.
  const SPEED = 45;

  useEffect(() => {
    loadTicker();

    // Refresh the source data every 30 seconds without interrupting
    // the scrolling animation.
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

      // The second copy is identical to the first. Once the first set
      // has completely moved off screen, jump back by exactly its width.
      // Because the copies are identical, the reset is invisible.
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
      const { data: catches, error: catchesError } = await supabase
        .from("shiny_catches")
        .select(`
          *,
          profiles(nickname)
        `)
        .order("date_found", {
          ascending: false,
        })
        .limit(10);

      if (catchesError) {
        console.error("Failed to load shiny ticker:", catchesError);
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

      const shinyItems: TickerItem[] =
        catches?.map((c: any, index: number) => ({
          type: "shiny",
          id: `shiny-${c.id ?? `${c.pokemon_id}-${c.date_found}-${index}`}`,
          pokemonId: c.pokemon_id,
          pokemonName:
            pokemonMap[c.pokemon_id] ??
            c.pokemon?.name ??
            "Unknown Pokémon",
          trainer: c.profiles?.nickname || "Unknown",
          date: c.date_found,
        })) || [];

      const now = new Date().toISOString();

      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .gte("start_time", now)
        .order("start_time")
        .limit(5);

      if (eventsError) {
        console.error("Failed to load event ticker:", eventsError);
      }

      const eventItems: TickerItem[] =
        events?.map((e: any, index: number) => ({
          type: "event",
          id: `event-${e.id ?? `${e.title}-${e.start_time}-${index}`}`,
          title: e.title,
          prize: e.prize || "TBA",
          start: e.start_time,
        })) || [];

      const merged: TickerItem[] = [];
      const max = Math.max(
        shinyItems.length,
        eventItems.length
      );

      // Keep the existing behavior of mixing shinies and events instead
      // of putting all shinies together followed by all events.
      for (let i = 0; i < max; i++) {
        if (shinyItems[i]) {
          merged.push(shinyItems[i]);
        }

        if (eventItems[i]) {
          merged.push(eventItems[i]);
        }
      }

      setItems(merged);
    } catch (error) {
      console.error("Failed to load home ticker:", error);
    }
  }

  if (!items.length) {
    return (
      <div
        className="home-ticker"
        style={{
          overflow: "hidden",
          width: "100%",
        }}
      >
        Loading...
      </div>
    );
  }

  /*
   * We render two identical sets.
   *
   * Set 1: [A B C D E]
   * Set 2: [A B C D E]
   *
   * The track continuously moves left. When Set 1 has completely
   * passed, the transform resets to the beginning of Set 1.
   * Since Set 2 is identical, the user sees one continuous loop.
   */
  const renderItem = (item: TickerItem, duplicate = false) => {
    if (item.type === "shiny") {
      return (
        <div
          key={`${duplicate ? "duplicate-" : ""}${item.id}`}
          className="home-ticker-card"
          style={{
            flex: "0 0 auto",
            minWidth: "320px",
            maxWidth: "380px",
            minHeight: "96px",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "14px 20px",
            marginRight: "14px",
            borderRadius: "14px",
            background:
              "linear-gradient(135deg, rgba(30,30,40,.96), rgba(15,15,22,.96))",
            border: "1px solid rgba(255,255,255,.10)",
            boxShadow: "0 6px 20px rgba(0,0,0,.22)",
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
              flex: "0 0 64px",
            }}
          />

          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "17px",
                lineHeight: 1.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              ✨ {item.trainer} caught Shiny {item.pokemonName}
            </h2>

            <p
              style={{
                margin: "7px 0 0",
                opacity: 0.65,
                fontSize: "13px",
              }}
            >
              {new Date(item.date).toLocaleDateString()}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`${duplicate ? "duplicate-" : ""}${item.id}`}
        className="home-ticker-card"
        style={{
          flex: "0 0 auto",
          minWidth: "320px",
          maxWidth: "380px",
          minHeight: "96px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          padding: "14px 20px",
          marginRight: "14px",
          borderRadius: "14px",
          background:
            "linear-gradient(135deg, rgba(30,30,40,.96), rgba(15,15,22,.96))",
          border: "1px solid rgba(255,255,255,.10)",
          boxShadow: "0 6px 20px rgba(0,0,0,.22)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: "17px",
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            🎉 {item.title}
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              opacity: 0.75,
              fontSize: "13px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Prize: {item.prize || "TBA"}
          </p>

          <p
            style={{
              margin: "4px 0 0",
              opacity: 0.55,
              fontSize: "12px",
            }}
          >
            Starts: {new Date(item.start).toLocaleString()}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      className="home-ticker"
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        ref={trackRef}
        style={{
          display: "flex",
          width: "max-content",
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
        }}
      >
        <div
          ref={firstSetRef}
          style={{
            display: "flex",
            flex: "0 0 auto",
          }}
        >
          {items.map((item) => renderItem(item))}
        </div>

        <div
          style={{
            display: "flex",
            flex: "0 0 auto",
          }}
          aria-hidden="true"
        >
          {items.map((item) => renderItem(item, true))}
        </div>
      </div>
    </div>
  );
}
