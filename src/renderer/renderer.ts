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

  cosmetics: Record<
    string,
    Cosmetic
  >;
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
   BACK-ONLY RULES
   =========================================================

   Eyes and face artwork is front-facing artwork.

   The base character itself contains the correct
   back-facing body/head when frame 1 is used.

   Therefore we must NOT draw front facial layers
   on the back view.
   ========================================================= */

const HIDDEN_ON_BACK: CosmeticSlot[] = [
  "eyes",
  "face",
];

/* =========================================================
   IMAGE LOADING
   ========================================================= */

export async function loadImage(
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
  url = "/team-fate-renderer/manifest.json"
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
   HEX → RGB
   ========================================================= */

function hexToRgb(
  hex: string
): {
  r: number;
  g: number;
  b: number;
} | null {
  let value =
    hex
      .replace("#", "")
      .trim();

  if (value.length === 3) {
    value =
      value
        .split("")
        .map(
          (char) =>
            char + char
        )
        .join("");
  }

  if (value.length !== 6) {
    return null;
  }

  const number =
    Number.parseInt(
      value,
      16
    );

  if (!Number.isFinite(number)) {
    return null;
  }

  return {
    r:
      (number >> 16) &
      255,

    g:
      (number >> 8) &
      255,

    b:
      number & 255,
  };
}

/* =========================================================
   TINT COSMETIC
   ========================================================= */

function tintImage(
  image: HTMLImageElement,
  color: string
): HTMLCanvasElement {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    image.naturalWidth;

  canvas.height =
    image.naturalHeight;

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Canvas 2D unavailable while tinting."
    );
  }

  ctx.imageSmoothingEnabled =
    false;

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

  const rgb =
    hexToRgb(color);

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
    const r =
      data[i];

    const g =
      data[i + 1];

    const b =
      data[i + 2];

    const alpha =
      data[i + 3];

    /*
     * Transparent.
     */
    if (alpha === 0) {
      continue;
    }

    /*
     * Keep black/dark outlines.
     */
    const darkest =
      Math.max(
        r,
        g,
        b
      );

    if (darkest <= 45) {
      continue;
    }

    /*
     * Preserve original shading.
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
    imageData,
    0,
    0
  );

  return canvas;
}

/* =========================================================
   DRAW LAYER
   ========================================================= */

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

  /* -------------------------------------------------------
     SKIN
     ------------------------------------------------------- */

  const skinData =
    manifest.base[
      `skin_${skin}`
    ];

  if (!skinData) {
    throw new Error(
      `Invalid skin: ${skin}`
    );
  }

  /* -------------------------------------------------------
     FRAME
     ------------------------------------------------------- */

  const basePath =
    skinData.frames[
      frame
    ];

  if (!basePath) {
    throw new Error(
      `Invalid frame: ${frame}`
    );
  }

  /*
   * Frame 1 is the actual back-facing pose.
   */
  const isBackView =
    frame === 1;

  /* -------------------------------------------------------
     CANVAS
     ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     BASE CHARACTER
     ------------------------------------------------------- */

  const base =
    await loadImage(
      `${cleanBaseUrl}/${basePath}`
    );

  drawLayer(
    ctx,
    base,
    scale
  );

  /* -------------------------------------------------------
     COSMETIC LAYERS
     ------------------------------------------------------- */

  for (
    const slot of LAYER_ORDER
  ) {
    /*
     * Skip facial layers on the back.
     */
    if (
      isBackView &&
      HIDDEN_ON_BACK.includes(
        slot
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
      manifest.cosmetics[
        name
      ];

    if (!cosmetic) {
      continue;
    }

    /*
     * Protect against a cosmetic being assigned
     * to the wrong slot.
     */
    if (
      cosmetic.slot !==
      slot
    ) {
      continue;
    }

    const layerPath =
      `${cleanBaseUrl}/${cosmetic.layer}`;

    const layer =
      await loadImage(
        layerPath
      );

    const tint =
      tints[slot];

    /*
     * Apply tint only to slots that support it.
     */
    if (
      tint &&
      COLORABLE_SLOTS.has(
        slot
      )
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
      drawLayer(
        ctx,
        layer,
        scale
      );
    }
  }

  return canvas;
}

/* =========================================================
   RENDER → DATA URL
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