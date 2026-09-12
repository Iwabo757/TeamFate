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
  name?: string;
  slot: CosmeticSlot;
  layer: string;
  icon: string;
  layer_index: number;
  icon_index: number;
  slot_code: number;
  frames?: string[];
};

export type RendererManifest = {
  format_version: number;
  source_pak_sha256?: string;
  base: Record<
    string,
    {
      frames: string[];
      previews: string[];
    }
  >;
  slot_codes?: Record<string, string>;
  cosmetics: Record<string, Cosmetic>;
};

type RenderOptions = {
  manifest: RendererManifest;
  baseUrl?: string;
  skin?: number;
  frame?: number;
  cosmetics?: Partial<Record<CosmeticSlot, string>>;
  tints?: Partial<Record<CosmeticSlot, string>>;
  scale?: number;
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export const LAYER_ORDER: CosmeticSlot[] = [
  "back",
  "pants",
  "shoes",
  "top",
  "eyes",
  "face",
  "hair",
  "held",
  "hat",
  "tool",
  "mount",
];

const COLORABLE_SLOTS = new Set<CosmeticSlot>([
  "hair",
  "top",
  "pants",
  "shoes",
  "back",
  "hat",
]);

function hexToRgb(hex: string) {
  let value = hex.replace("#", "").trim();
  if (value.length === 3) {
    value = value.split("").map((c) => c + c).join("");
  }
  if (value.length !== 6) return null;
  const n = Number.parseInt(value, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

  imageCache.set(src, promise);
  try {
    return await promise;
  } catch (error) {
    imageCache.delete(src);
    throw error;
  }
}

export async function loadRendererManifest(
  url = "/team-fate-renderer/manifest.json"
): Promise<RendererManifest> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Renderer manifest returned ${response.status}`);
  }
  return response.json() as Promise<RendererManifest>;
}

function tintImage(image: HTMLImageElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable while tinting.");

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0);

  const rgb = hexToRgb(color);
  if (!rgb) return canvas;

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    // Keep the original dark outline pixels.
    if (Math.max(r, g, b) <= 45) continue;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const brightness = Math.max(0.18, luminance / 255);

    data[i] = Math.min(255, Math.round(rgb.r * brightness));
    data[i + 1] = Math.min(255, Math.round(rgb.g * brightness));
    data[i + 2] = Math.min(255, Math.round(rgb.b * brightness));
  }

  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

function draw(ctx: CanvasRenderingContext2D, image: CanvasImageSource, scale: number) {
  ctx.drawImage(image, 0, 0, 57 * scale, 56 * scale);
}

/**
 * Render one of the five directional cosmetic frames.
 *
 * Base/cosmetic frame convention from the extracted PAK:
 *   0 = front
 *   1 = back
 *   2 = side
 *   3 = opposite side
 *   4 = extra/action pose
 *
 * The builder only uses 0, 1 and 2 for the static preview.
 */
export async function renderCharacter(
  opts: RenderOptions
): Promise<HTMLCanvasElement> {
  const {
    manifest,
    baseUrl = "",
    skin = 1,
    frame = 0,
    cosmetics = {},
    tints = {},
    scale = 1,
  } = opts;

  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const skinData = manifest.base[`skin_${skin}`];

  if (!skinData) {
    throw new Error(`Invalid skin: ${skin}`);
  }

  const basePath = skinData.frames[frame];
  if (!basePath) {
    throw new Error(`Invalid base frame: ${frame}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 57 * scale;
  canvas.height = 56 * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable.");
  ctx.imageSmoothingEnabled = false;

  const base = await loadImage(`${cleanBaseUrl}/${basePath}`);
  draw(ctx, base, scale);

  for (const slot of LAYER_ORDER) {
// Eyes and face are front/side-only layers.
// They must not be rendered from the back.
if (frame === 1 && (slot === "eyes" || slot === "face")) {
  continue;
}

    const name = cosmetics[slot];
    if (!name) continue;

    const cosmetic = manifest.cosmetics[name];
    if (!cosmetic || cosmetic.slot !== slot) continue;

    // Each cosmetic has five directional/action layer frames in the PAK.
    // Fall back to the original single layer if an older manifest is used.
const cosmeticFrame =
  frame === 0
    ? 0       // Front
    : frame === 15
      ? 2     // Side
      : frame === 30
        ? 1   // Back
        : 0;

const cosmeticPath =
  cosmetic.frames?.[cosmeticFrame] ?? cosmetic.layer;

    if (!cosmeticPath) continue;

    const layer = await loadImage(
      `${cleanBaseUrl}/${cosmeticPath}`
    );

    const tint = tints[slot];

    if (tint && COLORABLE_SLOTS.has(slot)) {
      draw(ctx, tintImage(layer, tint), scale);
    } else {
      draw(ctx, layer, scale);
    }
  }

  return canvas;
}

export async function renderCharacterToDataUrl(
  opts: RenderOptions
): Promise<string> {
  const canvas = await renderCharacter(opts);
  return canvas.toDataURL("image/png");
}
