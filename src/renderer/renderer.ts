// src/renderer/renderer.ts
//
// Team Fate cosmetic renderer backed by the same Fiereu/PokeMMO Clothes API
// used by PokeMMO Hub. The API is responsible for composing every cosmetic
// and choosing the correct artwork for Front / Back / Side.
//
// IMPORTANT:
// - Do not use local cosmetic frame numbers to decide direction.
// - Do not use the local manifest layer_index as an API item id.
// - The Team Fate skin number is NOT part of the Fiereu API URL.

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

// Fiereu / PokeMMO Clothes scene ids, matching PokeMMO Hub:
// 1 = Back, 2 = Front, 3 = Side.
const API_SCENE: Record<RendererView, number> = {
  back: 1,
  front: 2,
  side: 3,
};

const API_BASE = "https://apis.fiereu.de/pokemmoclothes/v1";
const API_VERSION = 2;
const API_GENDER = 1;

// Fiereu URL parameter slots. These are NOT the Team Fate local layer indexes.
// URL order is: back / bicycle / eyes / face / gloves / hair / hat / legs /
// shoes / top.
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

// PokeMMO Hub's item catalog gives us the actual PokeMMO item ids used by the
// Clothes API. We deliberately do not treat the local manifest layer_index as
// an API id: those values are different namespaces.
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

function addLookup(
  map: Map<string, number>,
  key: string | undefined,
  id: number
): void {
  if (!key) return;
  if (!map.has(key)) map.set(key, id);
}

async function loadApiCatalog(): Promise<ApiCatalog> {
  if (!apiCatalogPromise) {
    apiCatalogPromise = fetch(ITEM_DATA_URL, { cache: "force-cache" }).then(
      async (response) => {
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
          if (item.category !== 6 || !Number.isFinite(item.id)) continue;

          if (item.en_name) {
            addLookup(byName, normalizeName(item.en_name), item.id);
            addLookup(bySlug, slug(item.en_name), item.id);
          }

          if (item.key) {
            addLookup(byKey, normalizeName(item.key), item.id);
            addLookup(bySlug, slug(item.key), item.id);
          }
        }

        return { byName, byKey, bySlug };
      }
    );
  }

  return apiCatalogPromise;
}

// Names present in the Team Fate pak that intentionally differ from the
// English cosmetic name used by PokeMMO's item catalog.
// A small set of cosmetics that are present in the current PokeMMO game
// catalog but are missing from the older PokeMMO Hub item.json mirror.
// These are Fiereu/PokeMMO cosmetic item IDs, not Team Fate layer indexes.
const KNOWN_FIEREU_IDS: Record<string, number> = {
  "elegant ponytail": 2563,
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
};

async function resolveApiItemId(
  cosmeticName: string,
  cosmetic: Cosmetic
): Promise<number> {
  const explicit = cosmetic.api_id ?? cosmetic.apiId;
  if (Number.isFinite(explicit)) return Number(explicit);

  // These are the API's empty/default values, not equipped cosmetic items.
  const normalized = normalizeName(cosmeticName);
  const knownId = KNOWN_FIEREU_IDS[normalized];
  if (knownId !== undefined) return knownId;

  if (normalized === "default hair") return 0;
  if (normalized === "brown" || normalized === "brown eyes") return 1438;
  if (normalized === "angry" || normalized === "angry eyes") return 1444;

  const catalog = await loadApiCatalog();
  const candidates = [
    cosmeticName,
    ...(NAME_ALIASES[normalized] ?? []),
  ];

  for (const candidate of candidates) {
    const key = normalizeName(candidate);
    const byName = catalog.byName.get(key);
    if (byName !== undefined) return byName;

    const bySlug = catalog.bySlug.get(slug(candidate));
    if (bySlug !== undefined) return bySlug;

    const byKey = catalog.byKey.get(key);
    if (byKey !== undefined) return byKey;
  }

  // Last-resort compact comparison handles things like Rock Star/Rockstar.
  const target = compact(cosmeticName);
  for (const [key, id] of catalog.byName) {
    if (compact(key) === target) return id;
  }

  throw new Error(
    `No PokeMMO Clothes API item ID found for "${cosmeticName}". ` +
      `The manifest entry exists, but its name is not present in the PokeMMO cosmetic item catalog.`
  );
}

async function buildApiSlots(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>
): Promise<Record<number, number>> {
  // Start with every supported slot empty. This prevents PokeMMO Hub defaults
  // from leaking into Team Fate when the builder starts with no clothes.
  const selected: Record<number, number> = {};
  for (const slot of ALL_API_SLOTS) {
    selected[API_SLOT[slot]] = 0;
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

    selected[API_SLOT[slot]] = await resolveApiItemId(name, cosmetic);
  }

  return selected;
}

function buildApiUrl(
  scene: RendererView,
  slots: Record<number, number>
): string {
  // Exact PokeMMO Hub / Fiereu Clothes API layout:
  // scene / 2 / 1 / back / bicycle / eyes / face / gloves / hair / hat /
  // legs / shoes / top
  const ordered = [
    slots[6],
    slots[12],
    slots[4],
    slots[5],
    slots[8],
    slots[3],
    slots[2],
    slots[10],
    slots[9],
    slots[7],
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

async function renderApiView(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>,
  scene: RendererView,
  scale: number
): Promise<HTMLCanvasElement> {
  const slots = await buildApiSlots(manifest, cosmetics);
  const url = buildApiUrl(scene, slots);
  const image = await loadImage(url);

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) {
    throw new Error(`API returned an invalid image for ${scene}.`);
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

  // The Builder's base frames are used only as a view selector:
  // 0 = Front, 1 = Back, 2 = Side.
  // Cosmetic frame selection is entirely delegated to Fiereu.
  const scene: RendererView =
    frame === 0
      ? "front"
      : frame === 1
        ? "back"
        : frame === 2
          ? "side"
          : "front";

  return renderApiView(manifest, cosmetics, scene, scale);
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
