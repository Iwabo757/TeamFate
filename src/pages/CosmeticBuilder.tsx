import { useMemo, useState } from "react";
import { cosmetics } from "../data/cosmetics";
import "../cosmetic-builder.css";
import { getCosmeticSetupImage } from "../utils/cosmeticRenderer";
const SLOT_NAMES: Record<number, string> = {
  1: "Forehead",
  2: "Hat",
  3: "Hair",
  4: "Eyes",
  5: "Face",
  6: "Back",
  7: "Top",
  8: "Gloves",
  9: "Shoes",
  10: "Legs",
  11: "Rod",
  12: "Bicycle",
};

const SLOT_IDS = Object.keys(SLOT_NAMES).map(Number);

const DEFAULT_CLOTHES: Record<number, number> = {
  1: 0,
  2: 0,
  3: 1183,
  4: 1441,
  5: 1322,
  6: 0,
  7: 1323,
  8: 0,
  9: 1327,
  10: 1316,
  11: 0,
  12: 0,
};

// Public Hub renderer scene IDs used by its image URL builder.
const SCENES = [
  { label: "Back", id: 1 },
  { label: "Front", id: 2 },
  { label: "Side", id: 3 },
];

function rendererUrl(sceneId: number, clothes: Record<number, number>) {
  const c = { ...DEFAULT_CLOTHES, ...clothes };

  return (
    `https://apis.fiereu.de/pokemmoclothes/v1/${sceneId}/2/1/` +
    `${c[6]}/${c[12]}/${c[4]}/${c[5]}/${c[8]}/${c[3]}/` +
    `${c[2]}/${c[10]}/${c[9]}/${c[7]}.png`
  );
}

export default function CosmeticBuilder() {
  const [selectedSlot, setSelectedSlot] = useState(2);
  const [query, setQuery] = useState("");
  const [scene, setScene] = useState(2);
  const [clothes, setClothes] = useState(DEFAULT_CLOTHES);
  const [previewError, setPreviewError] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cosmetics.filter((item) => {
      if (item.slot !== selectedSlot) return false;
      if (!q) return true;

      return (
        item.name.toLowerCase().includes(q) ||
        String(item.item_id).includes(q) ||
        String(item.year).includes(q)
      );
    });
  }, [selectedSlot, query]);

  const selectedItem = cosmetics.find(
    (item) => item.item_id === clothes[selectedSlot]
  );

  function selectCosmetic(itemId: number) {
    setClothes((current) => ({
      ...current,
      [selectedSlot]: itemId,
    }));
    setPreviewError(false);
  }

  function resetOutfit() {
    setClothes({ ...DEFAULT_CLOTHES });
    setPreviewError(false);
  }

  function randomize() {
    const next = { ...DEFAULT_CLOTHES };

    for (const slotId of SLOT_IDS) {
      const choices = cosmetics.filter((item) => item.slot === slotId);
      if (choices.length) {
        next[slotId] =
          choices[Math.floor(Math.random() * choices.length)].item_id;
      }
    }

    setClothes(next);
    setPreviewError(false);
  }

  return (
    <div className="cosmetic-builder-page">
      <div className="cosmetic-builder-hero">
        <div>
          <div className="cosmetic-eyebrow">TEAM FATE TOOLS</div>
          <h1>Cosmetic Builder</h1>
          <p>Build your PokeMMO outfit and preview it from different angles.</p>
        </div>

        <div className="cosmetic-actions">
          <button onClick={randomize}>Randomize</button>
          <button className="cosmetic-secondary" onClick={resetOutfit}>
            Reset
          </button>
        </div>
      </div>

      <div className="cosmetic-builder-layout">
        <section className="cosmetic-panel cosmetic-catalog">
          <div className="cosmetic-panel-heading">
            <div>
              <h2>Cosmetics</h2>
              <span>{filtered.length} available</span>
            </div>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cosmetics..."
              aria-label="Search cosmetics"
            />
          </div>

          <div className="cosmetic-slots">
            {SLOT_IDS.map((slotId) => (
              <button
                key={slotId}
                className={
                  selectedSlot === slotId
                    ? "cosmetic-slot active"
                    : "cosmetic-slot"
                }
                onClick={() => {
                  setSelectedSlot(slotId);
                  setQuery("");
                }}
              >
                {SLOT_NAMES[slotId]}
              </button>
            ))}
          </div>

          <div className="cosmetic-list">
            {filtered.map((item) => (
              <button
                key={item.item_id}
                className={
                  clothes[selectedSlot] === item.item_id
                    ? "cosmetic-item selected"
                    : "cosmetic-item"
                }
                onClick={() => selectCosmetic(item.item_id)}
              >
                <div className="cosmetic-item-icon">
                  {item.icon_id ?? item.item_id}
                </div>

                <div className="cosmetic-item-copy">
                  <strong>{item.name}</strong>
                  <small>
                    ID {item.item_id}
                    {item.year ? ` · ${item.year}` : ""}
                  </small>
                </div>
              </button>
            ))}

            {!filtered.length && (
              <div className="cosmetic-empty">No cosmetics found.</div>
            )}
          </div>
        </section>

        <section className="cosmetic-panel cosmetic-preview">
          <div className="cosmetic-preview-heading">
            <div>
              <h2>Character Preview</h2>
              <span>
                {selectedItem
                  ? `${SLOT_NAMES[selectedSlot]}: ${selectedItem.name}`
                  : "Default outfit"}
              </span>
            </div>

            <div className="cosmetic-scenes">
              {SCENES.map((item) => (
                <button
                  key={item.id}
                  className={scene === item.id ? "active" : ""}
                  onClick={() => {
                    setScene(item.id);
                    setPreviewError(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cosmetic-stage">
            {!previewError ? (
              <img
                className="cosmetic-character"
                src={getCosmeticSetupImage(scene, clothes) ?? undefined}
                alt="PokeMMO character preview"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <div className="cosmetic-preview-error">
                <strong>Preview unavailable</strong>
                <p>
                  The external character renderer did not return an image.
                  Your cosmetic selections are still working.
                </p>
              </div>
            )}
          </div>

          <div className="cosmetic-selected">
            <div className="cosmetic-selected-title">Selected Outfit</div>

            <div className="cosmetic-chips">
              {SLOT_IDS.map((slotId) => {
                const item = cosmetics.find(
                  (entry) => entry.item_id === clothes[slotId]
                );

                if (!item) return null;

                return (
                  <button
                    key={slotId}
                    className="cosmetic-chip"
                    onClick={() => setSelectedSlot(slotId)}
                  >
                    <span>{SLOT_NAMES[slotId]}</span>
                    <strong>{item.name}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="cosmetic-builder-note">
        Cosmetic catalog: {cosmetics.length} records from the Team Fate PokeMMO
        data you supplied.
      </div>
    </div>
  );
}
