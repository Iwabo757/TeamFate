import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Shiny = {
  id: string;
  pokemon_id: number;
  owner: string;
};

export default function Showcase() {
  const [grouped, setGrouped] = useState<
    Record<string, Shiny[]>
  >({});

  const [selectedPokemon, setSelectedPokemon] =
    useState<Shiny | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShowcase();
  }, []);

  async function loadShowcase() {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname, username");

      const profileMap: Record<
        string,
        string
      > = {};

      profiles?.forEach((profile: any) => {
        profileMap[profile.id] =
          profile.nickname ||
          profile.username ||
          "Unknown";
      });

      const { data: catches, error } =
        await supabase
          .from("shiny_catches")
          .select(`
            id,
            pokemon_id,
            profile_id
          `);

      if (error) throw error;

      const groups: Record<
        string,
        Shiny[]
      > = {};

      catches?.forEach((shiny: any) => {
        const owner =
          profileMap[shiny.profile_id] ||
          "Unknown";

        if (!groups[owner]) {
          groups[owner] = [];
        }

        groups[owner].push({
          id: shiny.id,
          pokemon_id: shiny.pokemon_id,
          owner,
        });
      });

      setGrouped(groups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const sortedMembers =
    Object.entries(grouped).sort(
      (a, b) =>
        b[1].length - a[1].length
    );

  if (loading) {
    return (
      <div className="showcase-loading">
        Loading Showcase...
      </div>
    );
  }

  return (
    <div className="showcase-page">

      <div className="dex-header">
        <h1>✨ Shiny Showcase</h1>

        <p>
          Every Team Fate member ranked by
          total shiny count.
        </p>
      </div>

      {sortedMembers.map(
        ([member, shinies]) => (
          <div
            key={member}
            className="showcase-member"
          >
            <h2>
              {member} ({shinies.length})
            </h2>

            <div className="showcase-sprites">
              {shinies.map((shiny) => (
                <div
                  key={shiny.id}
                  className="showcase-card"
                  onClick={() =>
                    setSelectedPokemon(
                      shiny
                    )
                  }
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`}
                    alt={`#${shiny.pokemon_id}`}
                    className="showcase-sprite"
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {selectedPokemon && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedPokemon(null)
          }
        >
          <div
            className="pokemon-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="close-btn"
              onClick={() =>
                setSelectedPokemon(null)
              }
            >
              ×
            </button>

            <div className="modal-header">
              <h2>
                Pokémon #
                {
                  selectedPokemon.pokemon_id
                }
              </h2>

              <span className="status-badge">
                Shiny
              </span>
            </div>

            <div className="modal-body">

              <div className="modal-left">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${selectedPokemon.pokemon_id}.png`}
                  alt="Pokemon"
                  className="modal-sprite"
                />
              </div>

              <div className="modal-right">

                <div className="detail-card">
                  <h3>Owner</h3>

                  <p>
                    {
                      selectedPokemon.owner
                    }
                  </p>
                </div>

                <div className="detail-card">
                  <h3>National Dex</h3>

                  <p>
                    #
                    {
                      selectedPokemon.pokemon_id
                    }
                  </p>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}