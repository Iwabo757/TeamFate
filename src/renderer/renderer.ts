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
  name?: string;
  slot: CosmeticSlot;
  layer: string;
  icon: string;
  layer_index: number;
  icon_index: number;
  slot_code: number;
  frames?: string[];
};

export type RendererManifest = {
  format_version: number;
  source_pak_sha256?: string;

  base: Record<
    string,
    {
      frames: string[];
      previews: string[];
    }
  >;

  slot_codes?: Record<string, string>;

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

/* =========================================================
   LAYER ORDER
   ========================================================= */

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

/* =========================================================
   COLORABLE SLOTS
   ========================================================= */

const COLORABLE_SLOTS =
  new Set<CosmeticSlot>([
    "hair",
    "top",
    "pants",
    "shoes",
    "back",
    "hat",
  ]);

/* =========================================================
   HEX COLOR
   ========================================================= */

function hexToRgb(hex: string) {
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

/* =========================================================
   LOAD IMAGE
   ========================================================= */

async function loadImage(
  src: string
): Promise<HTMLImageElement> {
  const cached =
    imageCache.get(src);

  if (cached) {
    return cached;
  }

  const promise =
    new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const image =
          new Image();

        image.decoding =
          "async";

        image.onload = () => {
          resolve(image);
        };

        image.onerror = () => {
          reject(
            new Error(
              `Failed to load image: ${src}`
            )
          );
        };

        image.src = src;
      }
    );

  imageCache.set(
    src,
    promise
  );

  try {
    return await promise;
  } catch (error) {
    imageCache.delete(src);
    throw error;
  }
}

/* =========================================================
   LOAD MANIFEST
   ========================================================= */

export async function loadRendererManifest(
  url =
    "/team-fate-renderer/manifest.json"
): Promise<RendererManifest> {
  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Renderer manifest returned ${response.status}`
    );
  }

  return response.json() as Promise<RendererManifest>;
}

/* =========================================================
   REMOVE POKEMMO CHROMA KEY
   ========================================================= */

function removeChromaKey(
  image: HTMLImageElement
): HTMLCanvasElement {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    image.naturalWidth;

  canvas.height =
    image.naturalHeight;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Canvas 2D unavailable."
    );
  }

  context.imageSmoothingEnabled =
    false;

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.drawImage(
    image,
    0,
    0
  );

  const imageData =
    context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  const pixels =
    imageData.data;

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const red =
      pixels[index];

    const green =
      pixels[index + 1];

    const blue =
      pixels[index + 2];

    /*
     * PokeMMO magenta transparency color.
     *
     * Use a tight range so legitimate
     * cosmetic colors are not removed.
     */
    if (
      red >= 245 &&
      green >= 10 &&
      green <= 35 &&
      blue >= 135 &&
      blue <= 165
    ) {
      pixels[index + 3] = 0;
    }
  }

  context.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

/* =========================================================
   TINT IMAGE
   ========================================================= */

function tintImage(
  image: CanvasImageSource,
  color: string
): HTMLCanvasElement {
  const canvas =
    document.createElement(
      "canvas"
    );

  const width =
    image instanceof HTMLImageElement
      ? image.naturalWidth
      : 57;

  const height =
    image instanceof HTMLImageElement
      ? image.naturalHeight
      : 56;

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Canvas 2D unavailable while tinting."
    );
  }

  context.imageSmoothingEnabled =
    false;

  context.drawImage(
    image,
    0,
    0
  );

  const rgb =
    hexToRgb(color);

  if (!rgb) {
    return canvas;
  }

  const imageData =
    context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  const pixels =
    imageData.data;

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const red =
      pixels[index];

    const green =
      pixels[index + 1];

    const blue =
      pixels[index + 2];

    const alpha =
      pixels[index + 3];

    if (alpha === 0) {
      continue;
    }

    /*
     * Keep dark outlines/shadows intact.
     */
    if (
      Math.max(
        red,
        green,
        blue
      ) <= 45
    ) {
      continue;
    }

    const luminance =
      0.299 * red +
      0.587 * green +
      0.114 * blue;

    const brightness =
      Math.max(
        0.18,
        luminance / 255
      );

    pixels[index] =
      Math.min(
        255,
        Math.round(
          rgb.r * brightness
        )
      );

    pixels[index + 1] =
      Math.min(
        255,
        Math.round(
          rgb.g * brightness
        )
      );

    pixels[index + 2] =
      Math.min(
        255,
        Math.round(
          rgb.b * brightness
        )
      );
  }

  context.putImageData(
    imageData,
    0,
    0
  );

  return canvas;
}

/* =========================================================
   DRAW
   ========================================================= */

function drawLayer(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  scale: number
) {
  context.drawImage(
    image,
    0,
    0,
    57 * scale,
    56 * scale
  );
}

/* =========================================================
   COSMETIC FRAME SELECTION
   ========================================================= */

/*
 * Preview frame mapping:
 *
 * Character:
 *   0 = Front
 *   1 = Back
 *   2 = Side
 *
 * Cosmetic directional arrays:
 *   0 = Front
 *   1 = Back
 *   2 = Side
 *
 * For cosmetics with fewer frames:
 *   - 1 frame  = use it everywhere
 *   - 2 frames = front + secondary
 *   - 3+       = front/back/side
 */

function getCosmeticFramePath(
  cosmetic: Cosmetic,
  characterFrame: number
): string {
  const frames =
    cosmetic.frames;

  /*
   * No directional frames.
   */
  if (
    !frames ||
    frames.length === 0
  ) {
    return cosmetic.layer;
  }

  /*
   * FRONT
   */
  if (characterFrame === 0) {
    return (
      frames[0] ??
      cosmetic.layer
    );
  }

  /*
   * BACK
   */
  if (characterFrame === 1) {
    if (frames.length >= 2) {
      return frames[1];
    }

    return frames[0];
  }

  /*
   * SIDE
   */
  if (characterFrame === 2) {
    if (frames.length >= 3) {
      return frames[2];
    }

    if (frames.length >= 2) {
      return frames[1];
    }

    return frames[0];
  }

  /*
   * Unknown character frame.
   *
   * If the cosmetic contains that
   * animation frame, use it.
   */
  if (
    characterFrame >= 0 &&
    characterFrame < frames.length
  ) {
    return frames[
      characterFrame
    ];
  }

  return frames[0];
}

/* =========================================================
   RENDER CHARACTER
   ========================================================= */

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
    baseUrl.replace(
      /\/$/,
      ""
    );

  /* =======================================================
     BASE
     ======================================================= */

  const skinData =
    manifest.base[
      `skin_${skin}`
    ];

  if (!skinData) {
    throw new Error(
      `Invalid skin: ${skin}`
    );
  }

  const basePath =
    skinData.frames[frame];

  if (!basePath) {
    throw new Error(
      `Invalid base frame: ${frame}`
    );
  }

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    57 * scale;

  canvas.height =
    56 * scale;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Canvas 2D unavailable."
    );
  }

  context.imageSmoothingEnabled =
    false;

  /*
   * Draw base character.
   */
  const base =
    await loadImage(
      `${cleanBaseUrl}/${basePath}`
    );

  drawLayer(
    context,
    base,
    scale
  );

  /* =======================================================
     COSMETICS
     ======================================================= */

  for (
    const slot of LAYER_ORDER
  ) {
    const cosmeticName =
      cosmetics[slot];

    if (!cosmeticName) {
      continue;
    }

    /*
     * Eyes and face are front/side
     * elements and should not appear
     * on the back of the character.
     */
    if (
      frame === 1 &&
      (
        slot === "eyes" ||
        slot === "face"
      )
    ) {
      continue;
    }

    const cosmetic =
      manifest.cosmetics[
        cosmeticName
      ];

    if (!cosmetic) {
      continue;
    }

    if (
      cosmetic.slot !== slot
    ) {
      continue;
    }

    /*
     * Get the correct directional
     * cosmetic image.
     */
    const cosmeticPath =
      getCosmeticFramePath(
        cosmetic,
        frame
      );

    if (!cosmeticPath) {
      continue;
    }

    const loadedImage =
      await loadImage(
        `${cleanBaseUrl}/${cosmeticPath}`
      );

    /*
     * Remove PokeMMO magenta
     * transparency pixels.
     */
    const cleanedImage =
      removeChromaKey(
        loadedImage
      );

    /*
     * Apply selected color only
     * to supported cosmetic slots.
     */
    const tint =
      tints[slot];

    if (
      tint &&
      COLORABLE_SLOTS.has(slot)
    ) {
      const tinted =
        tintImage(
          cleanedImage,
          tint
        );

      drawLayer(
        context,
        tinted,
        scale
      );
    } else {
      drawLayer(
        context,
        cleanedImage,
        scale
      );
    }
  }

  return canvas;
}

/* =========================================================
   RENDER TO DATA URL
   ========================================================= */

export async function renderCharacterToDataUrl(
  opts: RenderOptions
): Promise<string> {
  const canvas =
    await renderCharacter(
      opts
    );

  return canvas.toDataURL(
    "image/png"
  );
}