
type DexCardProps = {
  id: number;
  name: string;
  caught: boolean;
  owners: string[];
  onClick: () => void;
};

type CatchInfo = {
  owner: string;
  date_found: string;
  method: string | null;
  notes: string | null;
  screenshot_url: string | null;
};
export default function DexCard({
  id,
  name,
  caught,
  owners,
  onClick,
}: DexCardProps) {

  return (
    <div
      className="dex-entry"
      onClick={onClick}
    >
      <img
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`}
        alt={name}
        className={`dex-sprite ${
          caught ? "" : "missing"
        }`}
      />

      <div className="dex-tooltip">
        <strong>
          #{id} {name}
        </strong>

        {caught ? (
          <>
            <p>Owned By:</p>

            {owners.map((owner) => (
              <div key={owner}>
                {owner}
              </div>
            ))}
          </>
        ) : (
          <p>Not Yet Obtained</p>
        )}
      </div>
    </div>
  );
}