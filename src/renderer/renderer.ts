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

  /*
   * Directional/action frames.
   *
   * 0 = front
   * 1 = back
   * 2 = side
   * 3 = opposite side
   * 4 = additional/action pose
   */
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

  cosmetics: Record<
    string,
    Cosmetic
  >;
};

type RenderOptions = {
  manifest: RendererManifest;

  baseUrl?: string;

  skin?: number;

  /*
   * Base-character frame.
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

const imageCache =
  new Map<
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
   HEX → RGB
   ========================================================= */

function hexToRgb(
  hex: string
) {
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

        image.onload =
          () => {
            resolve(image);
          };

        image.onerror =
          () => {
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
   TINT IMAGE
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

  const rgb =
    hexToRgb(color);

  if (!rgb) {
    return canvas;
  }

  const imageData =
    ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

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

    if (alpha === 0) {
      continue;
    }

    /*
     * Preserve dark pixel outlines.
     */
    if (
      Math.max(
        r,
        g,
        b
      ) <= 45
    ) {
      continue;
    }

    /*
     * Preserve the original
     * shading of the cosmetic.
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
   DRAW
   ========================================================= */

function draw(
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
     BASE FRAME
     ------------------------------------------------------- */

  const basePath =
    skinData.frames[
      frame
    ];

  if (!basePath) {
    throw new Error(
      `Invalid base frame: ${frame}`
    );
  }

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

  draw(
    ctx,
    base,
    scale
  );

  /* -------------------------------------------------------
     COSMETICS
     ------------------------------------------------------- */

  for (
    const slot of LAYER_ORDER
  ) {
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
     * Make sure the cosmetic is
     * actually assigned to this slot.
     */
    if (
      cosmetic.slot !==
      slot
    ) {
      continue;
    }

    /*
     * THIS IS THE IMPORTANT FIX.
     *
     * Previously we always used:
     *
     * cosmetic.layer
     *
     * which is frame 0.
     *
     * Now each cosmetic gets its
     * matching directional frame.
     */
    const cosmeticPath =
      cosmetic.frames?.[
        frame
      ] ??
      cosmetic.layer;

    if (!cosmeticPath) {
      continue;
    }

    const layer =
      await loadImage(
        `${cleanBaseUrl}/${cosmeticPath}`
      );

    const tint =
      tints[slot];

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

      draw(
        ctx,
        tinted,
        scale
      );
    } else {
      draw(
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