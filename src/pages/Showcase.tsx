import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Shiny = {
  id: string;
  pokemon_id: number;
  pokemon_name: string;
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
      const { data, error } = await supabase
        .from("shiny_catches")
        .select(`
          id,
          pokemon_id,
          pokemon_name,
          profiles (
            nickname,
            username
          )
        `);

      if (error) throw error;

      const groups: Record<
        string,
        Shiny[]
      > = {};

      data?.forEach((shiny: any) => {
        const owner =
          shiny.profiles?.nickname ||
          shiny.profiles?.username ||
          "Unknown";

        if (!groups[owner]) {
          groups[owner] = [];
        }

        groups[owner].push({
          id: shiny.id,
          pokemon_id: shiny.pokemon_id,
          pokemon_name: shiny.pokemon_name,
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
    return <h2>Loading Showcase...</h2>;
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
                <img
                  key={shiny.id}
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${shiny.pokemon_id}.png`}
                  alt={shiny.pokemon_name}
                  title={shiny.pokemon_name}
                  className="showcase-sprite"
                  onClick={() =>
                    setSelectedPokemon(
                      shiny
                    )
                  }
                />
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
                {selectedPokemon.pokemon_name}
              </h2>

              <span className="status-badge">
                Shiny
              </span>
            </div>

            <div className="modal-body">

              <div className="modal-left">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${selectedPokemon.pokemon_id}.png`}
                  alt={
                    selectedPokemon.pokemon_name
                  }
                  className="modal-sprite"
                />
              </div>

              <div className="modal-right">

                <div className="detail-card">
                  <h3>Pokémon</h3>

                  <p>
                    {
                      selectedPokemon.pokemon_name
                    }
                  </p>
                </div>

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