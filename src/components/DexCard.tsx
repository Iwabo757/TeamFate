
type DexCardProps = {
  id: number;
  name: string;
  caught: boolean;
  owners: Record<string, number>;
  onClick: () => void;
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
            <div>Owned By:</div>

            <div className="owner-preview">
              {Object.entries(owners).map(
                ([owner, count]) => (
                  <div key={owner}>
                    {owner} x{count}
                  </div>
                )
              )}
            </div>
          </>
        ) : (
          <p>Not Yet Obtained</p>
        )}
      </div>
    </div>
  );
}
    </div>
  );
}