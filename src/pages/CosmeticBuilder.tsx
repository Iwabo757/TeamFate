import { useEffect, useMemo, useState } from "react";
import "../cosmetic-builder.css";

import { renderCharacterToDataUrl } from "../renderer/renderer";

import type {
  CosmeticSlot,
  RendererManifest,
} from "../renderer/renderer";

type LocalCosmetic = {
  name: string;
  slot: CosmeticSlot;
  icon: string;
  layer: string;
  icon_index: number;
  layer_index: number;
  slot_code: number;
};

type ViewPreview = {
  label: string;
  frame: number;
  image: string;
};

type SelectedOutfitItem = {
  slot: CosmeticSlot;
  name: string;
};

const ASSET_ROOT = "/team-fate-renderer";

const SLOT_NAMES: Record<CosmeticSlot, string> = {
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

const SLOT_IDS: CosmeticSlot[] = [
  "hat",
  "hair",
  "eyes",
  "face",
  "back",
  "top",
  "held",
  "shoes",
  "pants",
  "tool",
  "mount",
];

const DEFAULT_COSMETICS: Partial<
  Record<CosmeticSlot, string>
> = {
  eyes: "Brown",
  hair: "Default Hair",
  top: "T-Shirt",
  pants: "Pants",
  shoes: "Shoes",
};

/*
 * Three permanent character views.
 *
 * The character is rendered from the same
 * selected outfit in all three directions.
 */
const VIEW_DEFINITIONS = [
  {
    label: "Front",
    frame: 0,
  },
  {
    label: "Side",
    frame: 13,
  },
  {
    label: "Back",
    frame: 26,
  },
];

const COLOR_PRESETS = [
  {
    name: "Black",
    value: "#17151A",
  },
  {
    name: "Brown",
    value: "#6B4634",
  },
  {
    name: "Red",
    value: "#A63D45",
  },
  {
    name: "Orange",
    value: "#D4772D",
  },
  {
    name: "Blonde",
    value: "#D6B15E",
  },
  {
    name: "Green",
    value: "#4F8B63",
  },
  {
    name: "Blue",
    value: "#4E73B8",
  },
  {
    name: "Purple",
    value: "#7957A5",
  },
  {
    name: "Pink",
    value: "#D06A9B",
  },
  {
    name: "White",
    value: "#F2F2F2",
  },
];

const DEFAULT_COLOR = "#6B4634";

function isColorableSlot(
  slot: CosmeticSlot
): boolean {
  return [
    "hair",
    "top",
    "pants",
    "shoes",
    "back",
    "hat",
  ].includes(slot);
}

export default function CosmeticBuilder() {
  const [manifest, setManifest] =
    useState<RendererManifest | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [selectedSlot, setSelectedSlot] =
    useState<CosmeticSlot>("hat");

  const [query, setQuery] =
    useState("");

  const [skin, setSkin] =
    useState(1);

  const [equipped, setEquipped] =
    useState<
      Partial<Record<CosmeticSlot, string>>
    >({
      ...DEFAULT_COSMETICS,
    });

  const [colors, setColors] =
    useState<
      Partial<Record<CosmeticSlot, string>>
    >({
      hair: DEFAULT_COLOR,
    });

  const [views, setViews] =
    useState<ViewPreview[]>([]);

  const [previewError, setPreviewError] =
    useState("");

  /*
   * Load renderer manifest.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch(
          `${ASSET_ROOT}/manifest.json`
        );

        if (!response.ok) {
          throw new Error(
            `Manifest returned ${response.status}`
          );
        }

        const data =
          (await response.json()) as RendererManifest;

        if (
          !data.base ||
          !data.cosmetics
        ) {
          throw new Error(
            "Invalid local renderer manifest."
          );
        }

        if (!cancelled) {
          setManifest(data);
        }
      } catch (error) {
        console.error(
          "Failed to load local renderer:",
          error
        );

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load local renderer."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Convert manifest cosmetics to an array.
   */
  const cosmetics = useMemo<
    LocalCosmetic[]
  >(() => {
    if (!manifest) {
      return [];
    }

    return Object.entries(
      manifest.cosmetics
    ).map(([name, item]) => ({
      ...item,
      name,
    }));
  }, [manifest]);

  /*
   * Filter cosmetics by selected slot
   * and search query.
   */
  const filtered = useMemo(() => {
    const search =
      query.trim().toLowerCase();

    return cosmetics.filter((item) => {
      if (
        item.slot !== selectedSlot
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        item.name
          .toLowerCase()
          .includes(search) ||
        String(
          item.layer_index
        ).includes(search)
      );
    });
  }, [
    cosmetics,
    selectedSlot,
    query,
  ]);

  const selectedName =
    equipped[selectedSlot];

  const selectedColor =
    colors[selectedSlot] ??
    DEFAULT_COLOR;

  /*
   * Render all three views whenever
   * the character changes.
   */
  useEffect(() => {
    if (!manifest) {
      return;
    }

    const currentManifest =
      manifest;

    let cancelled = false;

    async function renderAllViews() {
      try {
        setPreviewError("");

        const renderedViews =
          await Promise.all(
            VIEW_DEFINITIONS.map(
              async (view) => {
                const image =
                  await renderCharacterToDataUrl(
                    {
                      manifest:
                        currentManifest,

                      baseUrl:
                        ASSET_ROOT,

                      skin,

                      frame:
                        view.frame,

                      cosmetics:
                        equipped,

                      tints:
                        colors,

                      /*
                       * 4x instead of 8x.
                       *
                       * Native sprite:
                       * 57x56
                       *
                       * Preview:
                       * 228x224
                       */
                      scale: 4,
                    }
                  );

                return {
                  label:
                    view.label,

                  frame:
                    view.frame,

                  image,
                };
              }
            )
          );

        if (!cancelled) {
          setViews(
            renderedViews
          );
        }
      } catch (error) {
        console.error(
          "Failed to render local character:",
          error
        );

        if (!cancelled) {
          setViews([]);

          setPreviewError(
            error instanceof Error
              ? error.message
              : "Character could not be rendered."
          );
        }
      }
    }

    renderAllViews();

    return () => {
      cancelled = true;
    };
  }, [
    manifest,
    skin,
    equipped,
    colors,
  ]);

  /*
   * Equip cosmetic.
   */
  function selectCosmetic(
    item: LocalCosmetic
  ) {
    setEquipped((current) => ({
      ...current,
      [selectedSlot]:
        item.name,
    }));

    setPreviewError("");
  }

  /*
   * Remove cosmetic.
   */
  function removeCosmetic(
    slot: CosmeticSlot
  ) {
    setEquipped((current) => {
      const next = {
        ...current,
      };

      const defaultCosmetic =
        DEFAULT_COSMETICS[slot];

      if (defaultCosmetic) {
        next[slot] =
          defaultCosmetic;
      } else {
        delete next[slot];
      }

      return next;
    });

    setPreviewError("");
  }

  /*
   * Change color.
   */
  function changeColor(
    color: string
  ) {
    setColors((current) => ({
      ...current,
      [selectedSlot]: color,
    }));
  }

  /*
   * Reset.
   */
  function reset() {
    setSkin(1);

    setSelectedSlot("hat");

    setQuery("");

    setEquipped({
      ...DEFAULT_COSMETICS,
    });

    setColors({
      hair: DEFAULT_COLOR,
    });

    setPreviewError("");
  }

  /*
   * Randomize.
   */
  function randomize() {
    if (!cosmetics.length) {
      return;
    }

    const next: Partial<
      Record<CosmeticSlot, string>
    > = {
      ...DEFAULT_COSMETICS,
    };

    for (
      const slot of SLOT_IDS
    ) {
      const choices =
        cosmetics.filter(
          (item) =>
            item.slot === slot
        );

      if (!choices.length) {
        continue;
      }

      const randomItem =
        choices[
          Math.floor(
            Math.random() *
              choices.length
          )
        ];

      next[slot] =
        randomItem.name;
    }

    setEquipped(next);

    setSkin(
      Math.floor(
        Math.random() * 5
      ) + 1
    );
  }

  /*
   * Selected outfit.
   */
  const selectedOutfit =
    useMemo<
      SelectedOutfitItem[]
    >(() => {
      return SLOT_IDS.reduce<
        SelectedOutfitItem[]
      >(
        (result, slot) => {
          const name =
            equipped[slot];

          if (!name) {
            return result;
          }

          if (
            !manifest?.cosmetics[
              name
            ]
          ) {
            return result;
          }

          result.push({
            slot,
            name,
          });

          return result;
        },
        []
      );
    }, [
      manifest,
      equipped,
    ]);

  return (
    <div className="cosmetic-builder-page">

      {/* HEADER */}
      <div className="cosmetic-builder-hero">

        <div>
          <h1>
            Cosmetic Builder
          </h1>

          <p>
            Build your PokeMMO
            character using the
            local Team Fate
            renderer.
          </p>
        </div>

        <div className="cosmetic-actions">

          <button
            type="button"
            onClick={randomize}
            disabled={!manifest}
          >
            Randomize
          </button>

          <button
            type="button"
            className="cosmetic-secondary"
            onClick={reset}
          >
            Reset
          </button>

        </div>
      </div>

      {/* MAIN */}
      <div className="cosmetic-builder-layout">

        {/* CATALOG */}
        <section className="cosmetic-panel cosmetic-catalog">

          <div className="cosmetic-panel-heading">

            <div>
              <h2>
                Cosmetics
              </h2>

              <span>
                {loading
                  ? "Loading..."
                  : `${filtered.length} available`}
              </span>
            </div>

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search cosmetics..."
              aria-label="Search cosmetics"
            />

          </div>

          {/* SLOT BUTTONS */}
          <div className="cosmetic-slots">

            {SLOT_IDS.map(
              (slot) => (
                <button
                  key={slot}
                  type="button"
                  className={
                    selectedSlot ===
                    slot
                      ? "cosmetic-slot active"
                      : "cosmetic-slot"
                  }
                  onClick={() => {
                    setSelectedSlot(
                      slot
                    );

                    setQuery("");
                  }}
                >
                  {
                    SLOT_NAMES[
                      slot
                    ]
                  }
                </button>
              )
            )}

          </div>

          {/* COSMETIC LIST */}
          <div className="cosmetic-list">

            {loadError ? (
              <div className="cosmetic-empty">
                {loadError}
              </div>
            ) : loading ? (
              <div className="cosmetic-empty">
                Loading local
                cosmetics...
              </div>
            ) : (
              <>
                {filtered.map(
                  (item) => {
                    const selected =
                      equipped[
                        selectedSlot
                      ] ===
                      item.name;

                    return (
                      <button
                        key={`${item.slot}-${item.name}`}
                        type="button"
                        className={
                          selected
                            ? "cosmetic-item selected"
                            : "cosmetic-item"
                        }
                        onClick={() =>
                          selectCosmetic(
                            item
                          )
                        }
                      >

                        <div className="cosmetic-item-icon">

                          <img
                            src={`${ASSET_ROOT}/${item.icon}`}
                            alt=""
                            loading="lazy"
                          />

                          <span>
                            {
                              item.layer_index
                            }
                          </span>

                        </div>

                        <div className="cosmetic-item-copy">

                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <small>
                            Local asset ·
                            Resource{" "}
                            {
                              item.layer_index
                            }
                          </small>

                        </div>

                      </button>
                    );
                  }
                )}

                {!filtered.length && (
                  <div className="cosmetic-empty">
                    No cosmetics
                    found.
                  </div>
                )}
              </>
            )}

          </div>
        </section>

        {/* PREVIEW */}
        <section className="cosmetic-panel cosmetic-preview">

          {/* PREVIEW HEADER */}
          <div className="cosmetic-preview-heading">

            <div>
              <h2>
                Character Preview
              </h2>

              <span>
                {selectedName
                  ? `${SLOT_NAMES[selectedSlot]}: ${selectedName}`
                  : "Default outfit"}
              </span>
            </div>

            {/* SKIN */}
            <div className="cosmetic-preview-controls">

              <div className="cosmetic-gender">

                <span className="cosmetic-control-label">
                  Skin
                </span>

                <div className="cosmetic-scenes">

                  {[1, 2, 3, 4, 5].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        className={
                          skin ===
                          value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSkin(
                            value
                          )
                        }
                      >
                        {value}
                      </button>
                    )
                  )}

                </div>

              </div>

            </div>

          </div>

          {/* PREVIEW AREA */}
          <div
            className="cosmetic-preview-body"
            style={{
              minHeight: 0,
            }}
          >

            {/* THREE VIEWS */}
            <div
              className="cosmetic-stage"
              style={{
                display:
                  "flex",

                flexDirection:
                  "row",

                justifyContent:
                  "space-evenly",

                alignItems:
                  "center",

                gap: 8,

                flexWrap:
                  "nowrap",

                width:
                  "100%",

                minWidth:
                  0,

                minHeight:
                  0,

                overflow:
                  "hidden",

                padding:
                  "10px 4px",
              }}
            >

              {views.length > 0 ? (
                views.map(
                  (view) => (
                    <div
                      key={
                        view.label
                      }
                      style={{
                        display:
                          "flex",

                        flexDirection:
                          "column",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        gap: 6,

                        flex:
                          "1 1 0",

                        minWidth:
                          0,

                        overflow:
                          "hidden",
                      }}
                    >

                      <span
                        style={{
                          fontWeight:
                            700,

                          fontSize:
                            13,

                          opacity:
                            0.8,

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          view.label
                        }
                      </span>

                      <img
                        src={
                          view.image
                        }
                        alt={`${view.label} PokeMMO character preview`}
                        style={{
                          width:
                            180,

                          height:
                            176,

                          maxWidth:
                            "100%",

                          objectFit:
                            "contain",

                          imageRendering:
                            "pixelated",

                          display:
                            "block",
                        }}
                      />

                    </div>
                  )
                )
              ) : (
                <div className="cosmetic-preview-error">
                  <strong>
                    {
                      previewError ||
                        "Loading preview..."
                    }
                  </strong>
                </div>
              )}

            </div>

            {/* SELECTED OUTFIT */}
            <aside className="cosmetic-selected">

              <div className="cosmetic-selected-title">
                Selected Outfit
              </div>

              <div className="cosmetic-selected-list">

                {selectedOutfit.map(
                  ({
                    slot,
                    name,
                  }) => (
                    <button
                      key={slot}
                      type="button"
                      className="cosmetic-selected-item"
                      onClick={() =>
                        removeCosmetic(
                          slot
                        )
                      }
                    >

                      <span>
                        {
                          SLOT_NAMES[
                            slot
                          ]
                        }
                      </span>

                      <strong>
                        {name}
                      </strong>

                      <small>
                        Click to
                        remove
                      </small>

                    </button>
                  )
                )}

              </div>

              {/* COLOR */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 18,
                  borderTop:
                    "1px solid rgba(255,255,255,.1)",
                }}
              >

                <div className="cosmetic-selected-title">
                  COLOR
                </div>

                <div
                  style={{
                    marginTop: 10,
                  }}
                >
                  <strong>
                    {
                      SLOT_NAMES[
                        selectedSlot
                      ]
                    }
                  </strong>
                </div>

                {isColorableSlot(
                  selectedSlot
                ) ? (
                  <>

                    {/* COLOR PRESETS */}
                    <div
                      style={{
                        display:
                          "flex",

                        gap: 7,

                        flexWrap:
                          "wrap",

                        marginTop:
                          12,
                      }}
                    >

                      {COLOR_PRESETS.map(
                        (color) => (
                          <button
                            key={
                              color.value
                            }
                            type="button"
                            title={
                              color.name
                            }
                            aria-label={
                              color.name
                            }
                            onClick={() =>
                              changeColor(
                                color.value
                              )
                            }
                            style={{
                              width:
                                28,

                              height:
                                28,

                              borderRadius:
                                "50%",

                              border:
                                selectedColor ===
                                color.value
                                  ? "3px solid white"
                                  : "2px solid rgba(255,255,255,.35)",

                              background:
                                color.value,

                              cursor:
                                "pointer",

                              boxShadow:
                                selectedColor ===
                                color.value
                                  ? "0 0 0 2px #4da3ff"
                                  : "none",
                            }}
                          />
                        )
                      )}

                    </div>

                    {/* CUSTOM COLOR */}
                    <div
                      style={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap: 10,

                        marginTop:
                          12,
                      }}
                    >

                      <input
                        type="color"
                        value={
                          selectedColor
                        }
                        onChange={(
                          event
                        ) =>
                          changeColor(
                            event
                              .target
                              .value
                          )
                        }
                        aria-label={`Choose ${SLOT_NAMES[selectedSlot]} color`}
                        style={{
                          width:
                            42,

                          height:
                            34,

                          padding:
                            2,

                          cursor:
                            "pointer",
                        }}
                      />

                      <span
                        style={{
                          fontSize:
                            12,

                          opacity:
                            0.7,
                        }}
                      >
                        Custom
                        color
                      </span>

                    </div>

                  </>
                ) : (
                  <small
                    style={{
                      display:
                        "block",

                      marginTop:
                        8,

                      opacity:
                        0.7,
                    }}
                  >
                    This slot
                    uses its
                    original
                    artwork
                    colors.
                  </small>
                )}

              </div>

            </aside>

          </div>

        </section>
      </div>

      {/* STATUS */}
      <div className="cosmetic-builder-note">
        {manifest
          ? `Local cosmetic catalog: ${cosmetics.length} records loaded.`
          : "Loading local renderer..."}
      </div>

    </div>
  );
}