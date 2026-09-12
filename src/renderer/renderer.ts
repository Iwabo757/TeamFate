// src/renderer/renderer.ts

export type CosmeticSlot =
  | "hair"
  | "eyes"
  | "hat"
  | "top"
  | "bottom"
  | "shoes"
  | "back"
  | "accessory"
  | "held"
  | "face"
  | "glasses"
  | "unknown";

export type Cosmetic = {
  name: string;
  slot: CosmeticSlot;
  layer: string;
  icon: string;
  layer_index: number;
  icon_index: number;
  slot_code: number;

  // Directional / animation frames.
  frames?: string[];

  // Optional cosmetic tint definitions.
  tints?: Record<string, string>;
};

export type RenderDirection = "front" | "side" | "back";

export type RenderOptions = {
  baseUrl?: string;

  /**
   * Base character frame.
   *
   * The Team Fate base renderer uses:
   * 0 = front
   * 1 = back
   * 2 = side
   */
  frame?: number;

  direction?: RenderDirection;

  scale?: number;

  width?: number;
  height?: number;

  cosmetics?: Partial<Record<CosmeticSlot, string>>;

  /**
   * Optional cosmetic tint overrides.
   *
   * Example:
   * {
   *   hair: "#6b4226",
   *   top: "#ffffff"
   * }
   */
  tints?: Partial<Record<CosmeticSlot, string>>;

  /**
   * Optional direct cosmetic data.
   *
   * If supplied, this takes priority over looking cosmetics
   * up from the manifest.
   */
  cosmeticData?: Partial<Record<CosmeticSlot, Cosmetic>>;

  /**
   * Optional base image path.
   */
  base?: string;

  /**
   * Disable chroma-key cleanup if needed.
   */
  chromaKey?: boolean;
};

export type RendererManifest = {
  cosmetics?: Cosmetic[];
  [key: string]: unknown;
};

const CANVAS_WIDTH = 57;
const CANVAS_HEIGHT = 56;

/**
 * PokeMMO's sprite assets use this magenta as a transparent
 * chroma-key color in some cosmetic resources.
 */
const CHROMA_R = 255;
const CHROMA_G = 20;
const CHROMA_B = 147;

const LAYER_ORDER: CosmeticSlot[] = [
  "back",
  "shoes",
  "bottom",
  "top",
  "accessory",
  "held",
  "face",
  "eyes",
  "glasses",
  "hair",
  "hat",
];

const DEFAULT_DIRECTION_FRAME: Record<RenderDirection, number> = {
  front: 0,
  back: 1,
  side: 2,
};

/**
 * Some manifest exports may use slightly different slot names.
 * Normalize them here so the renderer stays compatible.
 */
function normalizeSlot(slot: string): CosmeticSlot {
  const value = String(slot || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  switch (value) {
    case "hair":
    case "hairstyle":
      return "hair";

    case "eyes":
    case "eye":
      return "eyes";

    case "hat":
    case "head":
    case "headwear":
      return "hat";

    case "top":
    case "shirt":
    case "upper":
    case "upperbody":
      return "top";

    case "bottom":
    case "pants":
    case "trousers":
    case "lower":
    case "lowerbody":
      return "bottom";

    case "shoes":
    case "shoe":
    case "footwear":
      return "shoes";

    case "back":
    case "backitem":
    case "backpack":
      return "back";

    case "accessory":
    case "accessories":
      return "accessory";

    case "held":
    case "helditem":
      return "held";

    case "face":
    case "facial":
      return "face";

    case "glasses":
    case "eyewear":
      return "glasses";

    default:
      return "unknown";
  }
}

/**
 * Normalize a manifest cosmetic so old and new manifest formats
 * can both be rendered.
 */
function normalizeCosmetic(raw: any): Cosmetic {
  return {
    name: String(raw?.name ?? ""),
    slot: normalizeSlot(raw?.slot ?? "unknown"),
    layer: String(raw?.layer ?? ""),
    icon: String(raw?.icon ?? ""),
    layer_index: Number(raw?.layer_index ?? 0),
    icon_index: Number(raw?.icon_index ?? 0),
    slot_code: Number(raw?.slot_code ?? 0),

    frames: Array.isArray(raw?.frames)
      ? raw.frames
          .filter((value: unknown) => typeof value === "string")
          .map((value: string) => value)
      : undefined,

    tints:
      raw?.tints && typeof raw.tints === "object"
        ? { ...raw.tints }
        : undefined,
  };
}

/**
 * Browser image loader.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error(`Failed to load renderer image: ${src}`));
    };

    image.src = src;
  });
}

/**
 * Makes a URL safe for both Vite and Vercel deployments.
 */
function joinUrl(baseUrl: string, file: string): string {
  if (!file) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(file)) {
    return file;
  }

  if (file.startsWith("/")) {
    return file;
  }

  const base = baseUrl.replace(/\/+$/, "");
  const path = file.replace(/^\/+/, "");

  return `${base}/${path}`;
}

/**
 * Removes PokeMMO's magenta chroma-key pixels.
 *
 * Some cosmetics contain actual opaque RGB(255,20,147)
 * pixels rather than transparent pixels.
 */
function removeChromaKey(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (
      a > 0 &&
      r === CHROMA_R &&
      g === CHROMA_G &&
      b === CHROMA_B
    ) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Removes chroma key from an individual layer before compositing.
 *
 * This prevents magenta from contaminating the layers below it.
 */
async function loadCleanImage(
  src: string,
  chromaKey: boolean,
): Promise<HTMLImageElement> {
  const image = await loadImage(src);

  if (!chromaKey) {
    return image;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return image;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);

  removeChromaKey(ctx, canvas.width, canvas.height);

  const cleaned = new Image();

  return new Promise((resolve, reject) => {
    cleaned.onload = () => resolve(cleaned);

    cleaned.onerror = () => {
      reject(new Error(`Failed to create cleaned image: ${src}`));
    };

    cleaned.src = canvas.toDataURL("image/png");
  });
}

/**
 * Returns the direction requested by the builder.
 *
 * If the caller supplies a frame directly, that frame wins.
 */
function getDirectionFrame(
  direction?: RenderDirection,
  frame?: number,
): number {
  if (typeof frame === "number" && Number.isFinite(frame)) {
    return frame;
  }

  if (direction) {
    return DEFAULT_DIRECTION_FRAME[direction];
  }

  return 0;
}

/**
 * IMPORTANT:
 *
 * Cosmetic frame order in the extracted PokeMMO resources is:
 *
 *   frame 0 = FRONT
 *   frame 1 = BACK
 *   frame 2 = SIDE
 *
 * Do NOT use character animation frames such as 15 or 30 here.
 *
 * The long frame arrays in the cosmetic manifest contain animation
 * resources and are not a simple 1:1 replacement for the base
 * character's animation timeline.
 */
function getCosmeticFramePath(
  cosmetic: Cosmetic,
  directionFrame: number,
): string {
  const frames = cosmetic.frames;

  if (!frames || frames.length === 0) {
    return cosmetic.layer;
  }

  /*
   * Static directional resources.
   *
   * Front = 0
   * Back  = 1
   * Side  = 2
   */
  if (directionFrame === 0) {
    return frames[0] ?? cosmetic.layer;
  }

  if (directionFrame === 1) {
    return frames[1] ?? frames[0] ?? cosmetic.layer;
  }

  if (directionFrame === 2) {
    return frames[2] ?? frames[1] ?? frames[0] ?? cosmetic.layer;
  }

  /*
   * If somebody explicitly requests an animation frame,
   * use it when it exists.
   */
  if (
    directionFrame >= 0 &&
    directionFrame < frames.length
  ) {
    return frames[directionFrame];
  }

  return frames[0] ?? cosmetic.layer;
}

/**
 * Finds a cosmetic by name.
 */
function findCosmetic(
  cosmetics: Cosmetic[],
  slot: CosmeticSlot,
  name: string,
): Cosmetic | undefined {
  if (!name) {
    return undefined;
  }

  const target = String(name).trim().toLowerCase();

  return cosmetics.find((cosmetic) => {
    if (cosmetic.slot !== slot) {
      return false;
    }

    return cosmetic.name.trim().toLowerCase() === target;
  });
}

/**
 * Loads and normalizes a manifest.
 *
 * Supports:
 *
 * {
 *   cosmetics: [...]
 * }
 *
 * and also a direct array:
 *
 * [...]
 */
async function loadManifest(
  baseUrl: string,
): Promise<Cosmetic[]> {
  const url = joinUrl(baseUrl, "manifest.json");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to load renderer manifest (${response.status}): ${url}`,
    );
  }

  const json = await response.json();

  const records = Array.isArray(json)
    ? json
    : Array.isArray(json?.cosmetics)
      ? json.cosmetics
      : [];

  return records
    .map(normalizeCosmetic)
    .filter((cosmetic) => cosmetic.name.length > 0);
}

/**
 * Some older builder data can contain the same cosmetic under
 * a slightly different slot name.
 */
function buildCosmeticLookup(
  cosmetics: Cosmetic[],
): Map<string, Cosmetic> {
  const lookup = new Map<string, Cosmetic>();

  for (const cosmetic of cosmetics) {
    const key = `${cosmetic.slot}:${cosmetic.name
      .trim()
      .toLowerCase()}`;

    lookup.set(key, cosmetic);
  }

  return lookup;
}

/**
 * Resolve the requested cosmetics.
 */
function resolveCosmetics(
  selected: Partial<Record<CosmeticSlot, string>>,
  manifest: Cosmetic[],
  directData?: Partial<Record<CosmeticSlot, Cosmetic>>,
): Partial<Record<CosmeticSlot, Cosmetic>> {
  const result: Partial<Record<CosmeticSlot, Cosmetic>> = {};

  const lookup = buildCosmeticLookup(manifest);

  for (const slot of LAYER_ORDER) {
    const direct = directData?.[slot];

    if (direct) {
      result[slot] = normalizeCosmetic(direct);
      continue;
    }

    const selectedName = selected?.[slot];

    if (!selectedName) {
      continue;
    }

    const key = `${slot}:${String(selectedName)
      .trim()
      .toLowerCase()}`;

    const cosmetic = lookup.get(key);

    if (cosmetic) {
      result[slot] = cosmetic;
      continue;
    }

    /*
     * Fallback in case the manifest slot differs from the
     * builder slot.
     */
    const fallback = findCosmetic(
      manifest,
      slot,
      String(selectedName),
    );

    if (fallback) {
      result[slot] = fallback;
    }
  }

  return result;
}

/**
 * Returns whether this cosmetic should be hidden from the
 * back-facing character.
 *
 * Face/eye layers are intentionally not drawn on the back.
 */
function shouldDrawCosmetic(
  cosmetic: Cosmetic,
  directionFrame: number,
): boolean {
  if (directionFrame !== 1) {
    return true;
  }

  switch (cosmetic.slot) {
    case "eyes":
    case "face":
    case "glasses":
      return false;

    default:
      return true;
  }
}

/**
 * Apply a solid tint to the visible pixels of a cosmetic.
 *
 * This preserves alpha while replacing the RGB values.
 */
function applyTint(
  image: HTMLImageElement,
  tint: string,
): HTMLImageElement {
  const canvas = document.createElement("canvas");

  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return image;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const data = imageData.data;

  const tintCanvas = document.createElement("canvas");
  tintCanvas.width = 1;
  tintCanvas.height = 1;

  const tintCtx = tintCanvas.getContext("2d");

  if (!tintCtx) {
    return image;
  }

  tintCtx.fillStyle = tint;
  tintCtx.fillRect(0, 0, 1, 1);

  const tintData = tintCtx.getImageData(0, 0, 1, 1).data;

  const tr = tintData[0];
  const tg = tintData[1];
  const tb = tintData[2];

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];

    if (alpha === 0) {
      continue;
    }

    /*
     * Multiply the original sprite shading against the tint.
     * This keeps highlights and shadows intact.
     */
    data[i] = Math.round((data[i] * tr) / 255);
    data[i + 1] = Math.round((data[i + 1] * tg) / 255);
    data[i + 2] = Math.round((data[i + 2] * tb) / 255);
  }

  ctx.putImageData(imageData, 0, 0);

  const output = new Image();

  output.src = canvas.toDataURL("image/png");

  return output;
}

/**
 * Draw an image centered on the renderer canvas.
 */
function drawCentered(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  const x = Math.floor((width - sourceWidth) / 2);
  const y = Math.floor((height - sourceHeight) / 2);

  ctx.drawImage(image, x, y);
}

/**
 * Main renderer.
 *
 * Returns a PNG data URL.
 */
export async function renderCharacterToDataUrl(
  options: RenderOptions = {},
): Promise<string> {
  const {
    baseUrl = "/team-fate-renderer",
    direction = "front",
    frame,
    scale = 1,
    width = CANVAS_WIDTH,
    height = CANVAS_HEIGHT,
    cosmetics = {},
    cosmeticData,
    base,
    tints = {},
    chromaKey = true,
  } = options;

  const directionFrame = getDirectionFrame(
    direction,
    frame,
  );

  /*
   * Load manifest unless direct cosmetic data is being used.
   */
  let manifest: Cosmetic[] = [];

  if (!cosmeticData) {
    manifest = await loadManifest(baseUrl);
  } else {
    /*
     * Still load the manifest when selected names are present.
     */
    const hasSelections = Object.values(cosmetics).some(Boolean);

    if (hasSelections) {
      manifest = await loadManifest(baseUrl);
    }
  }

  const resolved = resolveCosmetics(
    cosmetics,
    manifest,
    cosmeticData,
  );

  /*
   * Base character.
   *
   * The base files are:
   *
   * base/skin_1/frame_0.png
   * base/skin_1/frame_1.png
   * ...
   */
  const basePath =
    base ??
    `base/skin_1/frame_${directionFrame}.png`;

  const baseImage = await loadCleanImage(
    joinUrl(baseUrl, basePath),
    chromaKey,
  );

  const finalWidth = Math.max(
    1,
    Math.round(width * scale),
  );

  const finalHeight = Math.max(
    1,
    Math.round(height * scale),
  );

  const canvas = document.createElement("canvas");

  canvas.width = finalWidth;
  canvas.height = finalHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create renderer canvas.");
  }

  ctx.imageSmoothingEnabled = false;

  /*
   * Draw base first.
   */
  if (scale === 1) {
    drawCentered(
      ctx,
      baseImage,
      finalWidth,
      finalHeight,
    );
  } else {
    const baseWidth =
      baseImage.naturalWidth || baseImage.width;

    const baseHeight =
      baseImage.naturalHeight || baseImage.height;

    const drawWidth = Math.round(baseWidth * scale);
    const drawHeight = Math.round(baseHeight * scale);

    const x = Math.floor(
      (finalWidth - drawWidth) / 2,
    );

    const y = Math.floor(
      (finalHeight - drawHeight) / 2,
    );

    ctx.drawImage(
      baseImage,
      x,
      y,
      drawWidth,
      drawHeight,
    );
  }

  /*
   * Draw cosmetics in the correct layer order.
   */
  for (const slot of LAYER_ORDER) {
    const cosmetic = resolved[slot];

    if (!cosmetic) {
      continue;
    }

    if (
      !shouldDrawCosmetic(
        cosmetic,
        directionFrame,
      )
    ) {
      continue;
    }

    const cosmeticPath = getCosmeticFramePath(
      cosmetic,
      directionFrame,
    );

    if (!cosmeticPath) {
      continue;
    }

    let layer = await loadCleanImage(
      joinUrl(baseUrl, cosmeticPath),
      chromaKey,
    );

    /*
     * Tint priority:
     *
     * 1. Renderer options
     * 2. Cosmetic's own tint
     */
    const requestedTint =
      tints?.[slot] ??
      cosmetic.tints?.default ??
      undefined;

    if (requestedTint) {
      layer = applyTint(
        layer,
        requestedTint,
      );
    }

    if (scale === 1) {
      drawCentered(
        ctx,
        layer,
        finalWidth,
        finalHeight,
      );
    } else {
      const layerWidth =
        layer.naturalWidth || layer.width;

      const layerHeight =
        layer.naturalHeight || layer.height;

      const drawWidth = Math.round(
        layerWidth * scale,
      );

      const drawHeight = Math.round(
        layerHeight * scale,
      );

      const x = Math.floor(
        (finalWidth - drawWidth) / 2,
      );

      const y = Math.floor(
        (finalHeight - drawHeight) / 2,
      );

      ctx.drawImage(
        layer,
        x,
        y,
        drawWidth,
        drawHeight,
      );
    }
  }

  return canvas.toDataURL(
    "image/png",
  );
}

/**
 * Convenience wrapper for rendering a specific direction.
 */
export async function renderCharacter(
  direction: RenderDirection,
  options: Omit<
    RenderOptions,
    "direction"
  > = {},
): Promise<string> {
  return renderCharacterToDataUrl({
    ...options,
    direction,
  });
}

/**
 * Convenience helpers.
 */
export async function renderFront(
  options: Omit<
    RenderOptions,
    "direction" | "frame"
  > = {},
): Promise<string> {
  return renderCharacterToDataUrl({
    ...options,
    direction: "front",
    frame: 0,
  });
}

export async function renderSide(
  options: Omit<
    RenderOptions,
    "direction" | "frame"
  > = {},
): Promise<string> {
  return renderCharacterToDataUrl({
    ...options,
    direction: "side",
    frame: 2,
  });
}

export async function renderBack(
  options: Omit<
    RenderOptions,
    "direction" | "frame"
  > = {},
): Promise<string> {
  return renderCharacterToDataUrl({
    ...options,
    direction: "back",
    frame: 1,
  });
}

export default renderCharacterToDataUrl;