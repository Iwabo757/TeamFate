```ts
// src/renderer/renderer.ts
//
// Team Fate cosmetic renderer
//
// The Fiereu / PokeMMO Clothes API is responsible for:
//   - cosmetic artwork
//   - correct Front / Back / Side artwork
//   - cosmetic layering
//
// The Team Fate manifest is only used to identify which cosmetics
// are equipped. Local frame numbers and layer indexes are NOT API IDs.
//

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
  api_id?: number;
  apiId?: number;
};

export type RendererManifest = {
  format_version: number;
  base: Record<string, { frames: string[]; previews: string[] }>;
  cosmetics: Record<string, Cosmetic>;
  slot_codes?: Record<string, string>;
};

export type CosmeticTints = Partial<
  Record<"hair" | "top" | "pants" | "shoes" | "back" | "hat", string>
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

export type RendererView = "front" | "side" | "back";

/* -------------------------------------------------------------------------- */
/* Fiereu API                                                                 */
/* -------------------------------------------------------------------------- */

const API_BASE = "https://apis.fiereu.de/pokemmoclothes/v1";

const API_VERSION = 2;
const API_GENDER = 1;

/**
 * Fiereu scene IDs:
 *
 * 1 = Back
 * 2 = Front
 * 3 = Side
 */
const API_SCENE: Record<RendererView, number> = {
  back: 1,
  front: 2,
  side: 3,
};

/**
 * Fiereu slot numbers.
 *
 * IMPORTANT:
 * These are API slot numbers.
 * They are NOT Team Fate manifest layer indexes.
 *
 * API URL order:
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
const API_SLOT: Record<CosmeticSlot, number> = {
  hat: 2,
  hair: 3,
  eyes: 4,
  face: 5,
  back: 6,
  top: 7,
  held: 8,
  shoes: 9,
  pants: 10,
  tool: 11,
  mount: 12,
};

/**
 * Slots that can actually be sent to Fiereu.
 *
 * All slots are initialized to 0 so that no default Hub cosmetics
 * leak into the Team Fate character.
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
/* PokeMMO item catalog                                                       */
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

let manifestPromise: Promise<RendererManifest> | null = null;
let apiCatalogPromise: Promise<ApiCatalog> | null = null;

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
/* -------------------------------------------------------------------------- */

const DEFAULT_BASE_URL = "/team-fate-renderer";

function joinUrl(baseUrl: string, path: string): string {
  if (!path) return "";

  if (/^https?:\/\//i.test(path) || path.startsWith("/")) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/* -------------------------------------------------------------------------- */
/* Manifest                                                                   */
/* -------------------------------------------------------------------------- */

export async function loadRendererManifest(
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RendererManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(joinUrl(baseUrl, "manifest.json"), {
      cache: "no-cache",
    }).then(async (response) => {
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
/* Cosmetic name normalization                                                */
/* -------------------------------------------------------------------------- */

function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s*\((?:m|f)\)\s*$/i, "")
    .replace(/\bcolour\b/g, "color")
    .replace(/\bxmas\b/g, "christmas")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: string): string {
  return normalizeName(value).replace(/\s+/g, "");
}

function slug(value: string): string {
  return normalizeName(value).replace(/\s+/g, "-");
}

function addLookup(
  map: Map<string, number>,
  key: string | undefined,
  id: number
): void {
  if (!key || map.has(key)) return;

  map.set(key, id);
}

/* -------------------------------------------------------------------------- */
/* PokeMMO catalog                                                            */
/* -------------------------------------------------------------------------- */

async function loadApiCatalog(): Promise<ApiCatalog> {
  if (!apiCatalogPromise) {
    apiCatalogPromise = fetch(ITEM_DATA_URL, {
      cache: "force-cache",
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load PokeMMO cosmetic catalog: ${response.status}`
        );
      }

      const items = (await response.json()) as ApiItem[];

      const byName = new Map<string, number>();
      const byKey = new Map<string, number>();
      const bySlug = new Map<string, number>();

      for (const item of items) {
        if (item.category !== 6 || !Number.isFinite(item.id)) {
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
/* Known cosmetic corrections                                                 */
/* -------------------------------------------------------------------------- */

/**
 * These are actual Fiereu / PokeMMO item IDs.
 *
 * They are NOT Team Fate layer indexes.
 */
const KNOWN_FIEREU_IDS: Record<string, number> = {
  "elegant ponytail": 2563,
};

/**
 * Cosmetic names used by the Team Fate pak that differ from
 * the names used by the current PokeMMO catalog.
 */
const NAME_ALIASES: Record<string, string[]> = {
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

  /**
   * Team Fate:
   *   Mermaid Hair Crown
   *
   * Current PokeMMO:
   *   Mermaid Hair (Alt)
   */
  "mermaid hair crown": [
    "mermaid hair (alt)",
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
   * 1. Explicit API ID always wins.
   *
   * This is the safest option for cosmetics where the manifest
   * already knows the actual PokeMMO item ID.
   */
  const explicitId = cosmetic.api_id ?? cosmetic.apiId;

  if (Number.isFinite(explicitId)) {
    return Number(explicitId);
  }

  const normalized = normalizeName(cosmeticName);

  /*
   * 2. Known hard-coded Fiereu corrections.
   */
  const knownId = KNOWN_FIEREU_IDS[normalized];

  if (knownId !== undefined) {
    return knownId;
  }

  /*
   * 3. Empty/default API values.
   */
  if (normalized === "default hair") {
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
   * 4. Resolve through the current PokeMMO item catalog.
   */
  const catalog = await loadApiCatalog();

  const candidates = [
    cosmeticName,
    ...(NAME_ALIASES[normalized] ?? []),
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate);

    const byName = catalog.byName.get(
      normalizedCandidate
    );

    if (byName !== undefined) {
      return byName;
    }

    const bySlug = catalog.bySlug.get(
      slug(candidate)
    );

    if (bySlug !== undefined) {
      return bySlug;
    }

    const byKey = catalog.byKey.get(
      normalizedCandidate
    );

    if (byKey !== undefined) {
      return byKey;
    }
  }

  /*
   * 5. Final compact comparison.
   *
   * Handles small naming differences such as:
   *
   * Rock Star
   * Rockstar
   */
  const target = compact(cosmeticName);

  for (const [key, id] of catalog.byName) {
    if (compact(key) === target) {
      return id;
    }
  }

  throw new Error(
    `No PokeMMO Clothes API item ID found for "${cosmeticName}". ` +
      `The manifest contains this cosmetic, but the name could not be ` +
      `resolved to a PokeMMO Clothes API item ID.`
  );
}

/* -------------------------------------------------------------------------- */
/* API slot construction                                                      */
/* -------------------------------------------------------------------------- */

async function buildApiSlots(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>
): Promise<Record<number, number>> {
  /*
   * Start every API slot empty.
   *
   * This is important because the API otherwise has defaults that can
   * appear even when Team Fate has nothing equipped in that slot.
   */
  const selected: Record<number, number> = {};

  for (const slot of API_SLOTS) {
    selected[API_SLOT[slot]] = 0;
  }

  /*
   * Resolve every equipped Team Fate cosmetic.
   */
  for (const slot of API_SLOTS) {
    const cosmeticName = cosmetics[slot];

    if (!cosmeticName) {
      continue;
    }

    const cosmetic = manifest.cosmetics?.[cosmeticName];

    if (!cosmetic) {
      throw new Error(
        `Cosmetic "${cosmeticName}" was not found in the renderer manifest.`
      );
    }

    /*
     * Never allow a cosmetic to be sent through the wrong API slot.
     */
    if (cosmetic.slot !== slot) {
      throw new Error(
        `Cosmetic "${cosmeticName}" belongs to slot "${cosmetic.slot}", ` +
          `but was requested in slot "${slot}".`
      );
    }

    selected[API_SLOT[slot]] =
      await resolveApiItemId(
        cosmeticName,
        cosmetic
      );
  }

  return selected;
}

/* -------------------------------------------------------------------------- */
/* API URL                                                                    */
/* -------------------------------------------------------------------------- */

function buildApiUrl(
  view: RendererView,
  slots: Record<number, number>
): string {
  /*
   * Exact Fiereu / PokeMMO Hub URL structure:
   *
   * /scene/version/gender/
   * back/
   * bicycle/
   * eyes/
   * face/
   * gloves/
   * hair/
   * hat/
   * legs/
   * shoes/
   * top
   */
  const orderedSlots = [
    slots[6],  // back
    slots[12], // bicycle / mount
    slots[4],  // eyes
    slots[5],  // face
    slots[8],  // gloves / held
    slots[3],  // hair
    slots[2],  // hat
    slots[10], // legs / pants
    slots[9],  // shoes
    slots[7],  // top
  ];

  return [
    API_BASE,
    API_SCENE[view],
    API_VERSION,
    API_GENDER,
    ...orderedSlots,
  ].join("/") + ".png";
}

/* -------------------------------------------------------------------------- */
/* Image loading                                                              */
/* -------------------------------------------------------------------------- */

function loadImage(
  url: string
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => {
      resolve(image);
    };

    image.onerror = () => {
      reject(
        new Error(
          `Failed to load renderer image:\n${url}`
        )
      );
    };

    image.src = url;
  });
}

/* -------------------------------------------------------------------------- */
/* Canvas                                                                     */
/* -------------------------------------------------------------------------- */

function makeCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

/* -------------------------------------------------------------------------- */
/* Chroma removal                                                             */
/* -------------------------------------------------------------------------- */

const CHROMA = {
  r: 255,
  g: 20,
  b: 147,
  tolerance: 8,
};

function removeChromaKey(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = context.getImageData(
    0,
    0,
    width,
    height
  );

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const redDifference = Math.abs(
      data[i] - CHROMA.r
    );

    const greenDifference = Math.abs(
      data[i + 1] - CHROMA.g
    );

    const blueDifference = Math.abs(
      data[i + 2] - CHROMA.b
    );

    if (
      redDifference <= CHROMA.tolerance &&
      greenDifference <= CHROMA.tolerance &&
      blueDifference <= CHROMA.tolerance
    ) {
      data[i + 3] = 0;
    }
  }

  context.putImageData(
    imageData,
    0,
    0
  );
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

async function renderApiView(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>,
  view: RendererView,
  scale: number
): Promise<HTMLCanvasElement> {
  const slots = await buildApiSlots(
    manifest,
    cosmetics
  );

  const url = buildApiUrl(
    view,
    slots
  );

  const image = await loadImage(url);

  const width =
    image.naturalWidth ||
    image.width;

  const height =
    image.naturalHeight ||
    image.height;

  if (!width || !height) {
    throw new Error(
      `Fiereu returned an invalid ${view} renderer image.`
    );
  }

  /*
   * Draw the API result directly.
   *
   * No local cosmetic frame compositing happens here.
   */
  const canvas = makeCanvas(
    width,
    height
  );

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Unable to create renderer canvas."
    );
  }

  context.imageSmoothingEnabled = false;

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  /*
   * Fiereu returns the magenta background.
   * Remove it before giving the canvas back to the UI.
   */
  removeChromaKey(
    context,
    width,
    height
  );

  const safeScale =
    Number.isFinite(scale) &&
    scale > 0
      ? scale
      : 1;

  if (safeScale === 1) {
    return canvas;
  }

  const output = makeCanvas(
    Math.round(width * safeScale),
    Math.round(height * safeScale)
  );

  const outputContext =
    output.getContext("2d");

  if (!outputContext) {
    throw new Error(
      "Unable to create scaled renderer canvas."
    );
  }

  outputContext.imageSmoothingEnabled = false;

  outputContext.drawImage(
    canvas,
    0,
    0,
    output.width,
    output.height
  );

  return output;
}

/* -------------------------------------------------------------------------- */
/* Public renderer                                                            */
/* -------------------------------------------------------------------------- */

export async function renderCharacter(
  options: RenderOptions
): Promise<HTMLCanvasElement> {
  const {
    manifest,
    frame = 0,
    cosmetics = {},
    tints: _tints = {},
    scale = 1,
  } = options;

  /*
   * The base frame is ONLY used to determine which Fiereu scene
   * should be requested.
   *
   * 0 = Front
   * 1 = Back
   * 2 = Side
   *
   * The actual cosmetic artwork and orientation are entirely
   * handled by Fiereu.
   */
  let view: RendererView = "front";

  switch (frame) {
    case 1:
      view = "back";
      break;

    case 2:
      view = "side";
      break;

    case 0:
    default:
      view = "front";
      break;
  }

  return renderApiView(
    manifest,
    cosmetics,
    view,
    scale
  );
}

/* -------------------------------------------------------------------------- */
/* Convenience helpers                                                        */
/* -------------------------------------------------------------------------- */

export async function renderCharacterToDataUrl(
  options: RenderOptions
): Promise<string> {
  const canvas =
    await renderCharacter(options);

  return canvas.toDataURL(
    "image/png"
  );
}

export async function renderCharacterToImage(
  options: RenderOptions
): Promise<HTMLImageElement> {
  const dataUrl =
    await renderCharacterToDataUrl(
      options
    );

  return loadImage(dataUrl);
}
```
