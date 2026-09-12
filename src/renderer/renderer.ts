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
 * Slots that support color tinting.
 */
const COLORABLE_SLOTS = new Set<CosmeticSlot>([
  "hair",
  "top",
  "pants",
  "shoes",
  "back",
  "hat",
]);

/*
 * Image loader with caching.
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
 * Load the renderer manifest.
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
 * Convert hex color to RGB.
 */
function hexToRgb(
  hex: string
): {
  r: number;
  g: number;
  b: number;
} | null {
  let value = hex
    .replace("#", "")
    .trim();

  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }

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
 * Tint a cosmetic while preserving:
 *
 * - transparency
 * - black/dark outlines
 * - original brightness/shading
 *
 * This intentionally does NOT require the source
 * pixels to be mathematically grayscale.
 *
 * PokeMMO artwork uses slightly blue/gray palette
 * colors, so a strict grayscale test causes valid
 * hair/clothing pixels to be skipped.
 */
function tintImage(
  image: HTMLImageElement,
  color: string
): HTMLCanvasElement {
  const canvas =
    document.createElement("canvas");

  canvas.width =
    image.naturalWidth;

  canvas.height =
    image.naturalHeight;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Canvas 2D unavailable while tinting."
    );
  }

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    image,
    0,
    0
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

  const data =
    imageData.data;

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
     * Transparent pixel.
     */
    if (alpha === 0) {
      continue;
    }

    /*
     * Preserve dark outlines.
     *
     * This keeps the pixel-art outline intact
     * instead of turning the outline into the
     * selected color.
     */
    const darkest =
      Math.max(r, g, b);

    if (darkest <= 45) {
      continue;
    }

    /*
     * Calculate original brightness.
     *
     * This is what keeps highlights and shadows
     * from becoming one flat color.
     */
    const luminance =
      0.299 * r +
      0.587 * g +
      0.114 * b;

    const brightness =
      Math.max(
        0.18,
        luminance / 255
      );

    /*
     * Apply selected color while retaining
     * the original brightness.
     */
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
 * Draw a layer at native 57x56 size,
 * scaled for the preview.
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
 * Render the complete character.
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

  const cleanBaseUrl =
    baseUrl.replace(/\/$/, "");

  /*
   * Get selected skin.
   */
  const skinData =
    manifest.base[`skin_${skin}`];

  if (!skinData) {
    throw new Error(
      `Invalid skin: ${skin}`
    );
  }

  /*
   * Get selected frame.
   */
  const basePath =
    skinData.frames[frame];

  if (!basePath) {
    throw new Error(
      `Invalid frame: ${frame}`
    );
  }

  /*
   * Create canvas.
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
      `${cleanBaseUrl}/${basePath}`
    );

  drawLayer(
    ctx,
    base,
    scale
  );

  /*
   * Draw cosmetics in order.
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

    if (
      !cosmetic ||
      cosmetic.slot !== slot
    ) {
      continue;
    }

    const layer =
      await loadImage(
        `${cleanBaseUrl}/${cosmetic.layer}`
      );

    const tint =
      tints[slot];

    /*
     * Apply tint when this slot is colorable
     * and a color has been selected.
     */
    if (
      tint &&
      COLORABLE_SLOTS.has(slot)
    ) {
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
       * Original artwork.
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
 * Render directly to PNG data URL.
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