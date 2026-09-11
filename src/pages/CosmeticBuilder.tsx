import { useEffect, useMemo, useState } from "react";
import "../cosmetic-builder.css";
import { getCosmeticSetupImage } from "../utils/cosmeticRenderer";

type Cosmetic = {
  item_id: number;
  internal_id?: number;
  name: string;
  icon_id: number;
  slot: number;
  attribute: number;
  festival: number;
  limitation: number;
  month: number;
  year: number;
};

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

const SCENES = [
  { label: "Back", id: 1 },
  { label: "Front", id: 2 },
  { label: "Side", id: 3 },
];

const GENDERS = [
  { label: "♂ Male", id: 2 },
  { label: "♀ Female", id: 1 },
];

export default function CosmeticBuilder() {
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [loadingCosmetics, setLoadingCosmetics] = useState(true);

  const [selectedSlot, setSelectedSlot] = useState(2);
  const [query, setQuery] = useState("");

  const [scene, setScene] = useState(2);

  // PokeMMO renderer:
  // 1 = Female
  // 2 = Male
  const [gender, setGender] = useState(2);

  const [clothes, setClothes] = useState({
    ...DEFAULT_CLOTHES,
  });

  const [previewError, setPreviewError] = useState(false);

  /*
   * ---------------------------------------------------------
   * LOAD COSMETICS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function loadCosmetics() {
      try {
        setLoadingCosmetics(true);

        const response = await fetch("/api/cosmetics");

        if (!response.ok) {
          throw new Error(
            `Cosmetic API returned ${response.status}`
          );
        }

        const data: Cosmetic[] = await response.json();

        if (!Array.isArray(data)) {
          throw new Error(
            "Cosmetic API returned invalid data"
          );
        }

        if (!cancelled) {
          setCosmetics(data);
        }
      } catch (error) {
        console.error(
          "Failed to load cosmetics:",
          error
        );

        if (!cancelled) {
          setCosmetics([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCosmetics(false);
        }
      }
    }

    loadCosmetics();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * FILTER CURRENT SLOT
   * ---------------------------------------------------------
   */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cosmetics.filter((item) => {
      if (item.slot !== selectedSlot) {
        return false;
      }

      if (!q) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(q) ||
        String(item.item_id).includes(q) ||
        String(item.internal_id ?? "").includes(q) ||
        String(item.year).includes(q)
      );
    });
  }, [
    cosmetics,
    selectedSlot,
    query,
  ]);

  /*
   * ---------------------------------------------------------
   * CURRENTLY SELECTED ITEM
   * ---------------------------------------------------------
   */

  const selectedItem = cosmetics.find(
    (item) =>
      item.item_id === clothes[selectedSlot] ||
      item.internal_id === clothes[selectedSlot]
  );

  /*
   * ---------------------------------------------------------
   * SELECT COSMETIC
   * ---------------------------------------------------------
   */

  function selectCosmetic(item: Cosmetic) {
    const rendererId =
      item.internal_id ?? item.item_id;

    setClothes((current) => ({
      ...current,
      [selectedSlot]: rendererId,
    }));

    setPreviewError(false);
  }

  /*
   * ---------------------------------------------------------
   * RESET
   * ---------------------------------------------------------
   */

  function resetOutfit() {
    setClothes({
      ...DEFAULT_CLOTHES,
    });

    setGender(2);
    setScene(2);
    setPreviewError(false);
  }

  /*
   * ---------------------------------------------------------
   * RANDOMIZE
   * ---------------------------------------------------------
   */

  function randomize() {
    const next = {
      ...DEFAULT_CLOTHES,
    };

    for (const slotId of SLOT_IDS) {
      const choices = cosmetics.filter(
        (item) =>
          item.slot === slotId &&
          (item.internal_id ?? item.item_id) > 0
      );

      if (choices.length) {
        const choice =
          choices[
            Math.floor(
              Math.random() * choices.length
            )
          ];

        next[slotId] =
          choice.internal_id ??
          choice.item_id;
      }
    }

    setClothes(next);
    setPreviewError(false);
  }

  /*
   * ---------------------------------------------------------
   * CHANGE GENDER
   * ---------------------------------------------------------
   */

  function changeGender(genderId: number) {
    setGender(genderId);
    setPreviewError(false);
  }

  /*
   * ---------------------------------------------------------
   * CHANGE SCENE
   * ---------------------------------------------------------
   */

  function changeScene(sceneId: number) {
    setScene(sceneId);
    setPreviewError(false);
  }

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="cosmetic-builder-page">
      {/* =====================================================
          HERO
          ===================================================== */}

      <div className="cosmetic-builder-hero">
        <div>
          <div className="cosmetic-eyebrow">
            TEAM FATE TOOLS
          </div>

          <h1>Cosmetic Builder</h1>

          <p>
            Build your PokeMMO outfit and preview it
            from different angles.
          </p>
        </div>

        <div className="cosmetic-actions">
          <button
            onClick={randomize}
            disabled={
              loadingCosmetics ||
              !cosmetics.length
            }
          >
            Randomize
          </button>

          <button
            className="cosmetic-secondary"
            onClick={resetOutfit}
          >
            Reset
          </button>
        </div>
      </div>

      {/* =====================================================
          MAIN LAYOUT
          ===================================================== */}

      <div className="cosmetic-builder-layout">
        {/* ===================================================
            COSMETIC CATALOG
            =================================================== */}

        <section className="cosmetic-panel cosmetic-catalog">
          <div className="cosmetic-panel-heading">
            <div>
              <h2>Cosmetics</h2>

              <span>
                {loadingCosmetics
                  ? "Loading..."
                  : `${filtered.length} available`}
              </span>
            </div>

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search cosmetics..."
              aria-label="Search cosmetics"
              disabled={loadingCosmetics}
            />
          </div>

          {/* ===============================================
              COSMETIC SLOTS
              =============================================== */}

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

          {/* ===============================================
              COSMETIC LIST
              =============================================== */}

          <div className="cosmetic-list">
            {loadingCosmetics ? (
              <div className="cosmetic-empty">
                Loading cosmetics...
              </div>
            ) : (
              <>
                {filtered.map((item, index) => {
                  const rendererId =
                    item.internal_id ??
                    item.item_id;

                  const isSelected =
                    clothes[selectedSlot] ===
                      rendererId ||
                    clothes[selectedSlot] ===
                      item.item_id;

                  return (
                    <button
                      key={`${item.item_id}-${item.slot}-${index}`}
                      className={
                        isSelected
                          ? "cosmetic-item selected"
                          : "cosmetic-item"
                      }
                      onClick={() =>
                        selectCosmetic(item)
                      }
                    >
                      <div className="cosmetic-item-icon">
                        {item.icon_id ??
                          item.item_id}
                      </div>

                      <div className="cosmetic-item-copy">
                        <strong>
                          {item.name}
                        </strong>

                        <small>
                          ID {item.item_id}
                          {item.year
                            ? ` · ${item.year}`
                            : ""}
                        </small>
                      </div>
                    </button>
                  );
                })}

                {!filtered.length && (
                  <div className="cosmetic-empty">
                    No cosmetics found.
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ===================================================
            CHARACTER PREVIEW
            =================================================== */}

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

            {/* =============================================
                GENDER SELECTOR + SCENES
                ============================================= */}

            <div className="cosmetic-preview-controls">
              <div className="cosmetic-gender">
                <span className="cosmetic-control-label">
                  Character
                </span>

                <div className="cosmetic-gender-buttons">
                  {GENDERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={
                        gender === item.id
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        changeGender(item.id)
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cosmetic-scenes">
                {SCENES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      scene === item.id
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      changeScene(item.id)
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ===============================================
              CHARACTER STAGE
              =============================================== */}

          <div className="cosmetic-stage">
            {!previewError ? (
              <img
                key={`${scene}-${gender}-${JSON.stringify(
                  clothes
                )}`}
                className="cosmetic-character"
                src={getCosmeticSetupImage(
                  scene,
                  gender,
                  clothes
                )}
                alt={`PokeMMO ${
                  gender === 2
                    ? "male"
                    : "female"
                } character preview`}
                onError={() =>
                  setPreviewError(true)
                }
              />
            ) : (
              <div className="cosmetic-preview-error">
                <strong>
                  Preview unavailable
                </strong>

                <p>
                  The external character renderer
                  did not return an image. Your
                  cosmetic selections are still
                  working.
                </p>
              </div>
            )}
          </div>

          {/* ===============================================
              SELECTED OUTFIT
              =============================================== */}

          <div className="cosmetic-selected">
            <div className="cosmetic-selected-title">
              Selected Outfit
            </div>

            <div className="cosmetic-chips">
              {SLOT_IDS.map((slotId) => {
                const rendererId =
                  clothes[slotId];

                const item = cosmetics.find(
                  (entry) =>
                    entry.internal_id ===
                      rendererId ||
                    entry.item_id ===
                      rendererId
                );

                if (!item) {
                  return null;
                }

                return (
                  <button
                    key={slotId}
                    className="cosmetic-chip"
                    onClick={() =>
                      setSelectedSlot(slotId)
                    }
                  >
                    <span>
                      {SLOT_NAMES[slotId]}
                    </span>

                    <strong>
                      {item.name}
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* =====================================================
          STATUS
          ===================================================== */}

      <div className="cosmetic-builder-note">
        {loadingCosmetics
          ? "Loading the complete PokeMMO cosmetic catalog..."
          : `Cosmetic catalog: ${cosmetics.length} records loaded from the Team Fate cosmetic API.`}
      </div>
    </div>
  );
}