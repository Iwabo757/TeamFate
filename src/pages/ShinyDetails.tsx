import { useParams } from "react-router-dom";

export default function ShinyDetails() {
  const { id } = useParams();

  return (
    <div>
      <h1>Shiny Details</h1>

      <img
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`}
      />

      <p>Pokemon #{id}</p>

      <p>
        Owner information, screenshots,
        comments and hunt details will
        appear here.
      </p>
    </div>
  );
}