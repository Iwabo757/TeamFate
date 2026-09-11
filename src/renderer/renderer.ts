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
  name: string;
  slot: CosmeticSlot;
  layer: string;
  icon: string;
  layer_index: number;
  icon_index: number;
  slot_code: number;
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
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export async function loadImage(src: string): Promise<HTMLImageElement> {
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
    throw new Error(
      `Renderer manifest returned ${response.status}`
    );
  }

  return response.json() as Promise<RendererManifest>;
}

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

export async function renderCharacter(opts: {
  manifest: RendererManifest;
  baseUrl?: string;
  skin?: number;
  frame?: number;
  cosmetics?: Partial<Record<CosmeticSlot, string>>;
  scale?: number;
}): Promise<HTMLCanvasElement> {
  const {
    manifest,
    skin = 1,
    frame = 0,
    cosmetics = {},
    scale = 1,
  } = opts;

  const baseUrl = (opts.baseUrl ?? "").replace(/\/$/, "");
  const skinData = manifest.base[`skin_${skin}`];

  if (!skinData) {
    throw new Error(`Invalid skin: ${skin}`);
  }

  const basePath = skinData.frames[frame];

  if (!basePath) {
    throw new Error(`Invalid frame: ${frame}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 57 * scale;
  canvas.height = 56 * scale;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D unavailable");
  }

  ctx.imageSmoothingEnabled = false;

  const base = await loadImage(`${baseUrl}/${basePath}`);
  ctx.drawImage(
    base,
    0,
    0,
    57 * scale,
    56 * scale
  );

  for (const slot of LAYER_ORDER) {
    const name = cosmetics[slot];

    if (!name) continue;

    const cosmetic = manifest.cosmetics[name];

    if (!cosmetic || cosmetic.slot !== slot) {
      continue;
    }

    const layer = await loadImage(
      `${baseUrl}/${cosmetic.layer}`
    );

    ctx.drawImage(
      layer,
      0,
      0,
      57 * scale,
      56 * scale
    );
  }

  return canvas;
}

export async function renderCharacterToDataUrl(
  opts: Parameters<typeof renderCharacter>[0]
): Promise<string> {
  const canvas = await renderCharacter(opts);
  return canvas.toDataURL("image/png");
}
