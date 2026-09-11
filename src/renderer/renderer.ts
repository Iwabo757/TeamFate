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

/* =========================================================
   CONSTANTS
========================================================= */

const ASSET_ROOT =
  "/team-fate-renderer";

const CHARACTER_WIDTH = 57;
const CHARACTER_HEIGHT = 56;

/*
 * Draw order.
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

        image.decoding = "async";

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
  url = `${ASSET_ROOT}/manifest.json`
): Promise<RendererManifest> {
  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Renderer manifest returned ${response.status}`
    );
  }

  const manifest =
    (await response.json()) as RendererManifest;

  if (!manifest.base) {
    throw new Error(
      "Renderer manifest has no base data."
    );
  }

  if (!manifest.cosmetics) {
    throw new Error(
      "Renderer manifest has no cosmetics."
    );
  }

  return manifest;
}

/* =========================================================
   PATH HELPERS
========================================================= */

function cleanPath(
  path: string
): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function makeAssetUrl(
  baseUrl: string,
  relativePath: string
): string {
  return (
    `${baseUrl.replace(
      /\/+$/,
      ""
    )}/${cleanPath(relativePath)}`
  );
}

/*
 * IMPORTANT:
 *
 * Manifest records are not guaranteed to
 * contain their own name property.
 *
 * Therefore this accepts unknown values
 * safely instead of calling toLowerCase()
 * on undefined.
 */
function slugify(
  value: unknown
): string {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
}

/* =========================================================
   COSMETIC PATHS
========================================================= */

function getCosmeticPaths(
  cosmetic: Cosmetic,
  cosmeticKey: string
): string[] {
  const paths: string[] = [];

  /*
   * 1. Exact manifest path.
   *
   * This is always preferred.
   */
  if (
    typeof cosmetic.layer ===
      "string" &&
    cosmetic.layer.length > 0
  ) {
    paths.push(
      cleanPath(
        cosmetic.layer
      )
    );
  }

  const id =
    String(
      cosmetic.layer_index
    ).padStart(5, "0");

  /*
   * Use the manifest key when the
   * record itself doesn't contain name.
   */
  const name =
    slugify(
      cosmetic.name ??
        cosmeticKey
    );

  /*
   * Current extracted format:
   *
   * cosmetics/pants/
   * pants__03504_layer.png
   */
  if (name) {
    paths.push(
      `cosmetics/${cosmetic.slot}/${name}__${id}_layer.png`
    );
  }

  /*
   * Older format:
   *
   * cosmetics/pants/
   * 03504_layer.png
   */
  paths.push(
    `cosmetics/${cosmetic.slot}/${id}_layer.png`
  );

  /*
   * Simple resource-index fallback.
   */
  paths.push(
    `cosmetics/${cosmetic.slot}/${cosmetic.layer_index}_layer.png`
  );

  return [
    ...new Set(paths),
  ];
}

/* =========================================================
   LOAD COSMETIC
========================================================= */

async function loadCosmetic(
  cosmetic: Cosmetic,
  cosmeticKey: string,
  baseUrl: string
): Promise<HTMLImageElement | null> {
  const paths =
    getCosmeticPaths(
      cosmetic,
      cosmeticKey
    );

  for (
    const path of paths
  ) {
    const url =
      makeAssetUrl(
        baseUrl,
        path
      );

    try {
      const image =
        await loadImage(url);

      console.log(
        `[Local Renderer] Loaded ${cosmeticKey}: ${url}`
      );

      return image;
    } catch {
      /*
       * Try the next candidate.
       */
    }
  }

  console.warn(
    `[Local Renderer] Could not load ${cosmeticKey}`,
    paths
  );

  /*
   * Never let one missing cosmetic
   * destroy the entire character.
   */
  return null;
}

/* =========================================================
   CHARACTER RENDERER
========================================================= */

export async function renderCharacter(
  opts: {
    manifest: RendererManifest;
    baseUrl?: string;
    skin?: number;
    frame?: number;
    cosmetics?: Partial<
      Record<
        CosmeticSlot,
        string
      >
    >;
    scale?: number;
  }
): Promise<HTMLCanvasElement> {
  const {
    manifest,
    baseUrl = ASSET_ROOT,
    skin = 1,
    frame = 0,
    cosmetics = {},
    scale = 1,
  } = opts;

  /* =======================================================
     VALIDATE SCALE
  ======================================================= */

  if (
    !Number.isFinite(scale) ||
    scale <= 0
  ) {
    throw new Error(
      `Invalid scale: ${scale}`
    );
  }

  /* =======================================================
     FIND SKIN
  ======================================================= */

  const skinKey =
    `skin_${skin}`;

  const skinData =
    manifest.base[skinKey];

  if (!skinData) {
    throw new Error(
      `Skin ${skin} does not exist.`
    );
  }

  /* =======================================================
     FIND FRAME
  ======================================================= */

  if (
    !Number.isInteger(frame) ||
    frame < 0 ||
    frame >=
      skinData.frames.length
  ) {
    throw new Error(
      `Frame ${frame} does not exist for skin ${skin}.`
    );
  }

  const basePath =
    cleanPath(
      skinData.frames[frame]
    );

  if (!basePath) {
    throw new Error(
      `No base image for skin ${skin}, frame ${frame}.`
    );
  }

  /* =======================================================
     CREATE CANVAS
  ======================================================= */

  const width =
    CHARACTER_WIDTH * scale;

  const height =
    CHARACTER_HEIGHT * scale;

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Could not create canvas context."
    );
  }

  /*
   * Keep pixel art sharp.
   */
  ctx.imageSmoothingEnabled =
    false;

  /* =======================================================
     DRAW BASE
  ======================================================= */

  const baseUrlFull =
    makeAssetUrl(
      baseUrl,
      basePath
    );

  console.log(
    `[Local Renderer] Base: ${baseUrlFull}`
  );

  const base =
    await loadImage(
      baseUrlFull
    );

  ctx.drawImage(
    base,
    0,
    0,
    width,
    height
  );

  /* =======================================================
     DRAW COSMETICS
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
     * The cosmetics object is keyed
     * by cosmetic name.
     */
    const cosmetic =
      manifest.cosmetics[
        cosmeticName
      ];

    if (!cosmetic) {
      console.warn(
        `[Local Renderer] Cosmetic not found: ${cosmeticName}`
      );

      continue;
    }

    /*
     * Verify slot.
     */
    if (
      cosmetic.slot !== slot
    ) {
      console.warn(
        `[Local Renderer] Slot mismatch: ` +
          `${cosmeticName} is ${cosmetic.slot}, ` +
          `expected ${slot}`
      );

      continue;
    }

    const layer =
      await loadCosmetic(
        cosmetic,
        cosmeticName,
        baseUrl
      );

    /*
     * Missing layer is no longer fatal.
     */
    if (!layer) {
      continue;
    }

    ctx.drawImage(
      layer,
      0,
      0,
      width,
      height
    );
  }

  return canvas;
}

/* =========================================================
   DATA URL
========================================================= */

export async function renderCharacterToDataUrl(
  opts: Parameters<
    typeof renderCharacter
  >[0]
): Promise<string> {
  const canvas =
    await renderCharacter(
      opts
    );

  return canvas.toDataURL(
    "image/png"
  );
}