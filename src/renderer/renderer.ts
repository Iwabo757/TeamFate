export type CosmeticSlot =
  | "hat"
  | "hair"
  | "eyes"
  | "face"
  | "back"
  | "top"
  | "held"
  | "shoes"
  | "pants"
  | "tool"
  | "mount";

export type Cosmetic = {
  icon: string;
  layer: string;
  icon_index: number;
  layer_index: number;
  slot_code: number;
  slot: CosmeticSlot;
  name?: string;
};

export type RendererManifest = {
  format_version: number;
  base: Record<string, { frames: string[]; previews: string[] }>;
  slot_codes?: Record<string, string>;
  cosmetics: Record<string, Cosmetic>;
};

export type CosmeticTints = Partial<Record<CosmeticSlot, string>>;

const ASSET_ROOT = "/team-fate-renderer";
const WIDTH = 57;
const HEIGHT = 56;

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

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export async function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
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
  url = `${ASSET_ROOT}/manifest.json`
): Promise<RendererManifest> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Renderer manifest returned ${response.status}`);
  }
  return (await response.json()) as RendererManifest;
}

function cleanPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function assetUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${cleanPath(path)}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

async function tintGrayscaleLayer(
  image: HTMLImageElement,
  color: string
): Promise<HTMLCanvasElement> {
  const rgb = hexToRgb(color);
  if (!rgb) {
    const fallback = document.createElement("canvas");
    fallback.width = WIDTH;
    fallback.height = HEIGHT;
    const ctx = fallback.getContext("2d");
    if (ctx) ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
    return fallback;
  }

  const source = document.createElement("canvas");
  source.width = WIDTH;
  source.height = HEIGHT;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) return source;

  sourceCtx.clearRect(0, 0, WIDTH, HEIGHT);
  sourceCtx.drawImage(image, 0, 0, WIDTH, HEIGHT);

  const pixels = sourceCtx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = pixels.data;
  const [tr, tg, tb] = rgb;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    // Only recolor grayscale pixels. Colored/graphic cosmetics keep their
    // original artwork instead of being incorrectly tinted.
    const grayscale =
      Math.abs(r - g) <= 2 &&
      Math.abs(g - b) <= 2 &&
      Math.abs(r - b) <= 2;

    if (!grayscale) continue;

    if (r === 0 && g === 0 && b === 0) continue;

    const luminance = r / 255;

    data[i] = Math.round(tr * luminance);
    data[i + 1] = Math.round(tg * luminance);
    data[i + 2] = Math.round(tb * luminance);
  }

  sourceCtx.putImageData(pixels, 0, 0);
  return source;
}

async function loadCosmeticLayer(
  cosmetic: Cosmetic,
  baseUrl: string,
  tint?: string
): Promise<HTMLImageElement | HTMLCanvasElement | null> {
  try {
    const image = await loadImage(assetUrl(baseUrl, cosmetic.layer));

    if (tint) {
      return await tintGrayscaleLayer(image, tint);
    }

    return image;
  } catch (error) {
    console.warn(
      `[Local Renderer] Could not load ${cosmetic.name ?? "cosmetic"}`,
      cosmetic.layer,
      error
    );
    return null;
  }
}

export async function renderCharacter(opts: {
  manifest: RendererManifest;
  baseUrl?: string;
  skin?: number;
  frame?: number;
  cosmetics?: Partial<Record<CosmeticSlot, string>>;
  tints?: CosmeticTints;
  scale?: number;
}): Promise<HTMLCanvasElement> {
  const {
    manifest,
    baseUrl = ASSET_ROOT,
    skin = 1,
    frame = 0,
    cosmetics = {},
    tints = {},
    scale = 6,
  } = opts;

  const skinData = manifest.base[`skin_${skin}`];
  if (!skinData) throw new Error(`Invalid skin: ${skin}`);
  if (!skinData.frames[frame]) {
    throw new Error(`Invalid frame ${frame} for skin ${skin}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.imageSmoothingEnabled = false;

  const base = await loadImage(
    assetUrl(baseUrl, skinData.frames[frame])
  );

  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

  for (const slot of LAYER_ORDER) {
    const name = cosmetics[slot];
    if (!name) continue;

    const cosmetic = manifest.cosmetics[name];
    if (!cosmetic || cosmetic.slot !== slot) continue;

    const layer = await loadCosmeticLayer(
      cosmetic,
      baseUrl,
      tints[slot]
    );

    if (!layer) continue;

    ctx.drawImage(layer, 0, 0, canvas.width, canvas.height);
  }

  return canvas;
}

export async function renderCharacterToDataUrl(
  opts: Parameters<typeof renderCharacter>[0]
): Promise<string> {
  const canvas = await renderCharacter(opts);
  return canvas.toDataURL("image/png");
}
