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

/* =========================================================
   CONSTANTS
========================================================= */

const ASSET_ROOT = "/team-fate-renderer";

const CHARACTER_WIDTH = 57;
const CHARACTER_HEIGHT = 56;

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
  const cached = imageCache.get(src);

  if (cached) {
    return cached;
  }

  const promise =
    new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const image = new Image();

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
  const response = await fetch(url);

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
  return `${baseUrl.replace(/\/+$/, "")}/${cleanPath(
    relativePath
  )}`;
}

function slugify(
  value: string
): string {
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
  cosmetic: Cosmetic
): string[] {
  const paths: string[] = [];

  /*
   * Use the manifest path first.
   */
  if (cosmetic.layer) {
    paths.push(
      cleanPath(cosmetic.layer)
    );
  }

  const id = String(
    cosmetic.layer_index
  ).padStart(5, "0");

  const name = slugify(
    cosmetic.name
  );

  /*
   * Current extracted format.
   */
  paths.push(
    `cosmetics/${cosmetic.slot}/${name}__${id}_layer.png`
  );

  /*
   * Older extracted format.
   */
  paths.push(
    `cosmetics/${cosmetic.slot}/${id}_layer.png`
  );

  /*
   * Resource-index fallback.
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
  baseUrl: string
): Promise<HTMLImageElement | null> {
  const paths =
    getCosmeticPaths(cosmetic);

  for (const path of paths) {
    const url =
      makeAssetUrl(
        baseUrl,
        path
      );

    try {
      const image =
        await loadImage(url);

      console.log(
        `[Local Renderer] Loaded ${cosmetic.name}: ${url}`
      );

      return image;
    } catch {
      /*
       * Try the next filename.
       */
    }
  }

  console.warn(
    `[Local Renderer] Could not load ${cosmetic.name}`,
    paths
  );

  /*
   * IMPORTANT:
   *
   * A missing cosmetic no longer
   * destroys the entire character.
   */
  return null;
}

/* =========================================================
   RENDER CHARACTER
========================================================= */

export async function renderCharacter(
  opts: {
    manifest: RendererManifest;
    baseUrl?: string;
    skin?: number;
    frame?: number;
    cosmetics?: Partial<
      Record<CosmeticSlot, string>
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

  if (
    !Number.isFinite(scale) ||
    scale <= 0
  ) {
    throw new Error(
      `Invalid scale: ${scale}`
    );
  }

  /* =======================================================
     SKIN
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
     FRAME
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
     CANVAS
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

  ctx.imageSmoothingEnabled =
    false;

  /* =======================================================
     BASE
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

    const cosmetic =
      manifest.cosmetics[
        cosmeticName
      ];

    if (!cosmetic) {
      console.warn(
        `[Local Renderer] Unknown cosmetic: ${cosmeticName}`
      );

      continue;
    }

    if (
      cosmetic.slot !== slot
    ) {
      console.warn(
        `[Local Renderer] Slot mismatch for ${cosmetic.name}: ` +
          `expected ${slot}, got ${cosmetic.slot}`
      );

      continue;
    }

    const layer =
      await loadCosmetic(
        cosmetic,
        baseUrl
      );

    /*
     * Missing layer?
     *
     * Skip it instead of killing
     * the entire preview.
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