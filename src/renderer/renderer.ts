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

/*
 * PokeMMO uses this magenta as a transparent/chroma-key color
 * in some extracted cosmetic assets.
 */
const CHROMA_R = 255;
const CHROMA_G = 20;
const CHROMA_B = 147;

const CHROMA_TOLERANCE = 8;

/*
 * --------------------------------------------------------------------------
 * URL helpers
 * --------------------------------------------------------------------------
 */

function joinUrl(baseUrl: string, path: string): string {
  if (!path) return "";

  if (/^https?:\/\//i.test(path) || path.startsWith("/")) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/*
 * --------------------------------------------------------------------------
 * Manifest
 * --------------------------------------------------------------------------
 */

let manifestPromise: Promise<RendererManifest> | null = null;

export async function loadRendererManifest(
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RendererManifest> {
  if (!manifestPromise) {
    const url = joinUrl(baseUrl, "manifest.json");

    manifestPromise = fetch(url, {
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

/*
 * --------------------------------------------------------------------------
 * Cosmetic frame selection
 * --------------------------------------------------------------------------
 *
 * Static preview directions used by CosmeticBuilder:
 *
 *   0 = Front
 *   1 = Back
 *   2 = Side
 *
 * Cosmetics with their own frame list use the matching frame when available.
 *
 * If a cosmetic has no frames in the manifest, we attempt to derive the
 * directional files from its layer filename:
 *
 *   item__layer.png
 *   item__layer__frame_1.png
 *   item__layer__frame_2.png
 *
 * Missing derived files are handled by the image loader and fall back to
 * the original layer instead of breaking the entire character render.
 */

function getFramePaths(cosmetic: Cosmetic): string[] {
  if (cosmetic.frames && cosmetic.frames.length > 0) {
    return cosmetic.frames;
  }

  const layerPath = cosmetic.layer;

  if (!layerPath) {
    return [];
  }

  const extensionIndex = layerPath.lastIndexOf(".");

  if (extensionIndex === -1) {
    return [layerPath];
  }

  const basePath = layerPath.substring(0, extensionIndex);
  const extension = layerPath.substring(extensionIndex);

  return [
    layerPath,
    `${basePath}__frame_1${extension}`,
    `${basePath}__frame_2${extension}`,
  ];
}

function getCosmeticFrameIndex(
  baseFrame: number,
  frameCount: number
): number {
  if (frameCount <= 1) {
    return 0;
  }

  /*
   * The character preview uses:
   *
   * Front = 0
   * Back  = 1
   * Side  = 2
   *
   * If the cosmetic has fewer frames, use the closest available frame.
   */
  if (baseFrame === 0) {
    return 0;
  }

  if (baseFrame === 1) {
    return Math.min(1, frameCount - 1);
  }

  if (baseFrame === 2) {
    return Math.min(2, frameCount - 1);
  }

  return Math.min(baseFrame, frameCount - 1);
}

/*
 * --------------------------------------------------------------------------
 * Image loading
 * --------------------------------------------------------------------------
 */

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
 * Try the requested directional frame first.
 *
 * If that file does not exist, fall back to the cosmetic's main layer.
 * This prevents a single missing directional PNG from destroying the
 * entire character preview.
 */
async function loadCosmeticImage(
  cosmetic: Cosmetic,
  frame: number,
  baseUrl: string
): Promise<HTMLImageElement> {
  const paths = getFramePaths(cosmetic);

  if (paths.length === 0) {
    throw new Error(`Cosmetic has no layer: ${cosmetic.name ?? "Unknown"}`);
  }

  const index = getCosmeticFrameIndex(frame, paths.length);

  const requestedPath = paths[index];
  const fallbackPath = paths[0];

  try {
    return await loadImage(joinUrl(baseUrl, requestedPath));
  } catch {
    /*
     * If a generated directional file is missing, use the original layer.
     */
    if (requestedPath !== fallbackPath) {
      return loadImage(joinUrl(baseUrl, fallbackPath));
    }

    throw new Error(
      `Failed to load cosmetic image: ${joinUrl(baseUrl, fallbackPath)}`
    );
  }
}

/*
 * --------------------------------------------------------------------------
 * Canvas helpers
 * --------------------------------------------------------------------------
 */

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
  context.drawImage(image, 0, 0, width, height);
}

/*
 * --------------------------------------------------------------------------
 * Chroma-key cleanup
 * --------------------------------------------------------------------------
 */

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

    const matchesChroma =
      Math.abs(r - CHROMA_R) <= CHROMA_TOLERANCE &&
      Math.abs(g - CHROMA_G) <= CHROMA_TOLERANCE &&
      Math.abs(b - CHROMA_B) <= CHROMA_TOLERANCE;

    if (matchesChroma) {
      data[i + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
}

/*
 * --------------------------------------------------------------------------
 * Tinting
 * --------------------------------------------------------------------------
 */

function hexToRgb(
  color: string
): { r: number; g: number; b: number } | null {
  const value = color.trim().replace("#", "");

  if (value.length !== 6) {
    return null;
  }

  const number = Number.parseInt(value, 16);

  if (!Number.isFinite(number)) {
    return null;
  }

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

/*
 * Colorize opaque pixels while preserving their original brightness.
 *
 * This keeps shading/highlights from the PokeMMO sprite instead of turning
 * the entire layer into a flat color.
 */
function applyTint(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void {
  const rgb = hexToRgb(color);

  if (!rgb) {
    return;
  }

  const imageData = context.getImageData(
    0,
    0,
    width,
    height
  );

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];

    if (alpha === 0) {
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    /*
     * Calculate luminance so the original sprite's shadows and highlights
     * remain visible after tinting.
     */
    const luminance =
      0.2126 * r +
      0.7152 * g +
      0.0722 * b;

    const factor = luminance / 255;

    data[i] = Math.min(255, Math.round(rgb.r * factor));
    data[i + 1] = Math.min(
      255,
      Math.round(rgb.g * factor)
    );
    data[i + 2] = Math.min(
      255,
      Math.round(rgb.b * factor)
    );
  }

  context.putImageData(imageData, 0, 0);
}

/*
 * --------------------------------------------------------------------------
 * Base character
 * --------------------------------------------------------------------------
 */

function getBaseData(
  manifest: RendererManifest,
  skin: number
): {
  frames: string[];
  previews: string[];
} {
  const skinKey = String(skin);

  if (manifest.base[skinKey]) {
    return manifest.base[skinKey];
  }

  /*
   * Always fall back to skin 1 if an invalid skin was supplied.
   */
  if (manifest.base["1"]) {
    return manifest.base["1"];
  }

  const firstSkin = Object.keys(manifest.base)[0];

  if (firstSkin) {
    return manifest.base[firstSkin];
  }

  throw new Error("Renderer manifest contains no base characters.");
}

/*
 * --------------------------------------------------------------------------
 * Render one character
 * --------------------------------------------------------------------------
 */

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

  const base = getBaseData(manifest, skin);

  if (!base.frames || base.frames.length === 0) {
    throw new Error(`Skin ${skin} contains no base frames.`);
  }

  const baseFrameIndex = Math.max(
    0,
    Math.min(frame, base.frames.length - 1)
  );

  const basePath = base.frames[baseFrameIndex];

  const baseImage = await loadImage(
    joinUrl(baseUrl, basePath)
  );

  const width = baseImage.naturalWidth || baseImage.width;
  const height = baseImage.naturalHeight || baseImage.height;

  if (!width || !height) {
    throw new Error("Base character image has invalid dimensions.");
  }

  /*
   * Work at the native 57x56 render resolution, then scale the final
   * canvas. This keeps all layers perfectly aligned.
   */
  const nativeCanvas = createCanvas(width, height);
  const nativeContext = nativeCanvas.getContext("2d");

  if (!nativeContext) {
    throw new Error("Unable to create renderer canvas.");
  }

  nativeContext.imageSmoothingEnabled = false;

  /*
   * Base character first.
   */
  drawImage(
    nativeContext,
    baseImage,
    width,
    height
  );

  /*
   * Chroma-key cleanup on the base.
   */
  removeChromaKey(
    nativeContext,
    width,
    height
  );

  /*
   * Render cosmetics in the correct stacking order.
   */
  for (const slot of LAYER_ORDER) {
    const cosmeticId = cosmetics[slot];

    if (!cosmeticId) {
      continue;
    }

    const cosmetic = manifest.cosmetics?.[cosmeticId];

    if (!cosmetic) {
      continue;
    }

    /*
     * Ignore cosmetics accidentally assigned to the wrong slot.
     */
    if (cosmetic.slot !== slot) {
      continue;
    }

    let cosmeticImage: HTMLImageElement;

    try {
      cosmeticImage = await loadCosmeticImage(
        cosmetic,
        frame,
        baseUrl
      );
    } catch (error) {
      /*
       * One broken cosmetic should not prevent the rest of the character
       * from rendering.
       */
      console.warn(
        `[Renderer] Could not load ${slot} cosmetic "${cosmetic.name ?? cosmeticId}"`,
        error
      );

      continue;
    }

    /*
     * Draw the cosmetic into a temporary canvas so chroma removal and
     * tinting do not affect the layers underneath it.
     */
    const layerCanvas = createCanvas(
      width,
      height
    );

    const layerContext =
      layerCanvas.getContext("2d");

    if (!layerContext) {
      continue;
    }

    layerContext.imageSmoothingEnabled = false;

    drawImage(
      layerContext,
      cosmeticImage,
      width,
      height
    );

    /*
     * Remove magenta chroma-key pixels.
     */
    removeChromaKey(
      layerContext,
      width,
      height
    );

    /*
     * Apply tint only to slots that support coloring.
     */
    const tint = tints[slot as keyof CosmeticTints];

    if (tint) {
      applyTint(
        layerContext,
        width,
        height,
        tint
      );
    }

    /*
     * Composite this layer over the character.
     */
    nativeContext.drawImage(
      layerCanvas,
      0,
      0
    );
  }

  /*
   * ------------------------------------------------------------------------
   * Final scaled canvas
   * ------------------------------------------------------------------------
   */

  const safeScale =
    Number.isFinite(scale) && scale > 0
      ? scale
      : 1;

  const finalWidth = Math.round(
    width * safeScale
  );

  const finalHeight = Math.round(
    height * safeScale
  );

  const finalCanvas = createCanvas(
    finalWidth,
    finalHeight
  );

  const finalContext =
    finalCanvas.getContext("2d");

  if (!finalContext) {
    throw new Error(
      "Unable to create final renderer canvas."
    );
  }

  finalContext.imageSmoothingEnabled = false;

  finalContext.drawImage(
    nativeCanvas,
    0,
    0,
    finalWidth,
    finalHeight
  );

  return finalCanvas;
}

/*
 * --------------------------------------------------------------------------
 * Data URL helper
 * --------------------------------------------------------------------------
 */

export async function renderCharacterToDataUrl(
  options: RenderOptions
): Promise<string> {
  const canvas =
    await renderCharacter(options);

  return canvas.toDataURL("image/png");
}

/*
 * --------------------------------------------------------------------------
 * Convenience helper
 * --------------------------------------------------------------------------
 */

export async function renderCharacterToImage(
  options: RenderOptions
): Promise<HTMLImageElement> {
  const dataUrl =
    await renderCharacterToDataUrl(options);

  return loadImage(dataUrl);
}