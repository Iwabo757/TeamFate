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
      baseFrame === 1 ? findFrame(crownFrames, 1) :
      baseFrame === 2 ? findFrame(crownFrames, 2) : null;

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

type AlphaMask = {
  width: number;
  height: number;
  data: Uint8Array;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type DirectionTarget = "back" | "side";
type DirectionResult = Record<DirectionTarget, number | null>;

const directionCache = new Map<string, Promise<DirectionResult>>();
const baseDirectionCache = new Map<string, Promise<{
  back: HTMLImageElement | null;
  side: HTMLImageElement | null;
  all: Array<HTMLImageElement | null>;
}>>();

const DIRECTION_REGIONS: Record<CosmeticSlot, [number, number, number, number]> = {
  back:  [0, 4, 57, 54],
  pants: [4, 25, 53, 56],
  shoes: [2, 38, 55, 56],
  top:   [2, 12, 55, 48],
  eyes:  [7, 7, 50, 29],
  face:  [4, 5, 53, 39],
  hair:  [0, 0, 57, 34],
  held:  [0, 10, 57, 55],
  hat:   [0, 0, 57, 28],
  tool:  [0, 0, 57, 56],
  mount: [0, 0, 57, 56],
};

function buildAlphaMask(
  image: HTMLImageElement,
  region: [number, number, number, number]
): AlphaMask {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const data = new Uint8Array(width * height);
  if (!ctx) {
    return {
      width, height, data,
      minX: width, minY: height, maxX: -1, maxY: -1,
    };
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const [x0, y0, x1, y1] = region;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  const rx0 = Math.max(0, Math.floor(x0));
  const ry0 = Math.max(0, Math.floor(y0));
  const rx1 = Math.min(width, Math.ceil(x1));
  const ry1 = Math.min(height, Math.ceil(y1));

  for (let y = ry0; y < ry1; y++) {
    for (let x = rx0; x < rx1; x++) {
      const i = (y * width + x) * 4;
      if (!rgba[i + 3]) continue;
      if (
        Math.abs(rgba[i] - CHROMA.r) <= CHROMA.tolerance &&
        Math.abs(rgba[i + 1] - CHROMA.g) <= CHROMA.tolerance &&
        Math.abs(rgba[i + 2] - CHROMA.b) <= CHROMA.tolerance
      ) continue;

      data[y * width + x] = 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { width, height, data, minX, minY, maxX, maxY };
}

function maskBounds(mask: AlphaMask): number {
  if (mask.maxX < mask.minX || mask.maxY < mask.minY) return 0;
  return (mask.maxX - mask.minX + 1) * (mask.maxY - mask.minY + 1);
}

function dilateMask(mask: AlphaMask, radius = 1): Uint8Array {
  const out = new Uint8Array(mask.data.length);
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (!mask.data[y * mask.width + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= mask.height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= mask.width) continue;
          out[yy * mask.width + xx] = 1;
        }
      }
    }
  }
  return out;
}

function overlapScore(a: AlphaMask, b: AlphaMask): number {
  let aCount = 0;
  let bCount = 0;
  let intersection = 0;

  const length = Math.min(a.data.length, b.data.length);
  for (let i = 0; i < length; i++) {
    if (a.data[i]) aCount++;
    if (b.data[i]) bCount++;
    if (a.data[i] && b.data[i]) intersection++;
  }

  if (!aCount || !bCount) return 0;
  return intersection / Math.min(aCount, bCount);
}

function directionalBaseScore(a: AlphaMask, b: AlphaMask): number {
  const overlap = overlapScore(a, b);
  const aw = Math.max(1, a.maxX - a.minX + 1);
  const ah = Math.max(1, a.maxY - a.minY + 1);
  const bw = Math.max(1, b.maxX - b.minX + 1);
  const bh = Math.max(1, b.maxY - b.minY + 1);

  const widthScore = 1 - Math.min(1, Math.abs(aw - bw) / Math.max(aw, bw));
  const heightScore = 1 - Math.min(1, Math.abs(ah - bh) / Math.max(ah, bh));
  const centerAx = (a.minX + a.maxX) / 2;
  const centerAy = (a.minY + a.maxY) / 2;
  const centerBx = (b.minX + b.maxX) / 2;
  const centerBy = (b.minY + b.maxY) / 2;
  const centerScore = 1 - Math.min(
    1,
    Math.hypot(centerAx - centerBx, centerAy - centerBy) / 12
  );

  return overlap * 0.60 + widthScore * 0.15 + heightScore * 0.15 + centerScore * 0.10;
}

function candidateDirectionScore(
  candidate: AlphaMask,
  reference: AlphaMask,
  other: AlphaMask
): number {
  const referenceDilated = dilateMask(reference, 2);
  const otherDilated = dilateMask(other, 2);

  let count = 0;
  let onReference = 0;
  let onOther = 0;

  for (let i = 0; i < candidate.data.length; i++) {
    if (!candidate.data[i]) continue;
    count++;
    if (referenceDilated[i]) onReference++;
    if (otherDilated[i]) onOther++;
  }

  if (!count) return -Infinity;

  // A correct directional frame should sit on the same body silhouette.
  // Reward target overlap and penalize overlap with the opposite direction.
  const support = onReference / count;
  const opposite = onOther / count;
  return support * 0.80 - opposite * 0.20;
}

async function getDirectionalBaseFrames(
  baseUrl: string,
  manifest: RendererManifest
): Promise<{
  back: HTMLImageElement | null;
  side: HTMLImageElement | null;
  all: Array<HTMLImageElement | null>;
}> {
  const base = getBaseData(manifest, 1);
  const key = `${baseUrl}|${base.frames.join("|")}`;
  const cached = baseDirectionCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const all = await Promise.all(
      base.frames.map((path) => loadImage(joinUrl(baseUrl, path)).catch(() => null))
    );

    return {
      back: all[1] ?? null,
      side: all[2] ?? null,
      all,
    };
  })();

  baseDirectionCache.set(key, promise);
  return promise;
}

async function resolveCosmeticDirections(
  cosmetic: Cosmetic,
  baseUrl: string,
  manifest: RendererManifest
): Promise<DirectionResult> {
  const frames = cosmetic.frames ?? [];
  if (!frames.length) return { back: null, side: null };

  const cacheKey = `${baseUrl}|${cosmetic.id ?? cosmetic.name ?? cosmetic.layer}|${frames.join("|")}`;
  const cached = directionCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const base = await getDirectionalBaseFrames(baseUrl, manifest);
    if (!base.back || !base.side) return { back: null, side: null };

    const region = DIRECTION_REGIONS[cosmetic.slot];
    const [backImage, sideImage, ...candidateImages] = await Promise.all([
      Promise.resolve(base.back),
      Promise.resolve(base.side),
      ...frames.map((path) => loadImage(joinUrl(baseUrl, path)).catch(() => null)),
    ]);

    if (!backImage || !sideImage) return { back: null, side: null };

    const backAnchor = buildAlphaMask(backImage, region);
    const sideAnchor = buildAlphaMask(sideImage, region);

    // Build masks for every base frame. Each animation frame is classified as
    // Back or Side by comparing its silhouette to the known direction anchors.
    // This is important because cosmetic frame numbers do NOT line up with
    // base frame numbers; e.g. one cosmetic can put Back at frame 10 and Side
    // at frame 26 while another uses completely different numbers.
    const backReferences: AlphaMask[] = [backAnchor];
    const sideReferences: AlphaMask[] = [sideAnchor];

    for (let i = 0; i < base.all.length; i++) {
      const image = base.all[i];
      if (!image || image === backImage || image === sideImage) continue;

      const mask = buildAlphaMask(image, region);
      const backScore = directionalBaseScore(mask, backAnchor);
      const sideScore = directionalBaseScore(mask, sideAnchor);

      if (backScore >= sideScore) {
        backReferences.push(mask);
      } else {
        sideReferences.push(mask);
      }
    }

    const ranked = candidateImages.map((image, index) => {
      if (!image) return null;
      const mask = buildAlphaMask(image, region);

      let bestBack = -Infinity;
      let bestSide = -Infinity;

      for (const reference of backReferences) {
        bestBack = Math.max(
          bestBack,
          candidateDirectionScore(mask, reference, sideAnchor)
        );
      }

      for (const reference of sideReferences) {
        bestSide = Math.max(
          bestSide,
          candidateDirectionScore(mask, reference, backAnchor)
        );
      }

      return { index, back: bestBack, side: bestSide, mask };
    }).filter((x): x is {
      index: number;
      back: number;
      side: number;
      mask: AlphaMask;
    } => !!x);

    if (!ranked.length) return { back: null, side: null };

    // Pick independent winners, then make sure one frame is not assigned to
    // both directions when the cosmetic has multiple distinct frames.
    const bestBack = [...ranked].sort((a, b) => b.back - a.back)[0];
    let bestSide = [...ranked].sort((a, b) => b.side - a.side)[0];

    if (bestSide.index === bestBack.index && ranked.length > 1) {
      bestSide = [...ranked]
        .filter((x) => x.index !== bestBack.index)
        .sort((a, b) => b.side - a.side)[0] ?? bestSide;
    }

    return {
      back: bestBack.index,
      side: bestSide.index,
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
  if (baseFrame === 0) {
    return loadLayer(cosmetic.layer, baseUrl, true);
  }

  const frames = cosmetic.frames ?? [];
  if (!frames.length) return [];

  // Eyes are not drawn on the Back view.
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
