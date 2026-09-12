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

type RenderOptions = {
  manifest: RendererManifest;
  baseUrl?: string;
  skin?: number;
  frame?: number;
  cosmetics?: Partial<
    Record<CosmeticSlot, string>
  >;
  tints?: Partial<
    Record<CosmeticSlot, string>
  >;
  scale?: number;
};

const imageCache = new Map<
  string,
  Promise<HTMLImageElement>
>();

/*
 * Rendering order.
 *
 * Lower layers are drawn first.
 * Higher layers are drawn on top.
 */
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

/*
 * Load and cache an image.
 */
export async function loadImage(
  src: string
): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);

  if (cached) {
    return cached;
  }

  const promise =
    new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const img = new Image();

        img.decoding = "async";

        img.onload = () => {
          resolve(img);
        };

        img.onerror = () => {
          reject(
            new Error(
              `Failed to load image: ${src}`
            )
          );
        };

        img.src = src;
      }
    );

  imageCache.set(src, promise);

  try {
    return await promise;
  } catch (error) {
    imageCache.delete(src);
    throw error;
  }
}

/*
 * Load renderer manifest.
 */
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

/*
 * Convert a hex color to RGB.
 */
function hexToRgb(
  hex: string
): {
  r: number;
  g: number;
  b: number;
} | null {
  const clean = hex
    .replace("#", "")
    .trim();

  if (
    clean.length !== 6 &&
    clean.length !== 3
  ) {
    return null;
  }

  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;

  const value = Number.parseInt(
    expanded,
    16
  );

  if (!Number.isFinite(value)) {
    return null;
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/*
 * Determine whether a pixel is grayscale.
 *
 * PokeMMO's tintable artwork contains grayscale
 * pixels while many cosmetics have already-colored
 * artwork. We only recolor pixels that are sufficiently
 * grayscale.
 */
function isGrayscale(
  r: number,
  g: number,
  b: number
): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  return max - min <= 12;
}

/*
 * Apply a tint to grayscale artwork.
 *
 * The brightness of the original pixel is preserved,
 * which keeps highlights and shadows.
 *
 * Very dark pixels are left alone so black outlines
 * remain black.
 */
function tintImage(
  image: HTMLImageElement,
  color: string
): HTMLCanvasElement {
  const canvas =
    document.createElement("canvas");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Canvas 2D unavailable while tinting."
    );
  }

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    image,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const imageData =
    ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  const rgb = hexToRgb(color);

  if (!rgb) {
    return canvas;
  }

  const data = imageData.data;

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];

    /*
     * Ignore transparent pixels.
     */
    if (alpha === 0) {
      continue;
    }

    /*
     * Leave colored artwork untouched.
     */
    if (!isGrayscale(r, g, b)) {
      continue;
    }

    /*
     * Preserve very dark outlines.
     */
    if (
      r <= 22 &&
      g <= 22 &&
      b <= 22
    ) {
      continue;
    }

    /*
     * Calculate perceived brightness.
     */
    const luminance =
      0.299 * r +
      0.587 * g +
      0.114 * b;

    /*
     * Convert the original grayscale brightness
     * into a multiplier for the selected color.
     */
    const brightness =
      luminance / 255;

    data[i] = Math.min(
      255,
      Math.round(
        rgb.r * brightness
      )
    );

    data[i + 1] = Math.min(
      255,
      Math.round(
        rgb.g * brightness
      )
    );

    data[i + 2] = Math.min(
      255,
      Math.round(
        rgb.b * brightness
      )
    );
  }

  ctx.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

/*
 * Draw an image at the renderer's native size.
 */
function drawLayer(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  scale: number
) {
  ctx.drawImage(
    image,
    0,
    0,
    57 * scale,
    56 * scale
  );
}

/*
 * Render a complete character.
 */
export async function renderCharacter(
  opts: RenderOptions
): Promise<HTMLCanvasElement> {
  const {
    manifest,
    skin = 1,
    frame = 0,
    cosmetics = {},
    tints = {},
    scale = 1,
  } = opts;

  const baseUrl =
    (opts.baseUrl ?? "").replace(
      /\/$/,
      ""
    );

  /*
   * Find skin.
   */
  const skinData =
    manifest.base[`skin_${skin}`];

  if (!skinData) {
    throw new Error(
      `Invalid skin: ${skin}`
    );
  }

  /*
   * Find animation frame.
   */
  const basePath =
    skinData.frames[frame];

  if (!basePath) {
    throw new Error(
      `Invalid frame: ${frame}`
    );
  }

  /*
   * Create final canvas.
   */
  const canvas =
    document.createElement("canvas");

  canvas.width =
    57 * scale;

  canvas.height =
    56 * scale;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Canvas 2D unavailable"
    );
  }

  ctx.imageSmoothingEnabled = false;

  /*
   * Draw base character.
   */
  const base =
    await loadImage(
      `${baseUrl}/${basePath}`
    );

  drawLayer(
    ctx,
    base,
    scale
  );

  /*
   * Draw each cosmetic in order.
   */
  for (
    const slot of LAYER_ORDER
  ) {
    const name =
      cosmetics[slot];

    if (!name) {
      continue;
    }

    const cosmetic =
      manifest.cosmetics[name];

    /*
     * Ignore invalid/mismatched entries.
     */
    if (
      !cosmetic ||
      cosmetic.slot !== slot
    ) {
      continue;
    }

    const layer =
      await loadImage(
        `${baseUrl}/${cosmetic.layer}`
      );

    /*
     * If this slot has a selected color,
     * tint its grayscale artwork.
     */
    const tint =
      tints[slot];

    if (tint) {
      const tinted =
        tintImage(
          layer,
          tint
        );

      drawLayer(
        ctx,
        tinted,
        scale
      );
    } else {
      /*
       * No tint selected:
       * draw original artwork.
       */
      drawLayer(
        ctx,
        layer,
        scale
      );
    }
  }

  return canvas;
}

/*
 * Render character directly to PNG data URL.
 */
export async function renderCharacterToDataUrl(
  opts: RenderOptions
): Promise<string> {
  const canvas =
    await renderCharacter(opts);

  return canvas.toDataURL(
    "image/png"
  );
}