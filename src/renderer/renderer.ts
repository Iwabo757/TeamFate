// src/renderer/renderer.ts
//
// Team Fate cosmetic renderer.
// Character composition is performed by the Fiereu / PokeMMO Clothes API.
// Local manifest assets are used for the cosmetic list/icons only; they are
// never composited into the character.

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

const DEFAULT_BASE_URL = "/team-fate-renderer";

// Fiereu scenes: 1 = Back, 2 = Front, 3 = Side.
const API_SCENE: Record<RendererView, number> = {
  back: 1,
  front: 2,
  side: 3,
};

const API_BASE = "https://apis.fiereu.de/pokemmoclothes/v1";
const API_VERSION = 2;
const API_GENDER = 1;

// API parameter slot numbers. These are API namespaces, not manifest
// layer_index values.
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

// Exact Fiereu URL order:
// back / mount / eyes / face / held / hair / hat / pants / shoes / top
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

const CHROMA = {
  r: 255,
  g: 20,
  b: 147,
  tolerance: 8,
};

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

let manifestPromise: Promise<RendererManifest> | null = null;
let apiCatalogPromise: Promise<ApiCatalog> | null = null;

function joinUrl(baseUrl: string, path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

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
          if (!existing.includes(id)) existing.push(id);
        }
        if (existing.length) map.set(key, existing);
      };

      for (const item of items) {
        if (item.category !== 6 || !Number.isFinite(item.id)) continue;

        // Prefer vanity/dex ID, but retain the internal item ID as fallback.
        const ids: number[] = [];
        if (Number.isFinite(item.dex) && Number(item.dex) > 0) {
          ids.push(Number(item.dex));
        }
        ids.push(Number(item.id));

        if (item.en_name) {
          addIds(byName, normalizeName(item.en_name), ids);
          addIds(bySlug, slug(item.en_name), ids);
        }

        if (item.key) {
          addIds(byKey, normalizeName(item.key), ids);
          addIds(bySlug, slug(item.key), ids);
        }
      }

      return { byName, byKey, bySlug };
    });
  }

  return apiCatalogPromise;
}

// Known IDs where the current public PokeMMO Hub item mirror is incomplete or
// where we have confirmed both cosmetic/vanity and internal namespaces.
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
  "red christmas stocking": ["red christmas stocking", "red xmas stocking"],
  "green christmas stocking": [
    "green christmas stocking",
    "green xmas stocking",
  ],
  "blue christmas stocking": ["blue christmas stocking", "blue xmas stocking"],
  "yellow christmas stocking": [
    "yellow christmas stocking",
    "yellow xmas stocking",
  ],
  "mermaid hair crown": ["mermaid hair (alt)"],
  scene: ["reverse scene"],
};

async function resolveApiItemIds(
  cosmeticName: string,
  cosmetic: Cosmetic
): Promise<number[]> {
  const explicit = cosmetic.api_id ?? cosmetic.apiId;
  if (Number.isFinite(explicit)) return [Number(explicit)];

  const normalized = normalizeName(cosmeticName);

  const knownIds = KNOWN_FIEREU_IDS[normalized];
  if (knownIds?.length) return [...knownIds];

  if (normalized === "default hair") return [0];
  if (normalized === "brown" || normalized === "brown eyes") return [1438];
  if (normalized === "angry" || normalized === "angry eyes") return [1444];

  const catalog = await loadApiCatalog();
  const candidates = [cosmeticName, ...(NAME_ALIASES[normalized] ?? [])];

  for (const candidate of candidates) {
    const key = normalizeName(candidate);

    const byName = catalog.byName.get(key);
    if (byName?.length) return [...byName];

    const bySlug = catalog.bySlug.get(slug(candidate));
    if (bySlug?.length) return [...bySlug];

    const byKey = catalog.byKey.get(key);
    if (byKey?.length) return [...byKey];
  }

  const target = compact(cosmeticName);
  for (const [key, ids] of catalog.byName) {
    if (compact(key) === target) return [...ids];
  }

  throw new Error(
    `No PokeMMO Clothes API item ID found for "${cosmeticName}".`
  );
}

async function buildApiSlots(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>
): Promise<ApiSlotSelection> {
  const slots: Record<number, number> = {};
  const candidates: Record<number, number[]> = {};

  for (const slot of ALL_API_SLOTS) {
    slots[API_SLOT[slot]] = 0;
    candidates[API_SLOT[slot]] = [0];
  }

  for (const slot of ALL_API_SLOTS) {
    const name = cosmetics[slot];
    if (!name) continue;

    const cosmetic = manifest.cosmetics?.[name];
    if (!cosmetic) {
      throw new Error(`Cosmetic "${name}" was not found in the manifest.`);
    }

    if (cosmetic.slot !== slot) {
      throw new Error(
        `Cosmetic "${name}" belongs to slot "${cosmetic.slot}", not "${slot}".`
      );
    }

    const ids = await resolveApiItemIds(name, cosmetic);
    const uniqueIds = ids.filter(
      (id, index, all) => Number.isFinite(id) && all.indexOf(id) === index
    );

    if (!uniqueIds.length) {
      throw new Error(`No usable API item ID found for "${name}".`);
    }

    slots[API_SLOT[slot]] = uniqueIds[0];
    candidates[API_SLOT[slot]] = uniqueIds;
  }

  return { slots, candidates };
}

function buildCandidateSlotSets(
  selection: ApiSlotSelection
): Record<number, number>[] {
  const slotNumbers = ALL_API_SLOTS.map((slot) => API_SLOT[slot]).filter(
    (slotNumber) => (selection.candidates[slotNumber]?.length ?? 0) > 1
  );

  const results: Record<number, number>[] = [];
  const seen = new Set<string>();

  const add = (slots: Record<number, number>): void => {
    const key = ALL_API_SLOTS.map((slot) => slots[API_SLOT[slot]] ?? 0).join(",");
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ ...slots });
  };

  add(selection.slots);

  for (const slotNumber of slotNumbers) {
    const ids = selection.candidates[slotNumber];
    if (!ids?.[1]) continue;
    add({ ...selection.slots, [slotNumber]: ids[1] });
  }

  if (slotNumbers.length) {
    const allAlternate = { ...selection.slots };
    for (const slotNumber of slotNumbers) {
      const ids = selection.candidates[slotNumber];
      if (ids?.[1]) allAlternate[slotNumber] = ids[1];
    }
    add(allAlternate);
  }

  // Small mixed namespace combinations only. This is a fallback; normal
  // renders should use the first successful complete API URL.
  const maxCombinationSize = Math.min(3, slotNumbers.length);
  for (let size = 2; size <= maxCombinationSize; size += 1) {
    const indexes: number[] = [];

    const visit = (start: number, remaining: number): void => {
      if (remaining === 0) {
        const next = { ...selection.slots };
        for (const index of indexes) {
          const slotNumber = slotNumbers[index];
          const ids = selection.candidates[slotNumber];
          if (ids?.[1]) next[slotNumber] = ids[1];
        }
        add(next);
        return;
      }

      for (let i = start; i <= slotNumbers.length - remaining; i += 1) {
        indexes.push(i);
        visit(i + 1, remaining - 1);
        indexes.pop();
      }
    };

    visit(0, size);
  }

  return results;
}

function buildApiUrl(
  scene: RendererView,
  slots: Record<number, number>
): string {
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

  return `${API_BASE}/${API_SCENE[scene]}/${API_VERSION}/${API_GENDER}/${ordered.join("/")}.png`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function removeChromaKey(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const dr = Math.abs(data[i] - CHROMA.r);
    const dg = Math.abs(data[i + 1] - CHROMA.g);
    const db = Math.abs(data[i + 2] - CHROMA.b);

    if (
      dr <= CHROMA.tolerance &&
      dg <= CHROMA.tolerance &&
      db <= CHROMA.tolerance
    ) {
      data[i + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
}

function selectedSlotNumbers(
  cosmetics: Partial<Record<CosmeticSlot, string>>
): CosmeticSlot[] {
  return ALL_API_SLOTS.filter((slot) => Boolean(cosmetics[slot]));
}

function emptySlots(): Record<number, number> {
  const slots: Record<number, number> = {};
  for (const slot of ALL_API_SLOTS) {
    slots[API_SLOT[slot]] = 0;
  }
  return slots;
}

async function tryUrl(
  scene: RendererView,
  slots: Record<number, number>
): Promise<HTMLImageElement | null> {
  const url = buildApiUrl(scene, slots);

  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

/**
 * If a complete character URL fails, test each selected cosmetic against the
 * known-good base character. Fiereu returns a complete character image, so
 * this is the only reliable way to tell which individual item is unavailable.
 *
 * Working items are then added back one at a time. A broken cosmetic is
 * omitted instead of making the entire character disappear.
 */
async function recoverFromUnavailableCosmetics(
  scene: RendererView,
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>,
  selection: ApiSlotSelection
): Promise<{
  image: HTMLImageElement;
  slots: Record<number, number>;
  unavailable: string[];
}> {
  const baseSlots = emptySlots();
  const baseImage = await tryUrl(scene, baseSlots);

  if (!baseImage) {
    throw new Error(
      `Fiereu base character failed for ${scene}. The API itself is unavailable.`
    );
  }

  const workingSlots = { ...baseSlots };
  const unavailable: string[] = [];

  for (const slot of selectedSlotNumbers(cosmetics)) {
    const name = cosmetics[slot];
    if (!name) continue;

    const apiSlot = API_SLOT[slot];
    const ids = selection.candidates[apiSlot] ?? [];
    let workingId: number | null = null;

    // Test every known namespace candidate for this cosmetic by itself.
    for (const id of ids) {
      if (!Number.isFinite(id) || id === 0) continue;

      const testSlots = {
        ...baseSlots,
        [apiSlot]: id,
      };

      const testImage = await tryUrl(scene, testSlots);
      if (testImage) {
        workingId = id;
        break;
      }
    }

    if (workingId === null) {
      unavailable.push(name);
      console.warn(
        `[Team Fate Renderer] Unavailable cosmetic for ${scene}: ${name}`,
        {
          slot,
          candidates: ids,
        }
      );
      continue;
    }

    // Try adding the working cosmetic to everything already known to work.
    const nextSlots = {
      ...workingSlots,
      [apiSlot]: workingId,
    };

    const combinedImage = await tryUrl(scene, nextSlots);

    if (combinedImage) {
      workingSlots[apiSlot] = workingId;
    } else {
      // The item works by itself but not with the current set. Keep the
      // character renderable and report it rather than hiding everything.
      unavailable.push(name);
      console.warn(
        `[Team Fate Renderer] Cosmetic works alone but failed in combination for ${scene}: ${name}`
      );
    }
  }

  const finalImage = await tryUrl(scene, workingSlots);

  if (!finalImage) {
    // This should only be reached if the API behaves inconsistently between
    // requests. The base image is still a valid final fallback.
    console.warn(
      `[Team Fate Renderer] Final recovered combination failed for ${scene}; using base character.`
    );

    return {
      image: baseImage,
      slots: baseSlots,
      unavailable: selectedSlotNumbers(cosmetics).map(
        (slot) => cosmetics[slot]!
      ),
    };
  }

  // Keep the manifest reference in this recovery function explicit so future
  // changes can use cosmetic metadata without changing its API contract.
  void manifest;

  return {
    image: finalImage,
    slots: workingSlots,
    unavailable,
  };
}

async function renderApiView(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>,
  scene: RendererView,
  scale: number
): Promise<HTMLCanvasElement> {
  const selection = await buildApiSlots(manifest, cosmetics);
  const candidates = buildCandidateSlotSets(selection);

  let image: HTMLImageElement | null = null;

  // First: try the complete requested character normally.
  for (const slots of candidates) {
    image = await tryUrl(scene, slots);
    if (image) break;
  }

  // Second: if one item is unavailable, recover the rest of the character.
  if (!image) {
    const recovered = await recoverFromUnavailableCosmetics(
      scene,
      manifest,
      cosmetics,
      selection
    );

    image = recovered.image;

    if (recovered.unavailable.length) {
      console.warn(
        `[Team Fate Renderer] ${scene} rendered without unavailable cosmetics:`,
        recovered.unavailable
      );
    }
  }

  if (!image) {
    throw new Error(`Failed to render Fiereu character for ${scene}.`);
  }

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error(`Fiereu returned an invalid image for ${scene}.`);
  }

  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create renderer canvas.");

  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, width, height);
  removeChromaKey(context, width, height);

  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  if (safeScale === 1) return canvas;

  const output = makeCanvas(
    Math.round(width * safeScale),
    Math.round(height * safeScale)
  );

  const outputContext = output.getContext("2d");
  if (!outputContext) throw new Error("Unable to create scaled canvas.");

  outputContext.imageSmoothingEnabled = false;
  outputContext.drawImage(canvas, 0, 0, output.width, output.height);

  return output;
}

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

  // Team Fate base frame mapping only:
  // 0 = Front, 1 = Back, 2 = Side.
  // These frame numbers are never sent to Fiereu as cosmetic IDs.
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

export async function renderCharacterToDataUrl(
  options: RenderOptions
): Promise<string> {
  const canvas = await renderCharacter(options);
  return canvas.toDataURL("image/png");
}

export async function renderCharacterToImage(
  options: RenderOptions
): Promise<HTMLImageElement> {
  const dataUrl = await renderCharacterToDataUrl(options);
  return loadImage(dataUrl);
}
