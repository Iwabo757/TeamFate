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
  name?: string;
  slot: CosmeticSlot;
  layer: string;
  icon: string;
  layer_index: number;
  icon_index: number;
  slot_code: number;

  // Directional / animation frames added to the local renderer.
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

export type RenderOptions = {
  manifest: RendererManifest;

  baseUrl?: string;

  skin?: number;

  /*
   * PokeMMO base character:
   *
   * 0 = Front
   * 1 = Back
   * 2 = Side
   */
  frame?: number;

  cosmetics?: Partial<
    Record<CosmeticSlot, string>
  >;

  tints?: Partial<
    Record<CosmeticSlot, string>
  >;

  scale?: number;
};


/* =========================================================
   IMAGE CACHE
   ========================================================= */

const imageCache = new Map<
  string,
  Promise<HTMLImageElement>
>();


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


/* =========================================================
   MANIFEST
   ========================================================= */

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
   COLOR HELPERS
   ========================================================= */

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
      .map((c) => c + c)
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
   CHROMA KEY
   ========================================================= */

/*
 * PokeMMO uses this magenta in some cosmetic assets:
 *
 * RGB:
 * 255, 20, 147
 *
 * Some files contain it as fully opaque pixels.
 * Those pixels must become transparent.
 */

const CHROMA_R = 255;
const CHROMA_G = 20;
const CHROMA_B = 147;


function removeChromaKey(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const pixels =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  const data = pixels.data;

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (
      r === CHROMA_R &&
      g === CHROMA_G &&
      b === CHROMA_B
    ) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(
    pixels,
    0,
    0
  );
}


/* =========================================================
   PREPARE IMAGE
   ========================================================= */

function prepareImage(
  image: HTMLImageElement,
  tint?: string
): HTMLCanvasElement {
  const width =
    image.naturalWidth ||
    image.width ||
    57;

  const height =
    image.naturalHeight ||
    image.height ||
    56;

  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Canvas 2D unavailable."
    );
  }

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    image,
    0,
    0
  );

  /*
   * Remove PokeMMO magenta transparency key
   * BEFORE applying color.
   */
  removeChromaKey(
    ctx,
    width,
    height
  );

  /*
   * Apply cosmetic tint.
   */
  if (tint) {
    const rgb =
      hexToRgb(tint);

    if (rgb) {
      const pixels =
        ctx.getImageData(
          0,
          0,
          width,
          height
        );

      const data =
        pixels.data;

      for (
        let i = 0;
        i < data.length;
        i += 4
      ) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a === 0) {
          continue;
        }

        /*
         * Keep the sprite's original shading.
         */
        if (
          Math.max(
            r,
            g,
            b
          ) <= 20
        ) {
          continue;
        }

        const luminance =
          0.299 * r +
          0.587 * g +
          0.114 * b;

        const brightness =
          Math.max(
            0.18,
            luminance / 255
          );

        data[i] =
          Math.min(
            255,
            Math.round(
              rgb.r *
                brightness
            )
          );

        data[i + 1] =
          Math.min(
            255,
            Math.round(
              rgb.g *
                brightness
            )
          );

        data[i + 2] =
          Math.min(
            255,
            Math.round(
              rgb.b *
                brightness
            )
          );
      }

      ctx.putImageData(
        pixels,
        0,
        0
      );
    }
  }

  return canvas;
}


/* =========================================================
   COSMETIC FRAME
   ========================================================= */

/*
 * Static directional cosmetic resources:
 *
 * 0 = Front
 * 1 = Back
 * 2 = Side
 *
 * Long cosmetic frame arrays can contain animation frames.
 * When the requested base frame exists, use that exact frame.
 *
 * This keeps compatibility with both:
 *
 * - 2/3/4-frame directional cosmetics
 * - longer animated cosmetics
 */

function getCosmeticFrameIndex(
  baseFrame: number,
  frameCount: number
): number {
  if (frameCount <= 0) {
    return 0;
  }

  /*
   * The three preview directions are:
   *
   * 0 = Front
   * 1 = Back
   * 2 = Side
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

  /*
   * For actual animation frames, use the matching
   * cosmetic frame when available.
   */
  if (
    baseFrame >= 0 &&
    baseFrame < frameCount
  ) {
    return baseFrame;
  }

  return 0;
}

/* =========================================================
   DRAW
   ========================================================= */

function draw(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  scale: number
): void {
  ctx.drawImage(
    image,
    0,
    0,
    57 * scale,
    56 * scale
  );
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
     SKIN
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


  /* =======================================================
     BASE FRAME
     ======================================================= */

  const baseFrame =
    skinData.frames[frame];

  if (!baseFrame) {
    throw new Error(
      `Invalid base frame: ${frame}`
    );
  }


  /* =======================================================
     CANVAS
     ======================================================= */

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    57 * scale;

  canvas.height =
    56 * scale;

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Canvas 2D unavailable."
    );
  }

  ctx.imageSmoothingEnabled =
    false;


  /* =======================================================
     BASE CHARACTER
     ======================================================= */

  const base =
    await loadImage(
      `${cleanBaseUrl}/${baseFrame}`
    );

  const baseCanvas =
    prepareImage(base);

  draw(
    ctx,
    baseCanvas,
    scale
  );


  /* =======================================================
     COSMETICS
     ======================================================= */

  for (
    const slot of LAYER_ORDER
  ) {
    /*
     * Face/eyes should not appear
     * on the back-facing character.
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

    const name =
      cosmetics[slot];

    if (!name) {
      continue;
    }

    const cosmetic =
      manifest.cosmetics[name];

    if (!cosmetic) {
      continue;
    }

    if (
      cosmetic.slot !== slot
    ) {
      continue;
    }


    /* =====================================================
       COSMETIC FRAMES
       ===================================================== */

let frames: string[];

if (
  cosmetic.frames &&
  cosmetic.frames.length > 0
) {
  frames = cosmetic.frames;
} else {
  /*
   * Older manifests only contain the original layer.
   *
   * Our directional asset patch stores additional frames
   * beside the original layer using:
   *
   *   layer.png
   *   __frame_1.png
   *   __frame_2.png
   *   __frame_3.png
   *   ...
   *
   * Build the first three directional paths automatically.
   */
  const layerPath = cosmetic.layer;

  const extensionIndex =
    layerPath.lastIndexOf(".");

  if (extensionIndex === -1) {
    frames = [layerPath];
  } else {
    const basePath =
      layerPath.substring(
        0,
        extensionIndex
      );

    const extension =
      layerPath.substring(
        extensionIndex
      );

    frames = [
      layerPath,
      `${basePath}__frame_1${extension}`,
      `${basePath}__frame_2${extension}`,
    ];
  }
}

    const cosmeticFrame =
      getCosmeticFrameIndex(
        frame,
        frames.length
      );

    const cosmeticPath =
      frames[
        cosmeticFrame
      ] ?? frames[0];

    if (!cosmeticPath) {
      continue;
    }


    /* =====================================================
       LOAD COSMETIC
       ===================================================== */

    const layer =
      await loadImage(
        `${cleanBaseUrl}/${cosmeticPath}`
      );


    /* =====================================================
       TINT
       ===================================================== */

    const tint =
      tints[slot];

    const prepared =
      tint &&
      COLORABLE_SLOTS.has(slot)
        ? prepareImage(
            layer,
            tint
          )
        : prepareImage(
            layer
          );


    /* =====================================================
       DRAW COSMETIC
       ===================================================== */

    draw(
      ctx,
      prepared,
      scale
    );
  }


  return canvas;
}


/* =========================================================
   DATA URL
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