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

/*
 * The Mermaid resources are composite resources. These mappings are
 * intentionally explicit because they are based on the actual resource
 * pieces, not on the generic frame-number convention.
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
      baseFrame === 0
        ? findFrame(crownFrames, 3)
        : baseFrame === 2
          ? findFrame(crownFrames, 2)
          : baseFrame === 1
            ? findFrame(crownFrames, 1)
            : null;

    if (!path) return [];

    try {
      return [{ image: await loadImage(joinUrl(baseUrl, path)), tint: true }];
    } catch {
      return [];
    }
  }

  if (isMermaidCrown(cosmetic)) {
    const paths: Array<{ path: string | null; tint: boolean }> = [];

    if (baseFrame === 0) {
      // Main hair, crown, then final hair piece covering the ears.
      paths.push({ path: findFrame(hairFrames, 5), tint: true });
      paths.push({ path: findFrame(hairFrames, 6), tint: false });
      paths.push({ path: findFrame(hairFrames, 7), tint: true });
    } else if (baseFrame === 2) {
      paths.push({ path: findFrame(hairFrames, 3), tint: true });
      paths.push({ path: findFrame(hairFrames, 4), tint: true });
    } else if (baseFrame === 1) {
      paths.push({ path: findFrame(hairFrames, 2), tint: true });
    }

    const result: RenderLayer[] = [];
    for (const item of paths) {
      if (!item.path) continue;
      try {
        result.push({
          image: await loadImage(joinUrl(baseUrl, item.path)),
          tint: item.tint,
        });
      } catch {
        // Keep any other successfully loaded piece.
      }
    }
    return result;
  }

  return [];
}

/*
 * Generic cosmetics:
 * Front uses the cosmetic's base layer.
 * Back prefers frame_1.
 * Side prefers frame_2.
 *
 * This intentionally does not override the explicit Mermaid mappings.
 */
async function getGenericLayers(
  cosmetic: Cosmetic,
  baseFrame: number,
  baseUrl: string
): Promise<RenderLayer[]> {
  if (baseFrame === 0) {
    try {
      return [{
        image: await loadImage(joinUrl(baseUrl, cosmetic.layer)),
        tint: true,
      }];
    } catch {
      return [];
    }
  }

  const frames = cosmetic.frames ?? [];
  if (!frames.length) return [];

  // Eyes are hidden from Back and use frame_1 on Side.
  if (cosmetic.slot === "eyes") {
    if (baseFrame === 1) return [];
    const side = findFrame(frames, 1);
    if (baseFrame === 2 && side) {
      try {
        return [{ image: await loadImage(joinUrl(baseUrl, side)), tint: true }];
      } catch {
        return [];
      }
    }
    return [];
  }

  // Shoes are too small for silhouette detection.
  if (cosmetic.slot === "shoes") {
    const path = baseFrame === 1 ? frames[0] : baseFrame === 2 ? frames[1] : null;
    if (!path) return [];
    try {
      return [{ image: await loadImage(joinUrl(baseUrl, path)), tint: true }];
    } catch {
      return [];
    }
  }

  const path =
    baseFrame === 1
      ? findFrame(frames, 1)
      : baseFrame === 2
        ? findFrame(frames, 2)
        : null;

  if (!path) return [];

  try {
    return [{ image: await loadImage(joinUrl(baseUrl, path)), tint: true }];
  } catch {
    return [];
  }
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
  return getGenericLayers(cosmetic, baseFrame, baseUrl);
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
