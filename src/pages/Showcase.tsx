type Shiny = {
  pokemon: string;
  sprite: string;
  hunter: string;
  method: string;
  date: string;
};

const shinies: Shiny[] = [
  {
    pokemon: "Charizard",
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/6.png",
    hunter: "Nick",
    method: "Egg",
    date: "2025-05-28",
  },
  {
    pokemon: "Gengar",
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/94.png",
    hunter: "Carson",
    method: "Horde",
    date: "2025-05-22",
  },
  {
    pokemon: "Dragonite",
    sprite:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/149.png",
    hunter: "Ace",
    method: "Fishing",
    date: "2025-05-15",
  },
];

export default function Showcase() {
  return (
    <div>
      <h1>✨ Shiny Showcase</h1>

      <div className="showcase-grid">
        {shinies.map((shiny) => (
          <div key={shiny.pokemon} className="shiny-card">
            <img
              src={shiny.sprite}
              alt={shiny.pokemon}
              className="shiny-sprite"
            />

            <h3>{shiny.pokemon}</h3>

            <p>Hunter: {shiny.hunter}</p>
            <p>Method: {shiny.method}</p>
            <p>Date: {shiny.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}