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
  {
    label: "Back",
    id: 1,
  },
  {
    label: "Front",
    id: 2,
  },
  {
    label: "Side",
    id: 3,
  },
];

const GENDERS = [
  {
    label: "♂ Male",
    id: 2,
  },
  {
    label: "♀ Female",
    id: 1,
  },
];

const COSMETIC_ICON_BASE =
  "https://www.pikammo.fr/Pokemmo/assets/img/vanity";

export default function CosmeticBuilder() {
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [loadingCosmetics, setLoadingCosmetics] = useState(true);

  const [selectedSlot, setSelectedSlot] = useState(2);

  const [query, setQuery] = useState("");

  const [scene, setScene] = useState(2);

  /*
   * PokeMMO renderer:
   *
   * 1 = Female
   * 2 = Male
   */
  const [gender, setGender] = useState(2);

  const [clothes, setClothes] = useState<Record<number, number>>({
    ...DEFAULT_CLOTHES,
  });

  const [equippedCosmetics, setEquippedCosmetics] = useState<Record<number, number | null>>({});

  const [previewError, setPreviewError] = useState(false);

  /*
   * =========================================================
   * LOAD COSMETICS
   * =========================================================
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
   * =========================================================
   * FILTER COSMETICS
   * =========================================================
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
  }, [cosmetics, selectedSlot, query]);

  /*
   * =========================================================
   * CURRENT SELECTED ITEM
   * =========================================================
   */

  const selectedItemId = equippedCosmetics[selectedSlot];

  const selectedItem =
    selectedItemId == null
      ? undefined
      : cosmetics.find((item) => item.item_id === selectedItemId);

  /*
   * =========================================================
   * SELECT COSMETIC
   * =========================================================
   */

  function selectCosmetic(item: Cosmetic) {
    const rendererId = item.internal_id;

    if (rendererId === undefined || rendererId <= 0) {
      setPreviewError(true);
      return;
    }

    setClothes((current) => ({
      ...current,
      [selectedSlot]: rendererId,
    }));

    setEquippedCosmetics((current) => ({
      ...current,
      [selectedSlot]: item.item_id,
    }));

    setPreviewError(false);
  }
  /*
   * =========================================================
   * REMOVE COSMETIC
   * =========================================================
   */

  function removeCosmetic(slotId: number) {
    setClothes((current) => ({
      ...current,
      [slotId]: DEFAULT_CLOTHES[slotId] ?? 0,
    }));

    setEquippedCosmetics((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });

    setPreviewError(false);
  }
  /*
   * =========================================================
   * RESET OUTFIT
   * =========================================================
   */

  function resetOutfit() {
    setClothes({ ...DEFAULT_CLOTHES });
    setEquippedCosmetics({});
    setGender(2);
    setScene(2);
    setSelectedSlot(2);
    setQuery("");
    setPreviewError(false);
  }
  /*
   * =========================================================
   * RANDOMIZE
   * =========================================================
   */

  function randomize() {
    const nextClothes = { ...DEFAULT_CLOTHES };
    const nextEquipped: Record<number, number | null> = {};

    for (const slotId of SLOT_IDS) {
      const choices = cosmetics.filter(
        (item) =>
          item.slot === slotId &&
          item.internal_id !== undefined &&
          item.internal_id > 0
      );

      if (!choices.length) continue;

      const choice = choices[Math.floor(Math.random() * choices.length)];
      const rendererId = choice.internal_id;

      if (rendererId === undefined || rendererId <= 0) continue;

      nextClothes[slotId] = rendererId;
      nextEquipped[slotId] = choice.item_id;
    }

    setClothes(nextClothes);
    setEquippedCosmetics(nextEquipped);
    setPreviewError(false);
  }
  /*
   * =========================================================
   * SELECTED OUTFIT
   *
   * Only categories that currently have an item
   * equipped are included.
   * =========================================================
   */

  const selectedOutfit = SLOT_IDS.map((slotId) => {
    const itemId = equippedCosmetics[slotId];

    if (itemId == null) return null;

    const item = cosmetics.find((entry) => entry.item_id === itemId);
    if (!item) return null;

    return { slotId, item };
  }).filter(
    (entry): entry is { slotId: number; item: Cosmetic } => entry !== null
  );

  /*
   * =========================================================
   * CHANGE GENDER
   * =========================================================
   */

  function changeGender(genderId: number) {
    setGender(genderId);
    setPreviewError(false);
  }

  /*
   * =========================================================
   * CHANGE SCENE
   * =========================================================
   */

  function changeScene(sceneId: number) {
    setScene(sceneId);
    setPreviewError(false);
  }

  /*
   * =========================================================
   * COSMETIC ICON
   * =========================================================
   */

  function getCosmeticIcon(item: Cosmetic) {
    return `${COSMETIC_ICON_BASE}/${item.item_id}.png`;
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <div className="cosmetic-builder-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="cosmetic-builder-hero">
        <div>
          <h1>Cosmetic Builder</h1>

          <p>
            Build your PokeMMO outfit and preview it
            from different angles.
          </p>
        </div>

        <div className="cosmetic-actions">
          <button
            type="button"
            onClick={randomize}
            disabled={
              loadingCosmetics ||
              !cosmetics.length
            }
          >
            Randomize
          </button>

          <button
            type="button"
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

          {/* =================================================
              SLOTS
              ================================================= */}

          <div className="cosmetic-slots">
            {SLOT_IDS.map((slotId) => (
              <button
                key={slotId}
                type="button"
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

          {/* =================================================
              COSMETIC LIST
              ================================================= */}

          <div className="cosmetic-list">
            {loadingCosmetics ? (
              <div className="cosmetic-empty">
                Loading cosmetics...
              </div>
            ) : (
              <>
                {filtered.map((item, index) => {
                  const isSelected =
                    equippedCosmetics[selectedSlot] === item.item_id;

                  return (
                    <button
                      key={`${item.item_id}-${item.slot}-${index}`}
                      type="button"
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
                        <img
                          src={getCosmeticIcon(item)}
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />

                        <span>
                          {item.item_id}
                        </span>
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

          {/* =================================================
              PREVIEW HEADER
              ================================================= */}

          <div className="cosmetic-preview-heading">
            <div>
              <h2>
                Character Preview
              </h2>

              <span>
                {selectedItem
                  ? `${
                      SLOT_NAMES[selectedSlot]
                    }: ${
                      selectedItem.name
                    }`
                  : "Default outfit"}
              </span>
            </div>

            <div className="cosmetic-preview-controls">

              {/* =============================================
                  GENDER
                  ============================================= */}

              <div className="cosmetic-gender">
                <span className="cosmetic-control-label">
                  Character
                </span>

                <div className="cosmetic-scenes">
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

              {/* =============================================
                  CAMERA
                  ============================================= */}

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

          {/* =================================================
              PREVIEW + SELECTED OUTFIT
              ================================================= */}

          <div className="cosmetic-preview-body">

            {/* ===============================================
                CHARACTER
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
                    The selected combination
                    could not be rendered.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewError(false)
                    }
                  >
                    Retry Preview
                  </button>
                </div>
              )}
            </div>

            {/* ===============================================
                SELECTED OUTFIT
                =============================================== */}

            <aside className="cosmetic-selected">
              <div className="cosmetic-selected-title">
                Selected Outfit
              </div>

              {selectedOutfit.length === 0 ? (
                <div className="cosmetic-no-selection">
                  No cosmetics equipped.
                </div>
              ) : (
                <div className="cosmetic-selected-list">
                  {selectedOutfit.map(
                    ({
                      slotId,
                      item,
                    }) => (
                      <button
                        key={slotId}
                        type="button"
                        className="cosmetic-selected-item"
                        title={`Remove ${item.name}`}
                        onClick={() =>
                          removeCosmetic(
                            slotId
                          )
                        }
                      >
                        <span>
                          {
                            SLOT_NAMES[
                              slotId
                            ]
                          }
                        </span>

                        <strong>
                          {item.name}
                        </strong>

                        <small>
                          Click to remove
                        </small>
                      </button>
                    )
                  )}
                </div>
              )}
            </aside>
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