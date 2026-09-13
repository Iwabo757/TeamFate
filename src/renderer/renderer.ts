// src/renderer/renderer.ts
//
// Team Fate cosmetic renderer backed by the PokeMMO Clothes API.
// The API owns cosmetic composition and direction selection. This file does
// NOT inspect cosmetic frames or try to guess Front/Side/Back.

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

// PokeMMO Hub's scene IDs:
// 1 = Back, 2 = Front, 3 = Side.
const API_SCENE: Record<RendererView, number> = {
  back: 1,
  front: 2,
  side: 3,
};

const API_BASE = "https://apis.fiereu.de/pokemmoclothes/v1";
const API_VERSION = 2;
const API_GENDER = 1;

// The PokeMMO API uses the same slot numbering as the local manifest:
// 2 hat, 3 hair, 4 eyes, 5 face, 6 back, 7 top, 8 gloves/held,
// 9 shoes, 10 legs/pants, 11 rod/tool, 12 bicycle/mount.
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

let manifestPromise: Promise<RendererManifest> | null = null;
let itemLookupPromise: Promise<Map<string, number>> | null = null;

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

async function loadItemLookup(): Promise<Map<string, number>> {
  if (!itemLookupPromise) {
    itemLookupPromise = fetch(ITEM_DATA_URL, { cache: "force-cache" }).then(
      async (response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load PokeMMO cosmetic catalog: ${response.status}`
          );
        }

        const items = (await response.json()) as ApiItem[];
        const lookup = new Map<string, number>();

        for (const item of items) {
          if (item.category !== 6 || !item.en_name) continue;
          const key = normalizeName(item.en_name);
          if (!lookup.has(key)) lookup.set(key, item.id);
        }

        return lookup;
      }
    );
  }

  return itemLookupPromise;
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*\((?:m|f)\)\s*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function resolveApiItemId(
  cosmeticName: string,
  cosmetic: Cosmetic
): Promise<number> {
  const explicit = cosmetic.api_id ?? cosmetic.apiId;
  if (Number.isFinite(explicit)) return Number(explicit);

  const normalized = normalizeName(cosmeticName);

  // Team Fate intentionally uses friendly names for a few base cosmetics.
  // These are API "empty/default" values rather than actual equipped items.
  const aliases: Record<string, number> = {
    "default hair": 0,
    brown: 1438,
    "brown eyes": 1438,
    angry: 1444,
    "angry eyes": 1444,
  };
  if (aliases[normalized] !== undefined) return aliases[normalized];

  const lookup = await loadItemLookup();

  const direct = lookup.get(normalized);
  if (direct !== undefined) return direct;

  // Some extracted names are shorthand versions of the game's male/female
  // item names. The lookup above strips the gender suffix, so this fallback
  // is only reached for naming differences, not direction detection.
  const compact = normalized.replace(/\s+/g, "");
  for (const [key, id] of lookup) {
    if (key.replace(/\s+/g, "") === compact) return id;
  }

  throw new Error(
    `No PokeMMO API item ID found for cosmetic "${cosmeticName}".`
  );
}

async function buildApiSlots(
  manifest: RendererManifest,
  cosmetics: Partial<Record<CosmeticSlot, string>>
): Promise<Record<number, number>> {
  // Zero explicitly clears the Hub's own default outfit. This is important:
  // the Team Fate builder intentionally starts with no default clothes.
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

function buildApiUrl(scene: RendererView, slots: Record<number, number>): string {
  // This must match PokeMMO Hub exactly. The API path is: scene / 2 / 1 /
  // back / bicycle / eyes / face / gloves / hair / hat / legs / shoes / top.
  // There is NO Team Fate skin number in this API path.
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

function drawFullSize(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number
): void {
  context.drawImage(image, 0, 0, width, height);
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

    if (dr <= CHROMA.tolerance && dg <= CHROMA.tolerance && db <= CHROMA.tolerance) {
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
  if (!width || !height) throw new Error(`API returned an invalid image for ${scene}.`);

  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create renderer canvas.");
  context.imageSmoothingEnabled = false;
  drawFullSize(context, image, width, height);
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

export async function renderCharacter(options: RenderOptions): Promise<HTMLCanvasElement> {
  const {
    manifest,
    frame = 0,
    cosmetics = {},
    tints: _tints = {},
    scale = 1,
  } = options;

  // The Builder passes the actual local base frame IDs. We only need those
  // IDs to select the API scene; cosmetic direction is never inferred.
  const scene: RendererView =
    frame === 0 ? "front" : frame === 1 ? "back" : frame === 2 ? "side" : "front";

  return renderApiView(manifest, cosmetics, scene, scale);
}

export async function renderCharacterToDataUrl(options: RenderOptions): Promise<string> {
  const canvas = await renderCharacter(options);
  return canvas.toDataURL("image/png");
}

export async function renderCharacterToImage(options: RenderOptions): Promise<HTMLImageElement> {
  const dataUrl = await renderCharacterToDataUrl(options);
  return loadImage(dataUrl);
}
