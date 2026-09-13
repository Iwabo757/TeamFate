// src/renderer/renderer.ts

export type CosmeticSlot =
  | "back" | "pants" | "shoes" | "top" | "eyes" | "face"
  | "hair" | "held" | "hat" | "tool" | "mount";

export type Cosmetic = {
  id?: string;
  name?: string;
  slot: CosmeticSlot;
  layer: string;
  frames?: string[];
  icon?: string;
};

export type RendererManifest = {
  format_version: number;
  base: Record<string, { frames: string[]; previews: string[] }>;
  cosmetics: Record<string, Cosmetic>;
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

const DEFAULT_BASE_URL = "/team-fate-renderer";

const LAYER_ORDER: CosmeticSlot[] = [
  "back", "pants", "shoes", "top", "face", "hair",
  "eyes", "held", "hat", "tool", "mount",
];

const CHROMA = { r: 255, g: 20, b: 147, tolerance: 8 };

type RenderLayer = {
  image: HTMLImageElement;
  tint: boolean;
};

function joinUrl(baseUrl: string, path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

let manifestPromise: Promise<RendererManifest> | null = null;

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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
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
  image: HTMLImageElement,
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
    if (
      Math.abs(data[i] - CHROMA.r) <= CHROMA.tolerance &&
      Math.abs(data[i + 1] - CHROMA.g) <= CHROMA.tolerance &&
      Math.abs(data[i + 2] - CHROMA.b) <= CHROMA.tolerance
    ) {
      data[i + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
}

function findFrame(frames: string[], number: number): string | null {
  const pattern = new RegExp(`frame_${number}(?:\\D|$)`, "i");
  return frames.find((path) => pattern.test(path)) ?? null;
}

function isMermaidHair(cosmetic: Cosmetic): boolean {
  const name = (cosmetic.name ?? "").toLowerCase();
  const layer = (cosmetic.layer ?? "").toLowerCase();
  return name.includes("mermaid hair") || layer.includes("mermaid_hair");
}

function isMermaidCrown(cosmetic: Cosmetic): boolean {
  const name = (cosmetic.name ?? "").toLowerCase();
  const layer = (cosmetic.layer ?? "").toLowerCase();
  return name.includes("mermaid hair crown") ||
    layer.includes("mermaid_hair_crown");
}

function isNormalMermaidHair(cosmetic: Cosmetic): boolean {
  return isMermaidHair(cosmetic) && !isMermaidCrown(cosmetic);
}

async function loadLayer(
  path: string | null | undefined,
  baseUrl: string,
  tint: boolean
): Promise<RenderLayer[]> {
  if (!path) return [];
  try {
    return [{ image: await loadImage(joinUrl(baseUrl, path)), tint }];
  } catch {
    return [];
  }
}

/*
 * Composite Mermaid resources.
 * These are genuine multi-piece resources, so they cannot be treated as one
 * ordinary cosmetic frame.
 */
async function getMermaidLayers(
  cosmetic: Cosmetic,
  baseFrame: number,
  baseUrl: string,
  manifest: RendererManifest
): Promise<RenderLayer[]> {
  const hair = manifest.cosmetics["Mermaid Hair"];
  const crown = manifest.cosmetics["Mermaid Hair Crown"];
  const hairFrames = hair?.frames ?? [];
  const crownFrames = crown?.frames ?? [];

  if (isNormalMermaidHair(cosmetic)) {
    const path =
      baseFrame === 0 ? findFrame(crownFrames, 3) :
      baseFrame === 2 ? findFrame(crownFrames, 2) :
      baseFrame === 1 ? findFrame(crownFrames, 1) : null;

    return loadLayer(path, baseUrl, true);
  }

  if (isMermaidCrown(cosmetic)) {
    const pieces: Array<[string | null, boolean]> = [];

    if (baseFrame === 0) {
      pieces.push([findFrame(hairFrames, 5), true]);
      pieces.push([findFrame(hairFrames, 6), false]);
      pieces.push([findFrame(hairFrames, 7), true]);
    } else if (baseFrame === 2) {
      pieces.push([findFrame(hairFrames, 3), true]);
      pieces.push([findFrame(hairFrames, 4), true]);
    } else if (baseFrame === 1) {
      pieces.push([findFrame(hairFrames, 2), true]);
    }

    const result: RenderLayer[] = [];
    for (const [path, tint] of pieces) {
      result.push(...await loadLayer(path, baseUrl, tint));
    }
    return result;
  }

  return [];
}

type PixelStats = {
  count: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

type DirectionTarget = "back" | "side";

/*
 * These regions are NOT frame mappings. They only tell the detector which
 * part of the character is useful evidence for a given slot.
 *
 * A cosmetic can put Back at frame 10, Side at frame 26, frame 1/2, or any
 * other positions. The detector scans the complete frame list.
 */
const DIRECTION_REGIONS: Record<CosmeticSlot, [number, number, number, number]> = {
  back:  [0, 8, 56, 50],
  pants: [6, 30, 50, 55],
  shoes: [3, 42, 53, 56],
  top:   [4, 15, 53, 45],
  eyes:  [9, 8, 48, 29],
  face:  [6, 7, 50, 36],
  hair:  [2, 0, 54, 31],
  held:  [0, 12, 56, 52],
  hat:   [0, 0, 56, 25],
  tool:  [0, 0, 56, 56],
  mount: [0, 0, 56, 56],
};

function makeAlphaStats(
  image: HTMLImageElement,
  region: [number, number, number, number]
): PixelStats {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return {
      count: 0, minX: width, minY: height, maxX: -1, maxY: -1,
      centerX: width / 2, centerY: height / 2, width: 0, height: 0,
    };
  }

  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const [x0, y0, x1, y1] = region;
  const rx0 = Math.max(0, Math.min(width, x0));
  const ry0 = Math.max(0, Math.min(height, y0));
  const rx1 = Math.max(rx0, Math.min(width, x1));
  const ry1 = Math.max(ry0, Math.min(height, y1));

  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = ry0; y < ry1; y++) {
    for (let x = rx0; x < rx1; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      if (!alpha) continue;
      if (
        Math.abs(data[i] - CHROMA.r) <= CHROMA.tolerance &&
        Math.abs(data[i + 1] - CHROMA.g) <= CHROMA.tolerance &&
        Math.abs(data[i + 2] - CHROMA.b) <= CHROMA.tolerance
      ) continue;

      count++;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    count,
    minX,
    minY,
    maxX,
    maxY,
    centerX: count ? sumX / count : width / 2,
    centerY: count ? sumY / count : height / 2,
    width: count ? maxX - minX + 1 : 0,
    height: count ? maxY - minY + 1 : 0,
  };
}

function compareStats(a: PixelStats, b: PixelStats): number {
  if (!a.count || !b.count) return 0;

  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const areaScore = 1 - Math.min(1, Math.abs(areaA - areaB) / Math.max(areaA, areaB));
  const countScore = 1 - Math.min(1, Math.abs(a.count - b.count) / Math.max(a.count, b.count));
  const centerScore = 1 - Math.min(
    1,
    Math.hypot(a.centerX - b.centerX, a.centerY - b.centerY) / 40
  );
  const widthScore = 1 - Math.min(1, Math.abs(a.width - b.width) / Math.max(a.width, b.width));
  const heightScore = 1 - Math.min(1, Math.abs(a.height - b.height) / Math.max(a.height, b.height));

  return (
    areaScore * 0.20 +
    countScore * 0.25 +
    centerScore * 0.20 +
    widthScore * 0.175 +
    heightScore * 0.175
  );
}

const directionCache = new Map<string, Promise<Record<DirectionTarget, number | null>>>();

async function resolveCosmeticDirections(
  cosmetic: Cosmetic,
  baseUrl: string,
  manifest: RendererManifest
): Promise<Record<DirectionTarget, number | null>> {
  const frames = cosmetic.frames ?? [];
  if (!frames.length) return { back: null, side: null };

  const cacheKey = `${baseUrl}|${cosmetic.id ?? cosmetic.name ?? cosmetic.layer}|${frames.join("|")}`;
  const cached = directionCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const base = getBaseData(manifest, 1);
    const backPath = base.frames[1];
    const sidePath = base.frames[2];
    if (!backPath && !sidePath) return { back: null, side: null };

    const region = DIRECTION_REGIONS[cosmetic.slot];
    const [backImage, sideImage, ...candidateImages] = await Promise.all([
      backPath ? loadImage(joinUrl(baseUrl, backPath)).catch(() => null) : Promise.resolve(null),
      sidePath ? loadImage(joinUrl(baseUrl, sidePath)).catch(() => null) : Promise.resolve(null),
      ...frames.map((path) => loadImage(joinUrl(baseUrl, path)).catch(() => null)),
    ]);

    const backStats = backImage ? makeAlphaStats(backImage, region) : null;
    const sideStats = sideImage ? makeAlphaStats(sideImage, region) : null;

    let bestBack = -1;
    let bestSide = -1;
    let bestBackScore = -Infinity;
    let bestSideScore = -Infinity;

    candidateImages.forEach((image, index) => {
      if (!image) return;
      const stats = makeAlphaStats(image, region);

      if (backStats) {
        const score = compareStats(stats, backStats);
        if (score > bestBackScore) {
          bestBackScore = score;
          bestBack = index;
        }
      }

      if (sideStats) {
        const score = compareStats(stats, sideStats);
        if (score > bestSideScore) {
          bestSideScore = score;
          bestSide = index;
        }
      }
    });

    // Never use the same candidate for both directions when there are other
    // candidates. This matters for cosmetics whose frames are near-identical.
    if (bestBack === bestSide && frames.length > 1) {
      const alternatives = candidateImages
        .map((image, index) => {
          if (!image || index === bestBack) return null;
          const stats = makeAlphaStats(image, region);
          return {
            index,
            back: backStats ? compareStats(stats, backStats) : -Infinity,
            side: sideStats ? compareStats(stats, sideStats) : -Infinity,
          };
        })
        .filter((v): v is { index: number; back: number; side: number } => !!v);

      const bestAlternativeForSide = alternatives.sort((a, b) =>
        (b.side - b.back) - (a.side - a.back)
      )[0];

      if (bestAlternativeForSide) {
        bestSide = bestAlternativeForSide.index;
      }
    }

    return {
      back: bestBack >= 0 ? bestBack : null,
      side: bestSide >= 0 ? bestSide : null,
    };
  })();

  directionCache.set(cacheKey, promise);
  return promise;
}

async function getGenericLayers(
  cosmetic: Cosmetic,
  baseFrame: number,
  baseUrl: string,
  manifest: RendererManifest
): Promise<RenderLayer[]> {
  // Front always uses the cosmetic's primary layer.
  if (baseFrame === 0) {
    return loadLayer(cosmetic.layer, baseUrl, true);
  }

  const frames = cosmetic.frames ?? [];
  if (!frames.length) return [];

  // Eyes are normally only visible from the front/side. If a cosmetic has
  // directional frames, the detector still decides which one is Side.
  if (cosmetic.slot === "eyes" && baseFrame === 1) {
    return [];
  }

  const directions = await resolveCosmeticDirections(cosmetic, baseUrl, manifest);
  const index = baseFrame === 1 ? directions.back : directions.side;

  if (index === null || index < 0 || index >= frames.length) return [];
  return loadLayer(frames[index], baseUrl, true);
}

async function getCosmeticLayers(
  cosmetic: Cosmetic,
  baseFrame: number,
  baseUrl: string,
  manifest: RendererManifest
): Promise<RenderLayer[]> {
  if (isMermaidHair(cosmetic)) {
    return getMermaidLayers(cosmetic, baseFrame, baseUrl, manifest);
  }

  return getGenericLayers(cosmetic, baseFrame, baseUrl, manifest);
}

function hexToRgb(
  color: string
): { r: number; g: number; b: number } | null {
  const value = color.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;

  const n = Number.parseInt(value, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function applyTint(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void {
  const rgb = hexToRgb(color);
  if (!rgb) return;

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;

    const luminance =
      0.2126 * data[i] +
      0.7152 * data[i + 1] +
      0.0722 * data[i + 2];

    const factor = luminance / 255;

    data[i] = Math.round(rgb.r * factor);
    data[i + 1] = Math.round(rgb.g * factor);
    data[i + 2] = Math.round(rgb.b * factor);
  }

  context.putImageData(imageData, 0, 0);
}

function getBaseData(
  manifest: RendererManifest,
  skin: number
): { frames: string[]; previews: string[] } {
  const preferred = manifest.base[`skin_${skin}`] ?? manifest.base[String(skin)];
  if (preferred) return preferred;
  if (manifest.base.skin_1) return manifest.base.skin_1;

  const first = Object.keys(manifest.base)[0];
  if (first) return manifest.base[first];

  throw new Error("Renderer manifest contains no base characters.");
}

export async function renderCharacter(
  options: RenderOptions
): Promise<HTMLCanvasElement> {
  const {
    manifest,
    baseUrl = DEFAULT_BASE_URL,
    skin = 1,
    frame = 0,
    cosmetics = {},
    tints = {},
    scale = 1,
  } = options;

  const selected: Partial<Record<CosmeticSlot, string>> = cosmetics;

  const base = getBaseData(manifest, skin);
  if (!base.frames.length) {
    throw new Error(`Skin ${skin} contains no base frames.`);
  }

  const baseFrame = Math.max(0, Math.min(frame, base.frames.length - 1));
  const basePath = base.frames[baseFrame];
  if (!basePath) throw new Error(`Base frame ${baseFrame} does not exist.`);

  const baseImage = await loadImage(joinUrl(baseUrl, basePath));
  const width = baseImage.naturalWidth || baseImage.width;
  const height = baseImage.naturalHeight || baseImage.height;

  if (!width || !height) {
    throw new Error("Base character image has invalid dimensions.");
  }

  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create renderer canvas.");

  context.imageSmoothingEnabled = false;
  drawFullSize(context, baseImage, width, height);
  removeChromaKey(context, width, height);

  for (const slot of LAYER_ORDER) {
    const cosmeticId = selected[slot];
    if (!cosmeticId) continue;

    const cosmetic = manifest.cosmetics[cosmeticId];
    if (!cosmetic) {
      console.warn(`[Renderer] Cosmetic "${cosmeticId}" was not found.`);
      continue;
    }

    if (cosmetic.slot !== slot) {
      console.warn(
        `[Renderer] "${cosmeticId}" belongs to "${cosmetic.slot}", not "${slot}".`
      );
      continue;
    }

    const layers = await getCosmeticLayers(
      cosmetic,
      baseFrame,
      baseUrl,
      manifest
    );

    const tint = tints[slot as keyof CosmeticTints];

    for (const layer of layers) {
      const layerCanvas = makeCanvas(width, height);
      const layerContext = layerCanvas.getContext("2d");
      if (!layerContext) continue;

      layerContext.imageSmoothingEnabled = false;
      drawFullSize(layerContext, layer.image, width, height);
      removeChromaKey(layerContext, width, height);

      if (tint && layer.tint) {
        applyTint(layerContext, width, height, tint);
      }

      context.drawImage(layerCanvas, 0, 0);
    }
  }

  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  if (safeScale === 1) return canvas;

  const output = makeCanvas(
    Math.round(width * safeScale),
    Math.round(height * safeScale)
  );
  const outputContext = output.getContext("2d");
  if (!outputContext) throw new Error("Unable to create scaled canvas.");

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
