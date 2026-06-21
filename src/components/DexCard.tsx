import { useState } from "react";

type DexCardProps = {
  id: number;
  name: string;
  caught: boolean;
  evoUnlocked?: boolean;
  owners: Record<string, number>;
  onClick: () => void;
};

function getGifName(
  name: string
) {
  return name
    .toLowerCase()
    .replace(/ /g, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/:/g, "")
    .replace(/-/g, "");
}

export default function DexCard({
  id,
  name,
  caught,
  evoUnlocked,
  owners,
  onClick,
}: DexCardProps) {
  const [hovered, setHovered] =
    useState(false);

  const staticSprite =
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;

  const animatedSprite =
    `https://play.pokemonshowdown.com/sprites/ani-shiny/${getGifName(
      name
    )}.gif`;

  return (
    <div
className={`dex-entry ${
  caught
    ? "caught"
    : evoUnlocked
    ? "evo-unlocked"
    : "missing"
}`}
      onClick={onClick}
      onMouseEnter={() =>
        setHovered(true)
      }
      onMouseLeave={() =>
        setHovered(false)
      }
    >

<img
  src={
    hovered &&
    (caught ||
      evoUnlocked)
      ? animatedSprite
      : staticSprite
  }
  alt={name}
  className={`dex-sprite ${
    caught ||
    evoUnlocked
      ? ""
      : "missing"
  }`}
  onError={(e) => {
    e.currentTarget.src =
      staticSprite;
  }}
/>

      <div className="dex-tooltip">
        <strong>
          #{id} {name}
        </strong>


{caught || evoUnlocked ? (
  <>
    <div>Owned By:</div>

    <div className="owner-preview">
      {Object.entries(
        owners
      ).map(
        ([owner, count]) => (
          <div key={owner}>
            {owner} x{count}
          </div>
        )
      )}
    </div>
  </>
) : evoUnlocked ? (
  <p>
    Evolution line owned
  </p>
) : (
  <p>
    Not Yet Obtained
  </p>
)}

      </div>
    </div>
  );
}