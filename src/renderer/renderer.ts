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

  const promise = new Promise<HTMLImageElement>(
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

  return (await response.json()) as RendererManifest;
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
   HELPERS
========================================================= */

function normalizeBaseUrl(
  baseUrl?: string
): string {
  const value =
    baseUrl && baseUrl.trim().length > 0
      ? baseUrl
      : "/team-fate-renderer";

  return value.replace(/\/+$/, "");
}

function normalizeAssetPath(
  path: string
): string {
  return path
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function slugifyName(
  name: string
): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
}

/* =========================================================
   COSMETIC PATH RESOLUTION
========================================================= */

function getCosmeticPathCandidates(
  cosmetic: Cosmetic
): string[] {
  const candidates: string[] = [];

  /*
   * 1. Exact path supplied by the manifest.
   */
  if (cosmetic.layer) {
    candidates.push(
      normalizeAssetPath(
        cosmetic.layer
      )
    );
  }

  /*
   * The extracted Team Fate assets use:
   *
   * cosmetics/pants/pants__03504_layer.png
   *
   * cosmetics/hat/acorn_hat__17120_layer.png
   */
  const slug = slugifyName(
    cosmetic.name
  );

  const id = String(
    cosmetic.layer_index
  ).padStart(5, "0");

  candidates.push(
    `cosmetics/${cosmetic.slot}/${slug}__${id}_layer.png`
  );

  /*
   * Compatibility with the older naming format:
   *
   * cosmetics/pants/03504_layer.png
   */
  candidates.push(
    `cosmetics/${cosmetic.slot}/${id}_layer.png`
  );

  return [...new Set(candidates)];
}

/* =========================================================
   LOAD COSMETIC LAYER
========================================================= */

async function loadCosmeticLayer(
  cosmetic: Cosmetic,
  baseUrl: string
): Promise<HTMLImageElement> {
  const candidates =
    getCosmeticPathCandidates(
      cosmetic
    );

  for (
    const relativePath of candidates
  ) {
    const src =
      `${baseUrl}/${relativePath}`;

    try {
      return await loadImage(src);
    } catch {
      /*
       * Try the next possible filename.
       */
    }
  }

  throw new Error(
    `Failed to load cosmetic layer "${cosmetic.name}". ` +
      `Tried: ${candidates
        .map(
          (path) =>
            `${baseUrl}/${path}`
        )
        .join(", ")}`
  );
}

/* =========================================================
   CHARACTER RENDERER
========================================================= */

export async function renderCharacter(
  opts: {
    manifest: RendererManifest;

    /*
     * Defaults to:
     *
     * /team-fate-renderer
     */
    baseUrl?: string;

    /*
     * Skin 1-5.
     */
    skin?: number;

    /*
     * Animation frame.
     */
    frame?: number;

    /*
     * Equipped cosmetics.
     */
    cosmetics?: Partial<
      Record<
        CosmeticSlot,
        string
      >
    >;

    /*
     * Pixel scaling.
     */
    scale?: number;
  }
): Promise<HTMLCanvasElement> {
  const {
    manifest,

    /*
     * IMPORTANT:
     *
     * The renderer must load assets from
     * /team-fate-renderer rather than the
     * website root.
     */
    baseUrl =
      "/team-fate-renderer",

    skin = 1,

    frame = 0,

    cosmetics = {},

    scale = 1,
  } = opts;

  const assetRoot =
    normalizeBaseUrl(
      baseUrl
    );

  /* =======================================================
     VALIDATE SCALE
  ======================================================= */

  if (
    !Number.isFinite(scale) ||
    scale <= 0
  ) {
    throw new Error(
      `Invalid renderer scale: ${scale}`
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
      `Invalid skin: ${skin}`
    );
  }

  /* =======================================================
     VALIDATE FRAME
  ======================================================= */

  if (
    !Number.isInteger(frame) ||
    frame < 0 ||
    frame >=
      skinData.frames.length
  ) {
    throw new Error(
      `Invalid frame ${frame}. ` +
        `Skin ${skin} contains ` +
        `${skinData.frames.length} frames.`
    );
  }

  const basePath =
    normalizeAssetPath(
      skinData.frames[frame]
    );

  if (!basePath) {
    throw new Error(
      `No base frame found for skin ${skin}, frame ${frame}.`
    );
  }

  /* =======================================================
     CANVAS
  ======================================================= */

  const width =
    57 * scale;

  const height =
    56 * scale;

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
      "Canvas 2D context unavailable."
    );
  }

  /*
   * Preserve pixel-art edges.
   */
  ctx.imageSmoothingEnabled =
    false;

  /* =======================================================
     BASE CHARACTER
  ======================================================= */

  const baseImage =
    await loadImage(
      `${assetRoot}/${basePath}`
    );

  ctx.drawImage(
    baseImage,
    0,
    0,
    width,
    height
  );

  /* =======================================================
     COSMETIC LAYERS
  ======================================================= */

  for (
    const slot of LAYER_ORDER
  ) {
    const cosmeticName =
      cosmetics[slot];

    /*
     * No cosmetic equipped.
     */
    if (!cosmeticName) {
      continue;
    }

    const cosmetic =
      manifest.cosmetics[
        cosmeticName
      ];

    /*
     * Cosmetic doesn't exist
     * in the local manifest.
     */
    if (!cosmetic) {
      console.warn(
        `[Renderer] Cosmetic not found: ${cosmeticName}`
      );

      continue;
    }

    /*
     * Prevent an incorrectly assigned
     * cosmetic from being rendered.
     */
    if (
      cosmetic.slot !== slot
    ) {
      console.warn(
        `[Renderer] Slot mismatch: ` +
          `${cosmetic.name} is ${cosmetic.slot}, ` +
          `but was requested as ${slot}.`
      );

      continue;
    }

    /*
     * Load the actual local layer.
     */
    const layer =
      await loadCosmeticLayer(
        cosmetic,
        assetRoot
      );

    /*
     * All extracted cosmetic layers
     * are already positioned for the
     * 57x56 character canvas.
     */
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
   RENDER → DATA URL
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