// src/renderer/renderer.ts

// Team Fate cosmetic renderer
//
// The Fiereu / PokeMMO Clothes API is responsible for:
// - Cosmetic artwork
// - Front / Back / Side artwork
// - Cosmetic layering
//
// The Team Fate manifest is only used to determine which cosmetics
// are equipped.
//
// IMPORTANT:
// - Local frame numbers are NOT API item IDs.
// - Local manifest layer indexes are NOT API item IDs.
// - Team Fate skin numbers are NOT part of the Fiereu API URL.

export type CosmeticSlot =
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

export type Cosmetic = {
  id?: string;
  name?: string;
  slot: CosmeticSlot;
  layer: string;
  frames?: string[];
  icon?: string;

  // Optional real Fiereu / PokeMMO API item ID.
  api_id?: number;
  apiId?: number;
};

export type RendererManifest = {
  format_version: number;

  base: Record<
    string,
    {
      frames: string[];
      previews: string[];
    }
  >;

  cosmetics: Record<string, Cosmetic>;

  slot_codes?: Record<string, string>;
};

export type CosmeticTints = Partial<
  Record<
    "hair" | "top" | "pants" | "shoes" | "back" | "hat",
    string
  >
>;

export type RenderOptions = {
  manifest: RendererManifest;
  baseUrl?: string;
  skin?: number;
  frame?: number;
  cosmetics?: Partial<Record<CosmeticSlot, string>>;
  tints?: CosmeticTints;
  scale?: number;
};

export type RendererView =
  | "front"
  | "side"
  | "back";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_BASE_URL =
  "/team-fate-renderer";

const API_BASE =
  "https://apis.fiereu.de/pokemmoclothes/v1";

const API_VERSION = 2;
const API_GENDER = 1;

/**
 * Fiereu scene IDs:
 *
 * 1 = Back
 * 2 = Front
 * 3 = Side
 */
const API_SCENE: Record<
  RendererView,
  number
> = {
  back: 1,
  front: 2,
  side: 3,
};

/* -------------------------------------------------------------------------- */
/* Fiereu slot mapping                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Fiereu API URL order:
 *
 * back
 * bicycle
 * eyes
 * face
 * gloves
 * hair
 * hat
 * legs
 * shoes
 * top
 *
 * The Team Fate slot names are translated into this order below.
 */
const API_SLOTS: CosmeticSlot[] = [
  "back",
  "mount",
  "eyes",
  "face",
  "held",
  "hair",
  "hat",
  "pants",
  "shoes",
  "top",
];

/* -------------------------------------------------------------------------- */
/* PokeMMO cosmetic catalog                                                   */
/* -------------------------------------------------------------------------- */

const ITEM_DATA_URL =
  "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-hub/master/src/data/pokemmo/item.json";

type ApiItem = {
  id: number;
  en_name?: string;
  key?: string;
  category?: number;
};

type ApiCatalog = {
  byName: Map<string, number>;
  byKey: Map<string, number>;
  bySlug: Map<string, number>;
};

let manifestPromise:
  | Promise<RendererManifest>
  | null = null;

let apiCatalogPromise:
  | Promise<ApiCatalog>
  | null = null;

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
/* -------------------------------------------------------------------------- */

function joinUrl(
  baseUrl: string,
  path: string
): string {
  if (!path) {
    return "";
  }

  if (
    /^https?:\/\//i.test(path) ||
    path.startsWith("/")
  ) {
    return path;
  }

  return `${baseUrl.replace(
    /\/+$/,
    ""
  )}/${path.replace(/^\/+/, "")}`;
}

/* -------------------------------------------------------------------------- */
/* Manifest loading                                                           */
/* -------------------------------------------------------------------------- */

export async function loadRendererManifest(
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RendererManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(
      joinUrl(baseUrl, "manifest.json"),
      {
        cache: "no-cache",
      }
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load renderer manifest: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as RendererManifest;
    });
  }

  return manifestPromise;
}

/* -------------------------------------------------------------------------- */
/* Name normalization                                                         */
/* -------------------------------------------------------------------------- */

function normalizeName(
  value: string
): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\s*\((?:m|f)\)\s*$/i,
      ""
    )
    .replace(
      /\bcolour\b/g,
      "color"
    )
    .replace(
      /\bxmas\b/g,
      "christmas"
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

function compact(
  value: string
): string {
  return normalizeName(value).replace(
    /\s+/g,
    ""
  );
}

function slug(
  value: string
): string {
  return normalizeName(value).replace(
    /\s+/g,
    "-"
  );
}

function addLookup(
  map: Map<string, number>,
  key: string | undefined,
  id: number
): void {
  if (!key) {
    return;
  }

  if (!map.has(key)) {
    map.set(key, id);
  }
}

/* -------------------------------------------------------------------------- */
/* PokeMMO catalog loading                                                    */
/* -------------------------------------------------------------------------- */

async function loadApiCatalog(): Promise<ApiCatalog> {
  if (!apiCatalogPromise) {
    apiCatalogPromise = fetch(
      ITEM_DATA_URL,
      {
        cache: "force-cache",
      }
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load PokeMMO cosmetic catalog: ${response.status}`
        );
      }

      const items =
        (await response.json()) as ApiItem[];

      const byName =
        new Map<string, number>();

      const byKey =
        new Map<string, number>();

      const bySlug =
        new Map<string, number>();

      for (const item of items) {
        /*
         * PokeMMO category 6 = cosmetic items.
         */
        if (
          item.category !== 6 ||
          !Number.isFinite(item.id)
        ) {
          continue;
        }

        if (item.en_name) {
          addLookup(
            byName,
            normalizeName(item.en_name),
            item.id
          );

          addLookup(
            bySlug,
            slug(item.en_name),
            item.id
          );
        }

        if (item.key) {
          addLookup(
            byKey,
            normalizeName(item.key),
            item.id
          );

          addLookup(
            bySlug,
            slug(item.key),
            item.id
          );
        }
      }

      return {
        byName,
        byKey,
        bySlug,
      };
    });
  }

  return apiCatalogPromise;
}

/* -------------------------------------------------------------------------- */
/* Known API IDs                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Known Fiereu / PokeMMO IDs that are not available in the older
 * PokeMMO Hub item.json mirror.
 *
 * These are actual PokeMMO item IDs.
 * They are NOT Team Fate layer indexes.
 */
const KNOWN_FIEREU_IDS: Record<
  string,
  number
> = {
  "elegant ponytail": 2563,
};

/* -------------------------------------------------------------------------- */
/* Name aliases                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Only keep aliases where the Team Fate name and PokeMMO catalog name
 * genuinely differ.
 *
 * Mermaid Hair Crown is intentionally NOT here.
 *
 * The manifest / selection should use:
 *
 *     Mermaid Hair (Alt)
 *
 * directly.
 */
const NAME_ALIASES: Record<
  string,
  string[]
> = {
  "default hair": [
    "default hair",
  ],

  brown: [
    "brown eyes",
  ],

  "brown eyes": [
    "brown eyes",
  ],

  angry: [
    "angry eyes",
  ],

  "angry eyes": [
    "angry eyes",
  ],

  "rock star": [
    "rockstar",
    "rock star",
  ],

  "desu's lab coat (colour)": [
    "desu's lab coat (colour)",
    "desu's lab coat (color)",
  ],

  "red christmas stocking": [
    "red christmas stocking",
    "red xmas stocking",
  ],

  "green christmas stocking": [
    "green christmas stocking",
    "green xmas stocking",
  ],

  "blue christmas stocking": [
    "blue christmas stocking",
    "blue xmas stocking",
  ],

  "yellow christmas stocking": [
    "yellow christmas stocking",
    "yellow xmas stocking",
  ],
};

/* -------------------------------------------------------------------------- */
/* API item resolution                                                        */
/* -------------------------------------------------------------------------- */

async function resolveApiItemId(
  cosmeticName: string,
  cosmetic: Cosmetic
): Promise<number> {
  /*
   * 1. Explicit API ID.
   *
   * This always takes priority.
   */
  const explicitId =
    cosmetic.api_id ??
    cosmetic.apiId;

  if (
    Number.isFinite(explicitId)
  ) {
    return Number(explicitId);
  }

  const normalized =
    normalizeName(cosmeticName);

  /*
   * 2. Known Fiereu corrections.
   */
  const knownId =
    KNOWN_FIEREU_IDS[normalized];

  if (
    knownId !== undefined
  ) {
    return knownId;
  }

  /*
   * 3. API defaults.
   */
  if (
    normalized === "default hair"
  ) {
    return 0;
  }

  if (
    normalized === "brown" ||
    normalized === "brown eyes"
  ) {
    return 1438;
  }

  if (
    normalized === "angry" ||
    normalized === "angry eyes"
  ) {
    return 1444;
  }

  /*
   * 4. Current PokeMMO catalog.
   */
  const catalog =
    await loadApiCatalog();

  const aliasNames =
    NAME_ALIASES[normalized] ?? [];

  const candidates = [
    cosmeticName,
    ...aliasNames,
  ];

  for (const candidate of candidates) {
    const candidateName =
      normalizeName(candidate);

    const candidateSlug =
      slug(candidate);

    const candidateCompact =
      compact(candidate);

    /*
     * Exact English name.
     */
    const byName =
      catalog.byName.get(
        candidateName
      );

    if (
      byName !== undefined
    ) {
      return byName;
    }

    /*
     * Slug match.
     */
    const bySlug =
      catalog.bySlug.get(
        candidateSlug
      );

    if (
      bySlug !== undefined
    ) {
      return bySlug;
    }

    /*
     * Internal catalog key.
     */
    const byKey =
      catalog.byKey.get(
        candidateName
      );

    if (
      byKey !== undefined
    ) {
      return byKey;
    }

    /*
     * Last-resort compact comparison.
     */
    for (const [
      key,
      id,
    ] of catalog.byKey) {
      if (
        compact(key) ===
        candidateCompact
      ) {
        return id;
      }
    }
  }

  throw new Error(
    `Unable to resolve Fiereu API item ID for cosmetic: "${cosmeticName}"`
  );
}

/* -------------------------------------------------------------------------- */
/* Cosmetic lookup                                                            */
/* -------------------------------------------------------------------------- */

function findCosmetic(
  manifest: RendererManifest,
  selectedName: string
): Cosmetic | undefined {
  /*
   * First try the manifest key directly.
   */
  const direct =
    manifest.cosmetics[selectedName];

  if (direct) {
    return direct;
  }

  /*
   * Then compare normalized names.
   */
  const normalizedSelected =
    normalizeName(selectedName);

  for (const [
    key,
    cosmetic,
  ] of Object.entries(
    manifest.cosmetics
  )) {
    if (
      normalizeName(key) ===
      normalizedSelected
    ) {
      return cosmetic;
    }

    if (
      cosmetic.name &&
      normalizeName(cosmetic.name) ===
        normalizedSelected
    ) {
      return cosmetic;
    }
  }

  return undefined;
}

/* -------------------------------------------------------------------------- */
/* API slot construction                                                      */
/* -------------------------------------------------------------------------- */

async function buildApiSlots(
  manifest: RendererManifest,
  cosmetics: Partial<
    Record<CosmeticSlot, string>
  > = {}
): Promise<number[]> {
  const slots: Partial<
    Record<CosmeticSlot, number>
  > = {};

  /*
   * Start every API slot at 0.
   */
  for (const slot of API_SLOTS) {
    slots[slot] = 0;
  }

  /*
   * Resolve every equipped cosmetic.
   */
  for (const [
    slot,
    selectedName,
  ] of Object.entries(cosmetics)) {
    if (!selectedName) {
      continue;
    }

    const cosmeticSlot =
      slot as CosmeticSlot;

    if (
      !API_SLOTS.includes(
        cosmeticSlot
      )
    ) {
      continue;
    }

    const cosmetic =
      findCosmetic(
        manifest,
        selectedName
      );

    if (!cosmetic) {
      throw new Error(
        `Cosmetic "${selectedName}" was not found in the renderer manifest.`
      );
    }

    slots[cosmeticSlot] =
      await resolveApiItemId(
        selectedName,
        cosmetic
      );
  }

  /*
   * Fiereu URL order:
   *
   * back
   * bicycle
   * eyes
   * face
   * gloves
   * hair
   * hat
   * legs
   * shoes
   * top
   */
  return [
    slots.back ?? 0,
    slots.mount ?? 0,
    slots.eyes ?? 0,
    slots.face ?? 0,
    slots.held ?? 0,
    slots.hair ?? 0,
    slots.hat ?? 0,
    slots.pants ?? 0,
    slots.shoes ?? 0,
    slots.top ?? 0,
  ];
}

/* -------------------------------------------------------------------------- */
/* Fiereu API URL                                                              */
/* -------------------------------------------------------------------------- */

function buildApiUrl(
  view: RendererView,
  slots: number[],
  baseUrl: string = API_BASE
): string {
  const scene =
    API_SCENE[view];

  return `${baseUrl}/${scene}/${API_VERSION}/${API_GENDER}/${slots.join(
    "-"
  )}.png`;
}

/* -------------------------------------------------------------------------- */
/* Image loading                                                               */
/* -------------------------------------------------------------------------- */

function loadImage(
  src: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.crossOrigin =
        "anonymous";

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            `Failed to load renderer image: ${src}`
          )
        );

      image.src = src;
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Magenta chroma key                                                          */
/* -------------------------------------------------------------------------- */

function removeMagentaBackground(
  canvas: HTMLCanvasElement
): void {
  const context =
    canvas.getContext("2d");

  if (!context) {
    return;
  }

  const imageData =
    context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  const pixels =
    imageData.data;

  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {
    const red =
      pixels[i];

    const green =
      pixels[i + 1];

    const blue =
      pixels[i + 2];

    /*
     * Fiereu uses magenta as the background.
     */
    if (
      red >= 200 &&
      blue >= 200 &&
      green <= 120
    ) {
      pixels[i + 3] = 0;
    }
  }

  context.putImageData(
    imageData,
    0,
    0
  );
}

/* -------------------------------------------------------------------------- */
/* Render character                                                            */
/* -------------------------------------------------------------------------- */

export async function renderCharacter(
  options: RenderOptions
): Promise<HTMLCanvasElement> {
  const {
    manifest,
    frame = 0,
    cosmetics = {},
    scale = 1,
  } = options;

  /*
   * Team Fate frame convention:
   *
   * 0 = Front
   * 1 = Back
   * 2 = Side
   *
   * The actual artwork is selected by the Fiereu scene ID.
   */
  const view: RendererView =
    frame === 1
      ? "back"
      : frame === 2
        ? "side"
        : "front";

  const slots =
    await buildApiSlots(
      manifest,
      cosmetics
    );

  const apiUrl =
    buildApiUrl(
      view,
      slots,
      API_BASE
    );

  const image =
    await loadImage(apiUrl);

  const safeScale =
    Number.isFinite(scale) &&
    scale > 0
      ? scale
      : 1;

  const width =
    Math.max(
      1,
      Math.round(
        image.naturalWidth *
          safeScale
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        image.naturalHeight *
          safeScale
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    width;

  canvas.height =
    height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Unable to create renderer canvas context."
    );
  }

  /*
   * Preserve pixel-art edges.
   */
  context.imageSmoothingEnabled =
    false;

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  removeMagentaBackground(
    canvas
  );

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Data URL helper                                                             */
/* -------------------------------------------------------------------------- */

export async function renderCharacterToDataUrl(
  options: RenderOptions
): Promise<string> {
  const canvas =
    await renderCharacter(
      options
    );

  return canvas.toDataURL(
    "image/png"
  );
}

/* -------------------------------------------------------------------------- */
/* Image helper                                                                */
/* -------------------------------------------------------------------------- */

export async function renderCharacterToImage(
  options: RenderOptions
): Promise<HTMLImageElement> {
  const dataUrl =
    await renderCharacterToDataUrl(
      options
    );

  return loadImage(
    dataUrl
  );
}