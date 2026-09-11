import { useEffect, useMemo, useState } from "react";
import "../cosmetic-builder.css";
import {
  getCosmeticSetupImage,
  getRendererManifest,
} from "../utils/cosmeticRenderer";
import type { RendererManifest } from "../renderer/renderer";

type Cosmetic = {
  name: string;
  slot:
    | "back"
    | "pants"
    | "shoes"
    | "top"
    | "eyes"
    | "face"
    | "hair"
    | "held"
    | "hat"
    | "tool"
    | "mount";
  layer: string;
  icon: string;
  layer_index: number;
  icon_index: number;
  slot_code: number;
};

const SLOT_NAMES: Record<string, string> = {
  hat: "Hat",
  hair: "Hair",
  eyes: "Eyes",
  face: "Face",
  back: "Back",
  top: "Top",
  held: "Held Item",
  shoes: "Shoes",
  pants: "Pants",
  tool: "Tool",
  mount: "Mount",
};

const SLOT_IDS = Object.keys(SLOT_NAMES);

const SCENES = [
  { label: "Back", id: "back", frame: 45 },
  { label: "Front", id: "front", frame: 0 },
  { label: "Side", id: "side", frame: 15 },
];

const SKINS = [1, 2, 3, 4, 5];

const DEFAULT_COSMETICS: Partial<Record<Cosmetic["slot"], string>> = {
  hair: "Default Hair",
  top: "T-Shirt",
  pants: "Pants",
  shoes: "Shoes",
};

export default function CosmeticBuilder() {
  const [manifest, setManifest] =
    useState<RendererManifest | null>(null);
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([]);
  const [loadingCosmetics, setLoadingCosmetics] = useState(true);
  const [rendering, setRendering] = useState(true);

  const [selectedSlot, setSelectedSlot] = useState("hat");
  const [query, setQuery] = useState("");
  const [scene, setScene] = useState("front");
  const [skin, setSkin] = useState(1);

  const [equippedCosmetics, setEquippedCosmetics] =
    useState<Partial<Record<Cosmetic["slot"], string>>>(
      DEFAULT_COSMETICS
    );

  const [previewImage, setPreviewImage] = useState("");
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadingCosmetics(true);
        const loaded = await getRendererManifest();

        if (cancelled) return;

        setManifest(loaded);
setCosmetics(
  Object.entries(loaded.cosmetics).map(
    ([name, value]) => ({
      ...value,
      name,
    })
  )
);
      } catch (error) {
        console.error(
          "Failed to load local cosmetic renderer:",
          error
        );

        if (!cancelled) {
          setPreviewError(
            "The local PokeMMO cosmetic renderer could not be loaded."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCosmetics(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cosmetics.filter((item) => {
      if (item.slot !== selectedSlot) return false;

      if (!q) return true;

      return (
        item.name.toLowerCase().includes(q) ||
        String(item.layer_index).includes(q)
      );
    });
  }, [cosmetics, selectedSlot, query]);

  useEffect(() => {
    if (!manifest) return;

    let cancelled = false;

    async function render() {
      try {
        setRendering(true);
        setPreviewError("");

        const selectedScene = SCENES.find(
          (item) => item.id === scene
        );

        const image = await getCosmeticSetupImage({
          skin,
          frame: selectedScene?.frame ?? 0,
          cosmetics: equippedCosmetics,
        });

        if (!cancelled) {
          setPreviewImage(image);
        }
      } catch (error) {
        console.error(
          "Failed to render local character:",
          error
        );

        if (!cancelled) {
          setPreviewImage("");
          setPreviewError(
            "This character could not be rendered."
          );
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [manifest, skin, scene, equippedCosmetics]);

  const selectedItem = equippedCosmetics[selectedSlot as Cosmetic["slot"]];

  const selectedOutfit = SLOT_IDS.map((slotId) => {
    const itemName =
      equippedCosmetics[slotId as Cosmetic["slot"]];

    if (!itemName) return null;

    const item = cosmetics.find(
      (entry) =>
        entry.name === itemName &&
        entry.slot === slotId
    );

    if (!item) return null;

    return { slotId, item };
  }).filter(
    (
      entry
    ): entry is { slotId: string; item: Cosmetic } =>
      entry !== null
  );

  function selectCosmetic(item: Cosmetic) {
    setEquippedCosmetics((current) => ({
      ...current,
      [item.slot]: item.name,
    }));

    setPreviewError("");
  }

  function removeCosmetic(slotId: string) {
    setEquippedCosmetics((current) => {
      const next = { ...current };
      delete next[slotId as Cosmetic["slot"]];
      return next;
    });

    setPreviewError("");
  }

  function resetOutfit() {
    setEquippedCosmetics(DEFAULT_COSMETICS);
    setSkin(1);
    setScene("front");
    setSelectedSlot("hat");
    setQuery("");
    setPreviewError("");
  }

  function randomize() {
    const next: Partial<
      Record<Cosmetic["slot"], string>
    > = {};

    for (const slot of SLOT_IDS) {
      const choices = cosmetics.filter(
        (item) => item.slot === slot
      );

      if (!choices.length) continue;

      const choice =
        choices[Math.floor(Math.random() * choices.length)];

      next[choice.slot] = choice.name;
    }

    setEquippedCosmetics(next);
    setSkin(
      SKINS[Math.floor(Math.random() * SKINS.length)]
    );
    setPreviewError("");
  }

  function getCosmeticIcon(item: Cosmetic) {
    return `/team-fate-renderer/${item.icon}`;
  }

  return (
    <div className="cosmetic-builder-page">
      <div className="cosmetic-builder-hero">
        <div>
          <h1>Cosmetic Builder</h1>
          <p>
            Build your PokeMMO outfit using the local Team Fate
            renderer.
          </p>
        </div>

        <div className="cosmetic-actions">
          <button
            type="button"
            onClick={randomize}
            disabled={loadingCosmetics || !cosmetics.length}
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

      <div className="cosmetic-builder-layout">
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

          <div className="cosmetic-list">
            {loadingCosmetics ? (
              <div className="cosmetic-empty">
                Loading local cosmetics...
              </div>
            ) : (
              <>
                {filtered.map((item) => {
                  const isSelected =
                    selectedItem === item.name;

                  return (
                    <button
                      key={`${item.slot}-${item.name}`}
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
                          {item.layer_index}
                        </span>
                      </div>

                      <div className="cosmetic-item-copy">
                        <strong>{item.name}</strong>
                        <small>
                          Local asset · Resource{" "}
                          {item.layer_index}
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

        <section className="cosmetic-panel cosmetic-preview">
          <div className="cosmetic-preview-heading">
            <div>
              <h2>Character Preview</h2>

              <span>
                {selectedItem
                  ? `${SLOT_NAMES[selectedSlot]}: ${selectedItem}`
                  : "Default outfit"}
              </span>
            </div>

            <div className="cosmetic-preview-controls">
              <div className="cosmetic-gender">
                <span className="cosmetic-control-label">
                  Skin
                </span>

                <div className="cosmetic-scenes">
                  {SKINS.map((skinId) => (
                    <button
                      key={skinId}
                      type="button"
                      className={
                        skin === skinId ? "active" : ""
                      }
                      onClick={() => setSkin(skinId)}
                    >
                      {skinId}
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
                      scene === item.id ? "active" : ""
                    }
                    onClick={() => setScene(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="cosmetic-preview-body">
            <div className="cosmetic-stage">
              {previewImage && !previewError ? (
                <img
                  key={`${skin}-${scene}-${JSON.stringify(
                    equippedCosmetics
                  )}`}
                  className="cosmetic-character"
                  src={previewImage}
                  alt="PokeMMO character preview"
                />
              ) : rendering ? (
                <div className="cosmetic-preview-error">
                  <strong>Rendering...</strong>
                  <p>Building the character locally.</p>
                </div>
              ) : (
                <div className="cosmetic-preview-error">
                  <strong>Preview unavailable</strong>
                  <p>{previewError}</p>
                  <button
                    type="button"
                    onClick={() => setPreviewError("")}
                  >
                    Retry Preview
                  </button>
                </div>
              )}
            </div>

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
                    ({ slotId, item }) => (
                      <button
                        key={slotId}
                        type="button"
                        className="cosmetic-selected-item"
                        title={`Remove ${item.name}`}
                        onClick={() =>
                          removeCosmetic(slotId)
                        }
                      >
                        <span>
                          {SLOT_NAMES[slotId]}
                        </span>

                        <strong>{item.name}</strong>

                        <small>Click to remove</small>
                      </button>
                    )
                  )}
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>

      <div className="cosmetic-builder-note">
        {loadingCosmetics
          ? "Loading the local PokeMMO cosmetic catalog..."
          : `Local cosmetic catalog: ${cosmetics.length} records loaded.`}
      </div>
    </div>
  );
}
