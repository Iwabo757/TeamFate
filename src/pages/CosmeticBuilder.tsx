import { useEffect, useMemo, useState } from "react";
import "../cosmetic-builder.css";

import {
  renderCharacterToDataUrl,
} from "../renderer/renderer";

import type {
  CosmeticSlot,
  RendererManifest,
} from "../renderer/renderer";

type CatalogCosmetic = {
  item_id: number;
  internal_id?: number;
  api_ids?: number[];
  renderer_supported?: boolean;
  name: string;
  icon_id: number;
  slot: number;
  attribute?: number;
  festival?: number;
  limitation?: number;
  month?: number;
  year?: number;
};

type LocalManifestCosmetic = {
  name: string;
  slot: CosmeticSlot;
  id?: string;
  icon?: string;
  layer?: string;
  frames?: string[];
  api_id?: number;
  apiId?: number;
  api_ids?: number[];
};

type LocalCosmetic = {
  name: string;
  slot: CosmeticSlot;
  icon?: string;
  layer?: string;
  icon_index?: number;
  layer_index?: number;
  slot_code?: number;
  item_id: number;
  internal_id?: number;
  icon_id?: number;
  api_ids?: number[];
  year?: number;
  hasLocalAsset: boolean;
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

const ASSET_ROOT =
  "/team-fate-renderer";

/* =========================================================
   SLOTS
   ========================================================= */

const SLOT_NAMES: Record<
  CosmeticSlot,
  string
> = {
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

const API_SLOT_TO_COSMETIC_SLOT: Record<number, CosmeticSlot> = {
  2: "hat",
  3: "hair",
  4: "eyes",
  5: "face",
  6: "back",
  7: "top",
  8: "held",
  9: "shoes",
  10: "pants",
  11: "tool",
  12: "mount",
};

const COSMETIC_ICON_BASE =
  "https://www.pikammo.fr/Pokemmo/assets/img/vanity";

/* =========================================================
   DEFAULT OUTFIT
   ========================================================= */

// No cosmetic defaults. The API receives zero for every unselected slot.

/* =========================================================
   CHARACTER VIEWS
   =========================================================

   These are the actual idle directional frames from the local base
   character sequence:

   0 = Front
   2 = Side
   1 = Back

   Cosmetic directional resources are indexed against these same frame
   numbers, so the renderer must receive the real base frame instead of
   converting it into artificial 13/26/39 direction groups.
*/

const VIEW_DEFINITIONS = [
  {
    label: "Front",
    frame: 0,
  },
  {
    label: "Side",
    frame: 2,
  },
  {
    label: "Back",
    frame: 1,
  },
];
/* =========================================================
   COLORS
   ========================================================= */

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

const DEFAULT_COLOR =
  "#6B4634";

/* =========================================================
   COLORABLE SLOTS
   ========================================================= */

function isColorableSlot(
  slot: CosmeticSlot
): boolean {
  return (
    slot === "hair" ||
    slot === "top" ||
    slot === "pants" ||
    slot === "shoes" ||
    slot === "back" ||
    slot === "hat"
  );
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function CosmeticBuilder() {
  const [manifest, setManifest] =
    useState<RendererManifest | null>(
      null
    );

  const [catalog, setCatalog] =
    useState<CatalogCosmetic[]>([]);

  const [catalogLoading, setCatalogLoading] =
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
      Partial<
        Record<CosmeticSlot, string>
      >
    >({});

  const [colors, setColors] =
    useState<
      Partial<
        Record<CosmeticSlot, string>
      >
    >({
      hair: DEFAULT_COLOR,
    });

  const [views, setViews] =
    useState<ViewPreview[]>([]);

  const [previewError, setPreviewError] =
    useState("");

  /* =======================================================
     LOAD MANIFEST + CURRENT POKEMMO CATALOG
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setCatalogLoading(true);
        setLoadError("");

        const [manifestResponse, catalogResponse] =
          await Promise.all([
            fetch(`${ASSET_ROOT}/manifest.json`),
            fetch("/api/cosmetics"),
          ]);

        if (!manifestResponse.ok) {
          throw new Error(
            `Manifest returned ${manifestResponse.status}`
          );
        }

        if (!catalogResponse.ok) {
          throw new Error(
            `Cosmetic catalog returned ${catalogResponse.status}`
          );
        }

        const manifestData =
          (await manifestResponse.json()) as RendererManifest;

        const catalogData =
          (await catalogResponse.json()) as CatalogCosmetic[];

        if (!manifestData.base || !manifestData.cosmetics) {
          throw new Error(
            "Invalid local renderer manifest."
          );
        }

        if (!Array.isArray(catalogData)) {
          throw new Error(
            "Cosmetic catalog returned invalid data."
          );
        }

        if (!cancelled) {
          setManifest(manifestData);
          setCatalog(catalogData);
        }
      } catch (error) {
        console.error(
          "Failed to load cosmetic builder data:",
          error
        );

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load cosmetic catalog."
          );
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     COSMETIC ARRAY

     The current /api/cosmetics catalog is authoritative for
     the item list. The local manifest is only used to attach
     Team Fate assets/icons when they exist.
     ======================================================= */

  const cosmetics =
    useMemo<LocalCosmetic[]>(() => {
      if (!manifest || !catalog.length) {
        return [];
      }

      const localByName = new Map<string, LocalManifestCosmetic>();

      for (const [name, item] of Object.entries(manifest.cosmetics)) {
        if (!item) {
          continue;
        }

        localByName.set(name.trim().toLowerCase(), {
          name,
          slot: item.slot,
          id: item.id,
          icon: item.icon,
          layer: item.layer,
          frames: item.frames,
          api_id: item.api_id,
          apiId: item.apiId,
          api_ids: item.api_ids,
        });
      }

      const merged: LocalCosmetic[] = [];

      for (const item of catalog) {
        const slot = API_SLOT_TO_COSMETIC_SLOT[item.slot];

        // Slot 1 (Forehead) is not a supported Fiereu URL slot.
        if (!slot) {
          continue;
        }

        const local =
          localByName.get(item.name.trim().toLowerCase());

        merged.push({
          ...(local ?? {}),
          name: item.name,
          slot,
          item_id: item.item_id,
          internal_id: item.internal_id,
          icon_id: item.icon_id,
          hasLocalAsset: Boolean(local),
        });
      }

      // Keep the older Team Fate hair entries visible as well. These are
      // character hair variants rather than entries in the 794-item vanity
      // catalog, so they are sourced from the local manifest only.
      const catalogNames = new Set(
        merged.map((item) => item.name.trim().toLowerCase())
      );

      for (const [name, item] of Object.entries(manifest.cosmetics)) {
        if (item.slot !== "hair") continue;
        const key = name.trim().toLowerCase();
        if (catalogNames.has(key)) continue;

        merged.push({
          name,
          slot: "hair",
          icon: item.icon,
          layer: item.layer,
          item_id: Number(item.api_id ?? item.apiId ?? item.id ?? 0),
          internal_id: undefined,
          icon_id: undefined,
          api_ids: item.api_ids,
          year: undefined,
          hasLocalAsset: true,
        });
      }

      return merged;
    }, [manifest, catalog]);

  /* =======================================================
     RENDERER MANIFEST

     The local Team Fate manifest only contains assets that were
     extracted into the pak. The PokeMMO catalog is larger. For any
     catalog item that is not locally extracted, create a lightweight
     renderer entry carrying the real Clothes API ids.
     ======================================================= */

  const rendererManifest = useMemo<RendererManifest | null>(() => {
    if (!manifest) {
      return null;
    }

    const mergedCosmetics: RendererManifest["cosmetics"] = {
      ...manifest.cosmetics,
    };

    for (const item of catalog) {
      const slot = API_SLOT_TO_COSMETIC_SLOT[item.slot];
      if (!slot) continue;

      const existing = mergedCosmetics[item.name];
      // Try the PokeMMO internal ID first. Older Fiereu cosmetics use that
      // namespace; the API/vanity ID is kept as a fallback.
      // Keep both namespaces, but do not declare the vanity ID as the
      // authoritative renderer ID. The renderer has explicit Fiereu mappings
      // for cosmetics where internal and vanity IDs differ.
      const ids = [
        ...(existing?.api_ids ?? []),
        existing?.api_id,
        existing?.apiId,
        ...(item.api_ids ?? []),
        item.item_id,
        item.internal_id,
      ].filter(
        (id): id is number =>
          typeof id === "number" && Number.isFinite(id) && id > 0
      );

      mergedCosmetics[item.name] = {
        ...(existing ?? {
          name: item.name,
          slot,
          layer: "",
        }),
        name: item.name,
        slot,
        api_id: undefined,
        api_ids: Array.from(new Set(ids)),
      };
    }

    return {
      ...manifest,
      cosmetics: mergedCosmetics,
    };
  }, [manifest, catalog]);

  /* =======================================================
     FILTERED COSMETICS
     ======================================================= */

  const filtered =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      return cosmetics.filter(
        (item) => {
          if (
            item.slot !==
            selectedSlot
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          return (
            item.name.toLowerCase().includes(search) ||
            String(item.item_id ?? "").includes(search) ||
            String(item.internal_id ?? "").includes(search) ||
            String(item.year ?? "").includes(search) ||
            String(item.layer_index ?? "").includes(search)
          );
        }
      );
    }, [
      cosmetics,
      selectedSlot,
      query,
    ]);

  /* =======================================================
     CURRENT COLOR
     ======================================================= */

  const selectedColor =
    colors[selectedSlot] ??
    DEFAULT_COLOR;

  /* =======================================================
     RENDER THREE VIEWS
     ======================================================= */

  useEffect(() => {
    /*
     * Important:
     *
     * Copy manifest into a constant AFTER the null check.
     * This makes TypeScript understand that the value passed
     * into the async rendering function cannot be null.
     */
    if (!rendererManifest) {
      return;
    }

    const renderManifest =
      rendererManifest;

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
                        renderManifest,

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
                       * Native sprite:
                       * 57 x 56
                       *
                       * Render:
                       * 228 x 224
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
    rendererManifest,
    skin,
    equipped,
    colors,
  ]);

  /* =======================================================
     SELECT COSMETIC
     ======================================================= */

  function selectCosmetic(
    item: LocalCosmetic
  ) {
    setEquipped(
      (current) => ({
        ...current,
        [selectedSlot]:
          item.name,
      })
    );

    setPreviewError("");
  }

  /* =======================================================
     REMOVE COSMETIC
     ======================================================= */

  function removeCosmetic(
    slot: CosmeticSlot
  ) {
    setEquipped(
      (current) => {
        const next = {
          ...current,
        };

        delete next[slot];

        return next;
      }
    );

    setPreviewError("");
  }

  /* =======================================================
     CHANGE COLOR
     ======================================================= */

  function changeColor(
    color: string
  ) {
    setColors(
      (current) => ({
        ...current,
        [selectedSlot]:
          color,
      })
    );
  }

  /* =======================================================
     RESET
     ======================================================= */

  function reset() {
    setSkin(1);

    setSelectedSlot("hat");

    setQuery("");

    setEquipped({});

    setColors({
      hair: DEFAULT_COLOR,
    });

    setPreviewError("");
  }

  /* =======================================================
     RANDOMIZE
     ======================================================= */

  function randomize() {
    if (!cosmetics.length || catalogLoading) {
      return;
    }

    const next: Partial<
      Record<CosmeticSlot, string>
    > = {};

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

    setPreviewError("");
  }

  /* =======================================================
     SELECTED OUTFIT
     ======================================================= */

  const selectedOutfit =
    useMemo<
      SelectedOutfitItem[]
    >(() => {
      if (!manifest) {
        return [];
      }

      return SLOT_IDS.reduce<
        SelectedOutfitItem[]
      >(
        (
          result,
          slot
        ) => {
          const name =
            equipped[slot];

          if (!name) {
            return result;
          }

          const exists = cosmetics.some(
            (item) =>
              item.name === name &&
              item.slot === slot
          );

          if (!exists) {
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
      cosmetics,
      equipped,
    ]);

  /* =======================================================
     RENDER PAGE
     ======================================================= */

  return (
    <div className="cosmetic-builder-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <div className="cosmetic-builder-hero">

        <div>
          <h1>
            Cosmetic Builder
          </h1>

          <p>
            Build your PokeMMO
            character using the
            PokeMMO cosmetic renderer.
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

      {/* =================================================
          MAIN
          ================================================= */}

      <div className="cosmetic-builder-layout">

        {/* =================================================
            CATALOG
            ================================================= */}

        <section className="cosmetic-panel cosmetic-catalog">

          <div className="cosmetic-panel-heading">

            <div>
              <h2>
                Cosmetics
              </h2>

              <span>
                {catalogLoading
                  ? "Loading..."
                  : `${filtered.length} available`}
              </span>
            </div>

            <input
              type="text"
              value={query}
              onChange={(
                event
              ) =>
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
            ) : catalogLoading ? (
              <div className="cosmetic-empty">
                Loading PokeMMO
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
                        key={`${item.slot}-${item.name}-${item.layer_index}`}
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

{item.icon ? (
  <img
    src={`${ASSET_ROOT}/${item.icon}`}
    alt=""
    loading="lazy"
  />
) : item.icon_id ? (
  <img
    src={`${COSMETIC_ICON_BASE}/${item.icon_id}.png`}
    alt=""
    loading="lazy"
  />
) : null}

                          <span>
                            {item.item_id ?? item.layer_index ?? ""}
                          </span>

                        </div>

                        <div className="cosmetic-item-copy">

                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <small>
                            PokeMMO cosmetic · {item.item_id}
                            {item.year ? ` · ${item.year}` : ""}
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

        {/* =================================================
            PREVIEW
            ================================================= */}

        <section className="cosmetic-panel cosmetic-preview">

          {/* PREVIEW HEADER */}

          <div className="cosmetic-preview-heading">

            <div>
              <h2>
                Character Preview
              </h2>

              <span>
                {equipped[
                  selectedSlot
                ]
                  ? `${SLOT_NAMES[selectedSlot]}: ${equipped[selectedSlot]}`
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

          {/* =================================================
              THREE PERMANENT VIEWS
              ================================================= */}

          <div
            className="cosmetic-preview-body"
            style={{
              minHeight: 0,
            }}
          >

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

            {/* =================================================
                SELECTED OUTFIT
                ================================================= */}

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

              {/* =================================================
                  COLOR
                  ================================================= */}

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

                    {/* PRESET COLORS */}

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

                              padding:
                                0,

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
        {catalogLoading
          ? "Loading current PokeMMO cosmetic catalog..."
          : `${cosmetics.length} PokeMMO cosmetics available in the builder.`}
      </div>

    </div>
  );
}