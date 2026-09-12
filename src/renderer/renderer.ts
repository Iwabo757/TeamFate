// src/renderer/renderer.ts

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

export type CosmeticTints = Partial<
  Record<
    "hair" | "top" | "pants" | "shoes" | "back" | "hat",
    string
  >
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

const CHROMA = {
  r: 255,
  g: 20,
  b: 147,
  tolerance: 8,
};

function joinUrl(baseUrl: string, path: string): string {
  if (!path) return "";

  if (/^https?:\/\//i.test(path) || path.startsWith("/")) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

let manifestPromise: Promise<RendererManifest> | null = null;

export async function loadRendererManifest(
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RendererManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(
      joinUrl(baseUrl, "manifest.json"),
      { cache: "no-cache" }
    ).then(async (response) => {
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

    image.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    image.src = url;
  });
}

/*
 * Cosmetic animation resources are indexed against the same base-frame
 * sequence. The important part for the character preview is that we do
 * NOT invent directional groups from the cosmetic frame count.
 *
 * Example:
 *   base frame 0 -> cosmetic frame 0
 *   base frame 1 -> cosmetic frame 1
 *   base frame 2 -> cosmetic frame 2
 *
 * Some cosmetics have fewer frames than the base character. In that case
 * we use the last available frame only as a safe fallback.
 */
function getPreviewDirection(baseFrame: number): "front" | "side" | "back" | "other" {
  /*
   * The 52 base resources are animation frames, not four contiguous
   * directional blocks.  The preview uses these verified representative
   * base frames:
   *
   *   3 = Front
   *   2 = Side
   *   0 = Back
   *
   * Keep this function based on the actual selected base frame so cosmetic
   * resources can be mapped independently from the base animation order.
   */
  if (baseFrame === 3) return "front";
  if (baseFrame === 2) return "side";
  if (baseFrame === 0) return "back";
  return "other";
}

function getCosmeticFrameIndex(
  cosmetic: Cosmetic,
  baseFrame: number,
  frameCount: number
): number | null {
  if (frameCount <= 0) return null;

  const direction = getPreviewDirection(baseFrame);

  /*
   * These are directional resources extracted from the PAK. Their order is
   * cosmetic-specific, so do not derive the mapping from the base frame
   * number.
   */

  // Brown/standard eye colors are front-only layers. Do not paint eyes onto
  // the back of the head or onto a side view when no side asset exists.
  if (cosmetic.slot === "eyes" && frameCount === 1) {
    return direction === "front" ? 0 : null;
  }

  // Four-frame cosmetics: Front, Side, Back, Other Side.
  if (frameCount === 4) {
    if (direction === "front") return 0;
    if (direction === "side") return 1;
    if (direction === "back") return 2;
    return 3;
  }

  // Three-frame cosmetics: Front, Side, Back.
  if (frameCount === 3) {
    if (direction === "front") return 0;
    if (direction === "side") return 1;
    if (direction === "back") return 2;
    return 2;
  }

  // The main clothing assets are three directional groups in their
  // extracted frame sequence.
  if (cosmetic.slot === "top" && frameCount === 39) {
    if (direction === "front") return 0;
    if (direction === "side") return 13;
    if (direction === "back") return 26;
    return 13;
  }

  if (cosmetic.slot === "pants" && frameCount === 29) {
    if (direction === "front") return 0;
    if (direction === "side") return 10;
    if (direction === "back") return 20;
    return 10;
  }

  if (cosmetic.slot === "shoes" && frameCount === 16) {
    if (direction === "front") return 0;
    if (direction === "side") return 4;
    if (direction === "back") return 8;
    return 12;
  }

  // Generic four-direction sequences. Use the first frame of each group.
  if (frameCount % 4 === 0) {
    const groupSize = frameCount / 4;
    if (direction === "front") return 0;
    if (direction === "side") return groupSize;
    if (direction === "back") return groupSize * 2;
    return groupSize * 3;
  }

  // Generic three-direction sequences.
  if (frameCount % 3 === 0) {
    const groupSize = frameCount / 3;
    if (direction === "front") return 0;
    if (direction === "side") return groupSize;
    if (direction === "back") return groupSize * 2;
    return groupSize;
  }

  // For irregular resources, use the first/center/last thirds rather than
  // indexing by the base animation frame.
  if (direction === "front") return 0;
  if (direction === "side") return Math.min(Math.floor(frameCount / 3), frameCount - 1);
  if (direction === "back") return Math.min(Math.floor((frameCount * 2) / 3), frameCount - 1);
  return Math.min(Math.floor(frameCount / 3), frameCount - 1);
}

async function loadCosmeticImage(
  cosmetic: Cosmetic,
  baseFrame: number,
  baseUrl: string
): Promise<HTMLImageElement | null> {
  if (!cosmetic.layer) {
    throw new Error(
      `Cosmetic has no layer: ${cosmetic.name ?? "Unknown"}`
    );
  }

  if (cosmetic.frames && cosmetic.frames.length > 0) {
    const index = getCosmeticFrameIndex(
      cosmetic,
      baseFrame,
      cosmetic.frames.length
    );

    if (index === null) return null;

    const framePath = cosmetic.frames[index];

    if (framePath) {
      try {
        return await loadImage(
          joinUrl(baseUrl, framePath)
        );
      } catch {
        // Fall back to the normal layer below.
      }
    }
  }

  return loadImage(
    joinUrl(baseUrl, cosmetic.layer)
  );
}

function createCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
): void {
  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );
}

function removeChromaKey(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = context.getImageData(
    0,
    0,
    width,
    height
  );

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (
      Math.abs(r - CHROMA.r) <= CHROMA.tolerance &&
      Math.abs(g - CHROMA.g) <= CHROMA.tolerance &&
      Math.abs(b - CHROMA.b) <= CHROMA.tolerance
    ) {
      data[i + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
}

function hexToRgb(
  color: string
): { r: number; g: number; b: number } | null {
  const value = color.trim().replace("#", "");

  if (value.length !== 6) return null;

  const number = Number.parseInt(value, 16);

  if (!Number.isFinite(number)) return null;

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
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

  const imageData = context.getImageData(
    0,
    0,
    width,
    height
  );

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luminance =
      0.2126 * r +
      0.7152 * g +
      0.0722 * b;

    const factor = luminance / 255;

    data[i] = Math.min(
      255,
      Math.round(rgb.r * factor)
    );

    data[i + 1] = Math.min(
      255,
      Math.round(rgb.g * factor)
    );

    data[i + 2] = Math.min(
      255,
      Math.round(rgb.b * factor)
    );
  }

  context.putImageData(
    imageData,
    0,
    0
  );
}

function getBaseData(
  manifest: RendererManifest,
  skin: number
): {
  frames: string[];
  previews: string[];
} {
  const keys = [
    `skin_${skin}`,
    String(skin),
  ];

  for (const key of keys) {
    if (manifest.base[key]) {
      return manifest.base[key];
    }
  }

  if (manifest.base.skin_1) {
    return manifest.base.skin_1;
  }

  const firstKey = Object.keys(
    manifest.base
  )[0];

  if (firstKey) {
    return manifest.base[firstKey];
  }

  throw new Error(
    "Renderer manifest contains no base characters."
  );
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

  const base = getBaseData(
    manifest,
    skin
  );

  if (
    !base.frames ||
    base.frames.length === 0
  ) {
    throw new Error(
      `Skin ${skin} contains no base frames.`
    );
  }

  const baseFrameIndex = Math.max(
    0,
    Math.min(
      frame,
      base.frames.length - 1
    )
  );

  const basePath =
    base.frames[baseFrameIndex];

  if (!basePath) {
    throw new Error(
      `Base frame ${baseFrameIndex} does not exist for skin ${skin}.`
    );
  }

  const baseImage = await loadImage(
    joinUrl(baseUrl, basePath)
  );

  const width =
    baseImage.naturalWidth ||
    baseImage.width;

  const height =
    baseImage.naturalHeight ||
    baseImage.height;

  if (!width || !height) {
    throw new Error(
      "Base character image has invalid dimensions."
    );
  }

  const nativeCanvas =
    createCanvas(width, height);

  const nativeContext =
    nativeCanvas.getContext("2d");

  if (!nativeContext) {
    throw new Error(
      "Unable to create renderer canvas."
    );
  }

  nativeContext.imageSmoothingEnabled = false;

  drawImage(
    nativeContext,
    baseImage,
    width,
    height
  );

  removeChromaKey(
    nativeContext,
    width,
    height
  );

  for (const slot of LAYER_ORDER) {
    const cosmeticId =
      cosmetics[slot];

    if (!cosmeticId) continue;

    const cosmetic =
      manifest.cosmetics?.[cosmeticId];

    if (!cosmetic) {
      console.warn(
        `[Renderer] Cosmetic "${cosmeticId}" was not found in manifest.`
      );
      continue;
    }

    if (cosmetic.slot !== slot) {
      console.warn(
        `[Renderer] Cosmetic "${cosmeticId}" has slot "${cosmetic.slot}" but was assigned to "${slot}".`
      );
      continue;
    }

    let cosmeticImage:
      HTMLImageElement | null;

    try {
      cosmeticImage =
        await loadCosmeticImage(
          cosmetic,
          frame,
          baseUrl
        );
    } catch (error) {
      console.warn(
        `[Renderer] Could not load ${slot} cosmetic "${cosmetic.name ?? cosmeticId}".`,
        error
      );
      continue;
    }

    if (!cosmeticImage) {
      continue;
    }

    const layerCanvas =
      createCanvas(width, height);

    const layerContext =
      layerCanvas.getContext("2d");

    if (!layerContext) continue;

    layerContext.imageSmoothingEnabled =
      false;

    drawImage(
      layerContext,
      cosmeticImage,
      width,
      height
    );

    removeChromaKey(
      layerContext,
      width,
      height
    );

    const tint =
      tints[
        slot as keyof CosmeticTints
      ];

    if (tint) {
      applyTint(
        layerContext,
        width,
        height,
        tint
      );
    }

    nativeContext.drawImage(
      layerCanvas,
      0,
      0
    );
  }

  const safeScale =
    Number.isFinite(scale) &&
    scale > 0
      ? scale
      : 1;

  const finalCanvas =
    createCanvas(
      Math.round(width * safeScale),
      Math.round(height * safeScale)
    );

  const finalContext =
    finalCanvas.getContext("2d");

  if (!finalContext) {
    throw new Error(
      "Unable to create final renderer canvas."
    );
  }

  finalContext.imageSmoothingEnabled =
    false;

  finalContext.drawImage(
    nativeCanvas,
    0,
    0,
    finalCanvas.width,
    finalCanvas.height
  );

  return finalCanvas;
}

export async function renderCharacterToDataUrl(
  options: RenderOptions
): Promise<string> {
  const canvas =
    await renderCharacter(options);

  return canvas.toDataURL(
    "image/png"
  );
}

export async function renderCharacterToImage(
  options: RenderOptions
): Promise<HTMLImageElement> {
  const dataUrl =
    await renderCharacterToDataUrl(
      options
    );

  return loadImage(dataUrl);
}
