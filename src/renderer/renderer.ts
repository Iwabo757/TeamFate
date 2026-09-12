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

/*
 * Cosmetic stacking order.
 *
 * Lower layers are drawn first.
 */
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
 * PokeMMO chroma-key color found in some extracted assets.
 */
const CHROMA_R = 255;
const CHROMA_G = 20;
const CHROMA_B = 147;

const CHROMA_TOLERANCE = 8;

/*
 * ============================================================
 * URL HELPERS
 * ============================================================
 */

function joinUrl(
  baseUrl: string,
  path: string
): string {
  if (!path) {
    return "";
  }

  if (
    /^https?:\/\//i.test(path) ||
    path.startsWith("/")
  ) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(
    /^\/+/,
    ""
  )}`;
}

/*
 * ============================================================
 * MANIFEST
 * ============================================================
 */

let manifestPromise:
  | Promise<RendererManifest>
  | null = null;

export async function loadRendererManifest(
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RendererManifest> {
  if (!manifestPromise) {
    const url = joinUrl(
      baseUrl,
      "manifest.json"
    );

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
 * ============================================================
 * IMAGE LOADING
 * ============================================================
 */

function loadImage(
  url: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(
          new Error(
            `Failed to load image: ${url}`
          )
        );
      };

      image.src = url;
    }
  );
}

/*
 * ============================================================
 * COSMETIC IMAGE
 * ============================================================
 *
 * IMPORTANT:
 *
 * The cosmetic's normal layer.png is used for every view.
 *
 * The BASE CHARACTER frame determines whether the character
 * is facing Front, Side, or Back.
 *
 * The __frame_N files are animation frames and are NOT used
 * for the static three-view preview.
 */

async function loadCosmeticImage(
  cosmetic: Cosmetic,
  baseUrl: string
): Promise<HTMLImageElement> {
  if (!cosmetic.layer) {
    throw new Error(
      `Cosmetic has no layer: ${
        cosmetic.name ?? "Unknown"
      }`
    );
  }

  const url = joinUrl(
    baseUrl,
    cosmetic.layer
  );

  return loadImage(url);
}

/*
 * ============================================================
 * CANVAS HELPERS
 * ============================================================
 */

function createCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas =
    document.createElement("canvas");

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

/*
 * ============================================================
 * CHROMA KEY
 * ============================================================
 */

function removeChromaKey(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData =
    context.getImageData(
      0,
      0,
      width,
      height
    );

  const data = imageData.data;

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const matchesChroma =
      Math.abs(r - CHROMA_R) <=
        CHROMA_TOLERANCE &&
      Math.abs(g - CHROMA_G) <=
        CHROMA_TOLERANCE &&
      Math.abs(b - CHROMA_B) <=
        CHROMA_TOLERANCE;

    if (matchesChroma) {
      data[i + 3] = 0;
    }
  }

  context.putImageData(
    imageData,
    0,
    0
  );
}

/*
 * ============================================================
 * COLOR HELPERS
 * ============================================================
 */

function hexToRgb(
  color: string
): {
  r: number;
  g: number;
  b: number;
} | null {
  const value = color
    .trim()
    .replace("#", "");

  if (value.length !== 6) {
    return null;
  }

  const number =
    Number.parseInt(value, 16);

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
 * ============================================================
 * TINTING
 * ============================================================
 *
 * Preserves sprite brightness/shading while applying the
 * selected color.
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

  const imageData =
    context.getImageData(
      0,
      0,
      width,
      height
    );

  const data = imageData.data;

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    const alpha = data[i + 3];

    if (alpha === 0) {
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luminance =
      0.2126 * r +
      0.7152 * g +
      0.0722 * b;

    const factor =
      luminance / 255;

    data[i] = Math.min(
      255,
      Math.round(
        rgb.r * factor
      )
    );

    data[i + 1] = Math.min(
      255,
      Math.round(
        rgb.g * factor
      )
    );

    data[i + 2] = Math.min(
      255,
      Math.round(
        rgb.b * factor
      )
    );
  }

  context.putImageData(
    imageData,
    0,
    0
  );
}

/*
 * ============================================================
 * BASE CHARACTER
 * ============================================================
 */

function getBaseData(
  manifest: RendererManifest,
  skin: number
): {
  frames: string[];
  previews: string[];
} {
  const skinKey = String(skin);

  /*
   * Requested skin.
   */
  if (manifest.base[skinKey]) {
    return manifest.base[skinKey];
  }

  /*
   * Safe fallback to skin 1.
   */
  if (manifest.base["1"]) {
    return manifest.base["1"];
  }

  /*
   * Final fallback to the first available skin.
   */
  const firstSkin =
    Object.keys(manifest.base)[0];

  if (firstSkin) {
    return manifest.base[firstSkin];
  }

  throw new Error(
    "Renderer manifest contains no base characters."
  );
}

/*
 * ============================================================
 * RENDER CHARACTER
 * ============================================================
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

  /*
   * ----------------------------------------------------------
   * BASE
   * ----------------------------------------------------------
   */

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

  /*
   * frame comes directly from CosmeticBuilder:
   *
   * Front = 0
   * Side  = 2
   * Back  = 1
   *
   * We use that frame directly from the base character.
   */

  const baseFrameIndex = Math.max(
    0,
    Math.min(
      frame,
      base.frames.length - 1
    )
  );

  const basePath =
    base.frames[
      baseFrameIndex
    ];

  if (!basePath) {
    throw new Error(
      `Base frame ${baseFrameIndex} does not exist for skin ${skin}.`
    );
  }

  const baseImage =
    await loadImage(
      joinUrl(
        baseUrl,
        basePath
      )
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

  /*
   * ----------------------------------------------------------
   * NATIVE CANVAS
   * ----------------------------------------------------------
   */

  const nativeCanvas =
    createCanvas(
      width,
      height
    );

  const nativeContext =
    nativeCanvas.getContext(
      "2d"
    );

  if (!nativeContext) {
    throw new Error(
      "Unable to create renderer canvas."
    );
  }

  nativeContext.imageSmoothingEnabled =
    false;

  /*
   * ----------------------------------------------------------
   * DRAW BASE
   * ----------------------------------------------------------
   */

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

  /*
   * ----------------------------------------------------------
   * DRAW COSMETICS
   * ----------------------------------------------------------
   */

  for (
    const slot of LAYER_ORDER
  ) {
    const cosmeticId =
      cosmetics[slot];

    if (!cosmeticId) {
      continue;
    }

    const cosmetic =
      manifest.cosmetics?.[
        cosmeticId
      ];

    if (!cosmetic) {
      console.warn(
        `[Renderer] Cosmetic "${cosmeticId}" was not found in manifest.`
      );

      continue;
    }

    /*
     * Make sure the selected cosmetic belongs
     * to the slot currently being rendered.
     */
    if (
      cosmetic.slot !== slot
    ) {
      console.warn(
        `[Renderer] Cosmetic "${cosmeticId}" has slot "${cosmetic.slot}" but was assigned to "${slot}".`
      );

      continue;
    }

    let cosmeticImage:
      HTMLImageElement;

    try {
      cosmeticImage =
        await loadCosmeticImage(
          cosmetic,
          baseUrl
        );
    } catch (error) {
      /*
       * Don't destroy the whole character because
       * one optional cosmetic failed.
       */
      console.warn(
        `[Renderer] Could not load ${slot} cosmetic "${cosmetic.name ?? cosmeticId}".`,
        error
      );

      continue;
    }

    /*
     * --------------------------------------------------------
     * TEMPORARY COSMETIC CANVAS
     * --------------------------------------------------------
     *
     * This allows chroma removal and tinting without modifying
     * any pixels belonging to the character or other layers.
     */

    const layerCanvas =
      createCanvas(
        width,
        height
      );

    const layerContext =
      layerCanvas.getContext(
        "2d"
      );

    if (!layerContext) {
      continue;
    }

    layerContext.imageSmoothingEnabled =
      false;

    /*
     * Draw cosmetic.
     */
    drawImage(
      layerContext,
      cosmeticImage,
      width,
      height
    );

    /*
     * Remove PokeMMO magenta background.
     */
    removeChromaKey(
      layerContext,
      width,
      height
    );

    /*
     * Apply color if this slot has a tint.
     */
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

    /*
     * Composite cosmetic onto character.
     */
    nativeContext.drawImage(
      layerCanvas,
      0,
      0
    );
  }

  /*
   * ----------------------------------------------------------
   * FINAL SCALE
   * ----------------------------------------------------------
   */

  const safeScale =
    Number.isFinite(scale) &&
    scale > 0
      ? scale
      : 1;

  const finalWidth =
    Math.round(
      width * safeScale
    );

  const finalHeight =
    Math.round(
      height * safeScale
    );

  const finalCanvas =
    createCanvas(
      finalWidth,
      finalHeight
    );

  const finalContext =
    finalCanvas.getContext(
      "2d"
    );

  if (!finalContext) {
    throw new Error(
      "Unable to create final renderer canvas."
    );
  }

  /*
   * Pixel-art rendering.
   */
  finalContext.imageSmoothingEnabled =
    false;

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
 * ============================================================
 * DATA URL
 * ============================================================
 */

export async function renderCharacterToDataUrl(
  options: RenderOptions
): Promise<string> {
  const canvas =
    await renderCharacter(
      options
    );

  return canvas.toDataURL(
    "image/png"
  );
}

/*
 * ============================================================
 * IMAGE HELPER
 * ============================================================
 */

export async function renderCharacterToImage(
  options: RenderOptions
): Promise<HTMLImageElement> {
  const dataUrl =
    await renderCharacterToDataUrl(
      options
    );

  return loadImage(dataUrl);
}