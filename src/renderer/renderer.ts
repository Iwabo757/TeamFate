// src/renderer/renderer.ts
//
// Team Fate cosmetic renderer
// Uses the Fiereu / PokeMMO Clothes API for character composition.
//
// IMPORTANT:
// - Do NOT locally compose cosmetic layers.
// - Do NOT use manifest layer_index as an API ID.
// - Do NOT use local cosmetic frame numbers as API IDs.
// - Team Fate skin number is NOT part of the Fiereu API URL.

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
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_BASE_URL = "/team-fate-renderer";

// Fiereu scene IDs:
// 1 = Back
// 2 = Front
// 3 = Side
const API_SCENE: Record<RendererView, number> = {
  back: 1,
  front: 2,
  side: 3,
};

const API_BASE = "https://apis.fiereu.de/pokemmoclothes/v1";

const API_VERSION = 2;
const API_GENDER = 1;

// Fiereu URL parameter slot numbers.
//
// URL order:
// back / mount / eyes / face / held / hair / hat / pants / shoes / top
//
// These are API slots, NOT Team Fate manifest layer indexes.
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

const ALL_API_SLOTS: CosmeticSlot[] = [
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

const ITEM_DATA_URL =
  "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-hub/master/src/data/pokemmo/item.json";

// Magenta background used by the Fiereu renderer.
const CHROMA = {
  r: 255,
  g: 20,
  b: 147,
  tolerance: 8,
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ApiItem = {
  id: number;
  dex?: number;
  en_name?: string;
  key?: string;
  category?: number;
};

type ApiCatalog = {
  byName: Map<string, number[]>;
  byKey: Map<string, number[]>;
  bySlug: Map<string, number[]>;
};

type ApiSlotSelection = {
  slots: Record<number, number>;
  candidates: Record<number, number[]>;
};

/* -------------------------------------------------------------------------- */
/* Cached data                                                                */
/* -------------------------------------------------------------------------- */

let manifestPromise: Promise<RendererManifest> | null = null;
let apiCatalogPromise: Promise<ApiCatalog> | null = null;

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
/* -------------------------------------------------------------------------- */

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
/* Name normalization                                                         */
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

      const byName = new Map<string, number[]>();
      const byKey = new Map<string, number[]>();
      const bySlug = new Map<string, number[]>();

      const addIds = (
        map: Map<string, number[]>,
        key: string | undefined,
        ids: number[]
      ): void => {
        if (!key) return;

        const existing = map.get(key) ?? [];

        for (const id of ids) {
          if (!existing.includes(id)) {
            existing.push(id);
          }
        }

        if (existing.length) {
          map.set(key, existing);
        }
      };

      for (const item of items) {
        if (item.category !== 6 || !Number.isFinite(item.id)) {
          continue;
        }

        /*
         * PokeMMO has two relevant namespaces:
         *
         * item.id  = internal item ID
         * item.dex = cosmetic / vanity ID
         *
         * Try dex first and internal ID second.
         */
        const ids: number[] = [];

        if (Number.isFinite(item.dex) && Number(item.dex) > 0) {
          ids.push(Number(item.dex));
        }

        ids.push(Number(item.id));

        if (item.en_name) {
          addIds(
            byName,
            normalizeName(item.en_name),
            ids
          );

          addIds(
            bySlug,
            slug(item.en_name),
            ids
          );
        }

        if (item.key) {
          addIds(
            byKey,
            normalizeName(item.key),
            ids
          );

          addIds(
            bySlug,
            slug(item.key),
            ids
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
/* Known cosmetic IDs                                                         */
/* -------------------------------------------------------------------------- */

/*
 * These are known Fiereu / PokeMMO cosmetic IDs.
 *
 * Some older cosmetics exist in both:
 *   vanity/dex namespace
 *   internal PokeMMO item namespace
 *
 * We keep both so the renderer can try either when necessary.
 */
const KNOWN_FIEREU_IDS: Record<string, number[]> = {
  afro: [2513, 1185],

  sideswept: [2517, 1183],

  "reverse scene": [2535, 1181],
  scene: [2535, 1181],

  "golden cuffed ponytail": [2559, 2235],

  "mermaid hair": [2560, 2257],

  "elven ponytail": [2562, 2292],

  "elegant ponytail": [2563, 2317],

  "origin hairstyle": [2565, 2318],

  "colorful unicorn hair": [2566, 2319],

  "idol hairstyle": [2558],

  "mermaid hair alt": [2561],
};

/* -------------------------------------------------------------------------- */
/* Name aliases                                                               */
/* -------------------------------------------------------------------------- */

const NAME_ALIASES: Record<string, string[]> = {
  "default hair": ["default hair"],

  brown: ["brown eyes"],
  "brown eyes": ["brown eyes"],

  angry: ["angry eyes"],
  "angry eyes": ["angry eyes"],

  "rock star": ["rockstar", "rock star"],

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

  // Older Team Fate manifest name.
  "mermaid hair crown": [
    "mermaid hair (alt)",
  ],

  scene: [
    "reverse scene",
  ],
};

/* -------------------------------------------------------------------------- */
/* Resolve cosmetic -> API IDs                                                */
/* -------------------------------------------------------------------------- */

async function resolveApiItemIds(
  cosmeticName: string,
  cosmetic: Cosmetic
): Promise<number[]> {
  // Explicit API ID always wins.
  const explicit = cosmetic.api_id ?? cosmetic.apiId;

  if (Number.isFinite(explicit)) {
    return [Number(explicit)];
  }

  const normalized = normalizeName(cosmeticName);

  // Known mappings.
  const knownIds = KNOWN_FIEREU_IDS[normalized];

  if (knownIds?.length) {
    return [...knownIds];
  }

  // Built-in cosmetics.
  if (normalized === "default hair") {
    return [0];
  }

  if (
    normalized === "brown" ||
    normalized === "brown eyes"
  ) {
    return [1438];
  }

  if (
    normalized === "angry" ||
    normalized === "angry eyes"
  ) {
    return [1444];
  }

  const catalog = await loadApiCatalog();

  const candidates = [
    cosmeticName,
    ...(NAME_ALIASES[normalized] ?? []),
  ];

  for (const candidate of candidates) {
    const key = normalizeName(candidate);

    const byName = catalog.byName.get(key);

    if (byName?.length) {
      return [...byName];
    }

    const bySlug = catalog.bySlug.get(
      slug(candidate)
    );

    if (bySlug?.length) {
      return [...bySlug];
    }

    const byKey = catalog.byKey.get(key);

    if (byKey?.length) {
      return [...byKey];
    }
  }

  // Last-resort compact-name comparison.
  const target = compact(cosmeticName);

  for (const [key, ids] of catalog.byName) {
    if (compact(key) === target) {
      return [...ids];
    }
  }

  throw new Error(
    `No PokeMMO Clothes API item ID found for "${cosmeticName}". ` +
      `The manifest entry exists, but its name is not present in the PokeMMO cosmetic item catalog.`
  );
}

/* -------------------------------------------------------------------------- */
/* Build API slots                                                            */
/* -------------------------------------------------------------------------- */

async function buildApiSlots(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>
): Promise<ApiSlotSelection> {
  const slots: Record<number, number> = {};
  const candidates: Record<number, number[]> = {};

  // Every API slot defaults to 0.
  for (const slot of ALL_API_SLOTS) {
    const apiSlot = API_SLOT[slot];

    slots[apiSlot] = 0;
    candidates[apiSlot] = [0];
  }

  // Resolve selected cosmetics.
  for (const slot of ALL_API_SLOTS) {
    const name = cosmetics[slot];

    if (!name) {
      continue;
    }

    const cosmetic = manifest.cosmetics?.[name];

    if (!cosmetic) {
      throw new Error(
        `Cosmetic "${name}" was not found in the manifest.`
      );
    }

    if (cosmetic.slot !== slot) {
      throw new Error(
        `Cosmetic "${name}" belongs to slot "${cosmetic.slot}", not "${slot}".`
      );
    }

    const ids = await resolveApiItemIds(
      name,
      cosmetic
    );

    const uniqueIds = ids.filter(
      (id, index, all) =>
        Number.isFinite(id) &&
        all.indexOf(id) === index
    );

    if (!uniqueIds.length) {
      throw new Error(
        `No usable API item ID found for "${name}".`
      );
    }

    const apiSlot = API_SLOT[slot];

    slots[apiSlot] = uniqueIds[0];
    candidates[apiSlot] = uniqueIds;
  }

  return {
    slots,
    candidates,
  };
}

/* -------------------------------------------------------------------------- */
/* Build alternate API combinations                                            */
/* -------------------------------------------------------------------------- */

function buildCandidateSlotSets(
  selection: ApiSlotSelection
): Record<number, number>[] {
  const slotNumbers = ALL_API_SLOTS
    .map((slot) => API_SLOT[slot])
    .filter(
      (slotNumber) =>
        (selection.candidates[slotNumber]?.length ?? 0) > 1
    );

  const results: Record<number, number>[] = [];
  const seen = new Set<string>();

  const add = (
    slots: Record<number, number>
  ): void => {
    const key = ALL_API_SLOTS
      .map(
        (slot) =>
          slots[API_SLOT[slot]] ?? 0
      )
      .join(",");

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    results.push({
      ...slots,
    });
  };

  // First try the primary IDs.
  add(selection.slots);

  // Then change one slot at a time.
  for (const slotNumber of slotNumbers) {
    const ids =
      selection.candidates[slotNumber];

    if (!ids?.[1]) {
      continue;
    }

    const next = {
      ...selection.slots,
      [slotNumber]: ids[1],
    };

    add(next);
  }

  // Try all alternate IDs together.
  if (slotNumbers.length) {
    const allAlternate = {
      ...selection.slots,
    };

    for (const slotNumber of slotNumbers) {
      const ids =
        selection.candidates[slotNumber];

      if (ids?.[1]) {
        allAlternate[slotNumber] = ids[1];
      }
    }

    add(allAlternate);
  }

  /*
   * Try mixed combinations of up to 3 alternate slots.
   *
   * This handles cases where some cosmetics use the vanity namespace
   * while others use the internal item namespace.
   */
  const maxCombinationSize = Math.min(
    3,
    slotNumbers.length
  );

  for (
    let size = 2;
    size <= maxCombinationSize;
    size += 1
  ) {
    const indexes: number[] = [];

    const visit = (
      start: number,
      remaining: number
    ): void => {
      if (remaining === 0) {
        const next = {
          ...selection.slots,
        };

        for (const index of indexes) {
          const slotNumber =
            slotNumbers[index];

          const ids =
            selection.candidates[slotNumber];

          if (ids?.[1]) {
            next[slotNumber] =
              ids[1];
          }
        }

        add(next);
        return;
      }

      for (
        let i = start;
        i <= slotNumbers.length - remaining;
        i += 1
      ) {
        indexes.push(i);

        visit(
          i + 1,
          remaining - 1
        );

        indexes.pop();
      }
    };

    visit(0, size);
  }

  return results;
}

/* -------------------------------------------------------------------------- */
/* Build Fiereu URL                                                           */
/* -------------------------------------------------------------------------- */

function buildApiUrl(
  scene: RendererView,
  slots: Record<number, number>
): string {
  /*
   * Exact URL order:
   *
   * scene
   * version
   * gender
   * back
   * mount
   * eyes
   * face
   * held
   * hair
   * hat
   * pants
   * shoes
   * top
   */

  const ordered = [
    slots[6],  // back
    slots[12], // mount
    slots[4],  // eyes
    slots[5],  // face
    slots[8],  // held
    slots[3],  // hair
    slots[2],  // hat
    slots[10], // pants
    slots[9],  // shoes
    slots[7],  // top
  ];

  return (
    `${API_BASE}/` +
    `${API_SCENE[scene]}/` +
    `${API_VERSION}/` +
    `${API_GENDER}/` +
    `${ordered.join("/")}.png`
  );
}

/* -------------------------------------------------------------------------- */
/* Image loading                                                              */
/* -------------------------------------------------------------------------- */

function loadImage(
  url: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      // Required so we can safely draw the remote API image to canvas.
      image.crossOrigin = "anonymous";

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(
          new Error(
            `Failed to load image: ${url}`
          )
        );
      };

      image.src = url;
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Canvas helpers                                                             */
/* -------------------------------------------------------------------------- */

function makeCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

function removeChromaKey(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData =
    context.getImageData(
      0,
      0,
      width,
      height
    );

  const data = imageData.data;

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    const dr =
      Math.abs(
        data[i] - CHROMA.r
      );

    const dg =
      Math.abs(
        data[i + 1] - CHROMA.g
      );

    const db =
      Math.abs(
        data[i + 2] - CHROMA.b
      );

    if (
      dr <= CHROMA.tolerance &&
      dg <= CHROMA.tolerance &&
      db <= CHROMA.tolerance
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
/* Render API view                                                            */
/* -------------------------------------------------------------------------- */

async function renderApiView(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>,
  scene: RendererView,
  scale: number
): Promise<HTMLCanvasElement> {
  const selection =
    await buildApiSlots(
      manifest,
      cosmetics
    );

  const candidates =
    buildCandidateSlotSets(
      selection
    );

  let image:
    | HTMLImageElement
    | null = null;

  let lastUrl = "";

  const attemptedUrls: string[] = [];

  /*
   * Try each complete API combination.
   *
   * We intentionally retry the complete URL instead of only retrying hair,
   * because any cosmetic may exist in a different ID namespace.
   */
  for (
    const slots of candidates
  ) {
    const url =
      buildApiUrl(
        scene,
        slots
      );

    lastUrl = url;
    attemptedUrls.push(url);

    try {
      image =
        await loadImage(url);

      break;
    } catch {
      // Continue to the next candidate.
    }
  }

  if (!image) {
    /*
     * IMPORTANT DEBUG OUTPUT
     *
     * This gives us the COMPLETE URLs instead of the UI truncating the
     * failed URL in the preview.
     */
    console.error(
      "========================================"
    );

    console.error(
      "FIEREU API FAILED TO LOAD CHARACTER"
    );

    console.error(
      "========================================"
    );

    console.error(
      "Scene:",
      scene
    );

    console.error(
      "Selected cosmetics:",
      cosmetics
    );

    console.error(
      "Resolved API candidates:",
      selection.candidates
    );

    console.error(
      "All attempted URLs:"
    );

    for (
      const url of attemptedUrls
    ) {
      console.error(
        url
      );
    }

    console.error(
      "Last failed URL:",
      lastUrl
    );

    console.error(
      "========================================"
    );

    throw new Error(
      `Failed to load Fiereu image.\n\n` +
      attemptedUrls.join("\n")
    );
  }

  const width =
    image.naturalWidth ||
    image.width;

  const height =
    image.naturalHeight ||
    image.height;

  if (!width || !height) {
    throw new Error(
      `API returned an invalid image for ${scene}.`
    );
  }

  const canvas =
    makeCanvas(
      width,
      height
    );

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    throw new Error(
      "Unable to create renderer canvas."
    );
  }

  context.imageSmoothingEnabled =
    false;

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

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

  const output =
    makeCanvas(
      Math.round(
        width * safeScale
      ),
      Math.round(
        height * safeScale
      )
    );

  const outputContext =
    output.getContext(
      "2d"
    );

  if (!outputContext) {
    throw new Error(
      "Unable to create scaled canvas."
    );
  }

  outputContext.imageSmoothingEnabled =
    false;

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
   * Team Fate base-frame convention:
   *
   * 0 = Front
   * 1 = Back
   * 2 = Side
   *
   * The frame number is ONLY used to select the API scene.
   * It is never sent to Fiereu as a cosmetic ID.
   */
  const scene: RendererView =
    frame === 0
      ? "front"
      : frame === 1
        ? "back"
        : frame === 2
          ? "side"
          : "front";

  return renderApiView(
    manifest,
    cosmetics,
    scene,
    scale
  );
}

/* -------------------------------------------------------------------------- */
/* Data URL                                                                   */
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
/* HTML Image                                                                 */
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