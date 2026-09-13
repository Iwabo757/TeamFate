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
  id?: string;
  name?: string;
  slot: CosmeticSlot;
  layer: string;
  frames?: string[];
  icon?: string;
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

export type CosmeticTints = Partial<
  Record<
    "hair" | "top" | "pants" | "shoes" | "back" | "hat",
    string
  >
>;

export type RenderOptions = {
  manifest: RendererManifest;
  baseUrl?: string;
  skin?: number;
  frame?: number;
  cosmetics?: Partial<Record<CosmeticSlot, string>>;
  tints?: CosmeticTints;
  scale?: number;
};

const DEFAULT_BASE_URL = "/team-fate-renderer";

const DEFAULT_COSMETICS: Partial<Record<CosmeticSlot, string>> = {
  hair: "Default Hair",
  eyes: "Brown",
  top: "T-Shirt",
  pants: "Pants",
  shoes: "Shoes",
};

const LAYER_ORDER: CosmeticSlot[] = [
  "back",
  "pants",
  "shoes",
  "top",
  "face",
  "hair",
  "eyes",
  "held",
  "hat",
  "tool",
  "mount",
];

const CHROMA = {
  r: 255,
  g: 20,
  b: 147,
  tolerance: 8,
};

const DIRECTION_FRAME_LIMIT = 3;

type Direction = "back" | "side";

type DirectionalFrames = Partial<Record<Direction, number>>;

type SpriteSignature = {
  pixels: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

const directionCache = new Map<string, Promise<DirectionalFrames>>();

function joinUrl(baseUrl: string, path: string): string {
  if (!path) return "";

  if (/^https?:\/\//i.test(path) || path.startsWith("/")) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

let manifestPromise: Promise<RendererManifest> | null = null;

export async function loadRendererManifest(
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RendererManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(
      joinUrl(baseUrl, "manifest.json"),
      { cache: "no-cache" }
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load renderer manifest: ${response.status} ${response.statusText}`
        );
      }

      return (await response.json()) as RendererManifest;
    });
  }

  return manifestPromise;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    image.src = url;
  });
}

function createCanvas(
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
): void {
  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );
}

function removeChromaKey(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = context.getImageData(
    0,
    0,
    width,
    height
  );

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (
      Math.abs(r - CHROMA.r) <= CHROMA.tolerance &&
      Math.abs(g - CHROMA.g) <= CHROMA.tolerance &&
      Math.abs(b - CHROMA.b) <= CHROMA.tolerance
    ) {
      data[i + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
}

function getSpriteSignature(
  image: HTMLImageElement
): SpriteSignature {
  const width =
    image.naturalWidth ||
    image.width;

  const height =
    image.naturalHeight ||
    image.height;

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to inspect sprite.");
  }

  context.imageSmoothingEnabled = false;

  drawImage(
    context,
    image,
    width,
    height
  );

  removeChromaKey(
    context,
    width,
    height
  );

  const data = context.getImageData(
    0,
    0,
    width,
    height
  ).data;

  let pixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha =
        data[(y * width + x) * 4 + 3];

      if (alpha === 0) continue;

      pixels++;
      sumX += x;
      sumY += y;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (pixels === 0) {
    return {
      pixels: 0,
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  return {
    pixels,
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: sumX / pixels / width,
    centerY: sumY / pixels / height,
  };
}

function signatureDistance(
  candidate: SpriteSignature,
  reference: SpriteSignature
): number {
  if (
    candidate.pixels === 0 ||
    reference.pixels === 0
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const candidateArea =
    candidate.width *
    candidate.height;

  const referenceArea =
    reference.width *
    reference.height;

  const pixelRatio =
    Math.abs(
      Math.log(
        (candidate.pixels + 1) /
        (reference.pixels + 1)
      )
    );

  const widthRatio =
    Math.abs(
      Math.log(
        (candidate.width + 1) /
        (reference.width + 1)
      )
    );

  const heightRatio =
    Math.abs(
      Math.log(
        (candidate.height + 1) /
        (reference.height + 1)
      )
    );

  const areaRatio =
    Math.abs(
      Math.log(
        (candidateArea + 1) /
        (referenceArea + 1)
      )
    );

  const centerDistance =
    Math.hypot(
      candidate.centerX - reference.centerX,
      candidate.centerY - reference.centerY
    );

  const leftDistance =
    Math.abs(
      candidate.minX -
      reference.minX
    );

  const rightDistance =
    Math.abs(
      candidate.maxX -
      reference.maxX
    );

  const topDistance =
    Math.abs(
      candidate.minY -
      reference.minY
    );

  const bottomDistance =
    Math.abs(
      candidate.maxY -
      reference.maxY
    );

  const maxWidth = Math.max(
    candidate.width,
    reference.width,
    1
  );

  const maxHeight = Math.max(
    candidate.height,
    reference.height,
    1
  );

  return (
    pixelRatio * 2 +
    widthRatio * 1.5 +
    heightRatio * 1.5 +
    areaRatio +
    centerDistance * 4 +
    (leftDistance + rightDistance) /
      maxWidth +
    (topDistance + bottomDistance) /
      maxHeight
  );
}

function getCandidateFrameIndexes(
  frames: string[]
): number[] {
  const candidates: number[] = [];

  for (
    let index = 0;
    index < frames.length;
    index++
  ) {
    const path = frames[index];

    if (!path) continue;

    const match =
      path.match(/frame_(\d+)/i);

    if (!match) continue;

    const frameNumber =
      Number(match[1]);

    if (
      frameNumber >= 0 &&
      frameNumber < DIRECTION_FRAME_LIMIT
    ) {
      candidates.push(index);
    }
  }

  return candidates;
}

async function findDirectionalFrames(
  cosmetic: Cosmetic,
  baseFrames: string[],
  baseUrl: string
): Promise<DirectionalFrames> {
  const frames =
    cosmetic.frames ?? [];

  const candidates =
    getCandidateFrameIndexes(frames);

  if (candidates.length === 0) {
    return {};
  }

  /*
   * The base character is the reference:
   *   base frame 0 = Front
   *   base frame 1 = Back
   *   base frame 2 = Side
   *
   * Cosmetic frame numbering is NOT assumed to match.
   * We inspect cosmetic frames 0-2 and choose the two
   * whose sprite geometry most closely matches Back/Side.
   */

  const backImage =
    await loadImage(
      joinUrl(
        baseUrl,
        baseFrames[1]
      )
    );

  const sideImage =
    await loadImage(
      joinUrl(
        baseUrl,
        baseFrames[2]
      )
    );

  const backSignature =
    getSpriteSignature(backImage);

  const sideSignature =
    getSpriteSignature(sideImage);

  const candidateSignatures =
    await Promise.all(
      candidates.map(async (index) => {
        try {
          const image =
            await loadImage(
              joinUrl(
                baseUrl,
                frames[index]
              )
            );

          return {
            index,
            signature:
              getSpriteSignature(image),
          };
        } catch {
          return null;
        }
      })
    );

  const validCandidates =
    candidateSignatures.filter(
      (
        candidate
      ): candidate is {
        index: number;
        signature: SpriteSignature;
      } => candidate !== null
    );

  if (validCandidates.length === 0) {
    return {};
  }

  let bestBack:
    | { index: number; score: number }
    | null = null;

  let bestSide:
    | { index: number; score: number }
    | null = null;

  for (const candidate of validCandidates) {
    const backScore =
      signatureDistance(
        candidate.signature,
        backSignature
      );

    const sideScore =
      signatureDistance(
        candidate.signature,
        sideSignature
      );

    if (
      !bestBack ||
      backScore < bestBack.score
    ) {
      bestBack = {
        index: candidate.index,
        score: backScore,
      };
    }

    if (
      !bestSide ||
      sideScore < bestSide.score
    ) {
      bestSide = {
        index: candidate.index,
        score: sideScore,
      };
    }
  }

  const result: DirectionalFrames = {};

  /*
   * If the same frame is the closest match for both directions,
   * choose the second-best candidate for Side. This prevents one
   * frame from being used for both Back and Side.
   */
  if (
    bestBack &&
    bestSide &&
    bestBack.index === bestSide.index
  ) {
    const remaining =
      validCandidates.filter(
        (candidate) =>
          candidate.index !==
          bestBack!.index
      );

    if (remaining.length > 0) {
      remaining.sort(
        (a, b) =>
          signatureDistance(
            a.signature,
            sideSignature
          ) -
          signatureDistance(
            b.signature,
            sideSignature
          )
      );

      bestSide = {
        index: remaining[0].index,
        score:
          signatureDistance(
            remaining[0].signature,
            sideSignature
          ),
      };
    }
  }

  if (bestBack) {
    result.back = bestBack.index;
  }

  if (bestSide) {
    result.side = bestSide.index;
  }

  return result;
}

async function getDirectionalFrames(
  cosmetic: Cosmetic,
  baseFrames: string[],
  baseUrl: string
): Promise<DirectionalFrames> {
  const cacheKey =
    [
      baseUrl,
      cosmetic.id ??
        cosmetic.name ??
        cosmetic.layer,
      cosmetic.layer,
      ...(cosmetic.frames ?? []),
    ].join("|");

  const cached =
    directionCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const promise =
    findDirectionalFrames(
      cosmetic,
      baseFrames,
      baseUrl
    ).catch(() => ({}));

  directionCache.set(
    cacheKey,
    promise
  );

  return promise;
}

async function getCosmeticFrameIndex(
  baseFrame: number,
  cosmetic: Cosmetic,
  baseFrames: string[],
  baseUrl: string
): Promise<number> {
  const frames =
    cosmetic.frames ?? [];

  if (frames.length === 0) {
    return -1;
  }

  /*
   * Front always uses the original static cosmetic layer.
   */
  if (baseFrame === 0) {
    return -1;
  }

  /*
   * Eyes are not visible from the Back.
   * Side-view eyes always use cosmetic frame_1.
   */
  if (cosmetic.slot === "eyes") {
    if (baseFrame === 1) {
      return -2;
    }

    if (baseFrame === 2) {
      const eyeFrames = cosmetic.frames ?? [];

      for (let index = 0; index < eyeFrames.length; index++) {
        if (/frame_1/i.test(eyeFrames[index])) {
          return index;
        }
      }

      return -1;
    }
  }

  /*
   * Hair uses a fixed direction layout:
   *
   *   frame_1 = Back
   *   frame_2 = Side
   *
   * Hair is NOT auto-detected.
   */
  if (cosmetic.slot === "hair") {
    const hairFrames = cosmetic.frames ?? [];

    if (baseFrame === 1) {
      for (let index = 0; index < hairFrames.length; index++) {
        if (/frame_1/i.test(hairFrames[index])) {
          return index;
        }
      }
    }

    if (baseFrame === 2) {
      for (let index = 0; index < hairFrames.length; index++) {
        if (/frame_2/i.test(hairFrames[index])) {
          return index;
        }
      }
    }

    return -1;
  }

  /*
   * Shoes have a very small sprite area, so full-character
   * silhouette matching is unreliable for them.
   */
  if (cosmetic.slot === "shoes") {
    if (baseFrame === 1) return 0;
    if (baseFrame === 2) return 1;
    return -1;
  }

  const directionalFrames =
    await getDirectionalFrames(
      cosmetic,
      baseFrames,
      baseUrl
    );

  if (baseFrame === 1) {
    return directionalFrames.back ??
      -1;
  }

  if (baseFrame === 2) {
    return directionalFrames.side ??
      -1;
  }

  return -1;
}

function findFramePath(
  frames: string[],
  frameNumber: number,
  exactToken?: string
): string | null {
  if (exactToken) {
    const exact = frames.find((path) =>
      path.toLowerCase().includes(exactToken.toLowerCase())
    );
    if (exact) return exact;
  }

  const pattern = new RegExp(
    `frame_${frameNumber}(?:\\D|$)`,
    "i"
  );

  return frames.find((path) =>
    pattern.test(path)
  ) ?? null;
}

function isMermaidHairCrown(cosmetic: Cosmetic): boolean {
  const name = (cosmetic.name ?? "").toLowerCase();
  const layer = (cosmetic.layer ?? "").toLowerCase();

  return (
    name.includes("mermaid hair crown") ||
    layer.includes("mermaid_hair_crown")
  );
}

function isNormalMermaidHair(cosmetic: Cosmetic): boolean {
  const name = (cosmetic.name ?? "").toLowerCase();
  const layer = (cosmetic.layer ?? "").toLowerCase();

  return (
    (name.includes("mermaid hair") ||
      layer.includes("mermaid_hair")) &&
    !isMermaidHairCrown(cosmetic)
  );
}

async function loadCosmeticImages(
  cosmetic: Cosmetic,
  baseFrame: number,
  baseFrames: string[],
  baseUrl: string,
  manifest: RendererManifest
): Promise<HTMLImageElement[]> {
  if (!cosmetic.layer) {
    throw new Error(
      `Cosmetic has no layer: ${cosmetic.name ?? "Unknown"}`
    );
  }

  const frames = cosmetic.frames ?? [];

  /*
   * Mermaid Hair Crown:
   *
   * Front = frame_5 + frame_1 on top
   * Side  = frame_3 + frame_4 on top
   * Back  = mermaid_hair_crown__31599__frame_3
   */
  if (isMermaidHairCrown(cosmetic)) {
    const paths: string[] = [];

    /* The supplied hair assets are reversed relative to the builder's
     * view labels. Swap Front and Back here; Side stays unchanged.
     *
     * Builder/base views:
     *   0 = Front
     *   2 = Side
     *   1 = Back
     */
    if (baseFrame === 0) {
      // Builder Front -> use the asset that was previously being used for Back.
      const front = findFramePath(
        frames,
        3,
        "mermaid_hair_crown__31599__frame_3"
      );

      if (front) paths.push(front);
    } else if (baseFrame === 2) {
      const base = findFramePath(frames, 3);
      const overlay = findFramePath(frames, 4);

      if (base) paths.push(base);
      if (overlay) paths.push(overlay);
    } else if (baseFrame === 1) {
      // Builder Back -> use the asset that was previously being used for Front.
      const base = findFramePath(frames, 5);
      const overlay = findFramePath(frames, 1);

      if (base) paths.push(base);
      if (overlay) paths.push(overlay);
    }

    const images: HTMLImageElement[] = [];

    for (const path of paths) {
      try {
        images.push(
          await loadImage(
            joinUrl(baseUrl, path)
          )
        );
      } catch {
        // Keep rendering the other layer if one file is missing.
      }
    }

    return images;
  }

  /*
   * Normal Mermaid Hair:
   * Front = frame_2
   * Side  = mermaid_hair_crown__31599__frame_2
   * Back  = mermaid_hair_crown__31599__frame_3
   */
  if (isNormalMermaidHair(cosmetic)) {
    /*
     * Normal Mermaid Hair uses its own frame_2 for Front.
     * Its Side and Back artwork comes from the separate
     * Mermaid Hair Crown cosmetic.
     */
    let sourceCosmetic = cosmetic;
    let path: string | null = null;

    /* Front/Back are reversed for these Mermaid assets. */
    if (baseFrame === 0) {
      // Builder Front -> old Back asset.
      sourceCosmetic =
        manifest.cosmetics?.[
          "Mermaid Hair Crown"
        ] ?? cosmetic;

      const sourceFrames =
        sourceCosmetic.frames ?? [];

      path = findFramePath(
        sourceFrames,
        3,
        "mermaid_hair_crown__31599__frame_3"
      );
    } else {
      sourceCosmetic =
        manifest.cosmetics?.[
          "Mermaid Hair Crown"
        ] ?? cosmetic;

      const sourceFrames =
        sourceCosmetic.frames ?? [];

      if (baseFrame === 2) {
        path = findFramePath(
          sourceFrames,
          2,
          "mermaid_hair_crown__31599__frame_2"
        );
      } else if (baseFrame === 1) {
        // Builder Back -> old Front asset.
        path = findFramePath(frames, 2);
      }
    }

    if (!path) return [];

    try {
      return [
        await loadImage(
          joinUrl(baseUrl, path)
        ),
      ];
    } catch {
      return [];
    }
  }

  const index = await getCosmeticFrameIndex(
    baseFrame,
    cosmetic,
    baseFrames,
    baseUrl
  );

  if (index === -2) {
    return [];
  }

  if (index === -1) {
    if (baseFrame === 0) {
      try {
        return [
          await loadImage(
            joinUrl(baseUrl, cosmetic.layer)
          ),
        ];
      } catch {
        return [];
      }
    }

    return [];
  }

  const framePath = frames[index];

  if (!framePath) return [];

  try {
    return [
      await loadImage(
        joinUrl(baseUrl, framePath)
      ),
    ];
  } catch {
    return [];
  }
}

function hexToRgb(
  color: string
): { r: number; g: number; b: number } | null {
  const value =
    color.trim().replace("#", "");

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
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function applyTint(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string
): void {
  const rgb =
    hexToRgb(color);

  if (!rgb) return;

  const imageData =
    context.getImageData(
      0,
      0,
      width,
      height
    );

  const data =
    imageData.data;

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    if (data[i + 3] === 0) {
      continue;
    }

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luminance =
      0.2126 * r +
      0.7152 * g +
      0.0722 * b;

    const factor =
      luminance / 255;

    data[i] =
      Math.min(
        255,
        Math.round(
          rgb.r * factor
        )
      );

    data[i + 1] =
      Math.min(
        255,
        Math.round(
          rgb.g * factor
        )
      );

    data[i + 2] =
      Math.min(
        255,
        Math.round(
          rgb.b * factor
        )
      );
  }

  context.putImageData(
    imageData,
    0,
    0
  );
}

function getBaseData(
  manifest: RendererManifest,
  skin: number
): {
  frames: string[];
  previews: string[];
} {
  const keys = [
    `skin_${skin}`,
    String(skin),
  ];

  for (const key of keys) {
    if (manifest.base[key]) {
      return manifest.base[key];
    }
  }

  if (manifest.base.skin_1) {
    return manifest.base.skin_1;
  }

  const firstKey =
    Object.keys(
      manifest.base
    )[0];

  if (firstKey) {
    return manifest.base[firstKey];
  }

  throw new Error(
    "Renderer manifest contains no base characters."
  );
}

export async function renderCharacter(
  options: RenderOptions
): Promise<HTMLCanvasElement> {
  const {
    manifest,
    baseUrl = DEFAULT_BASE_URL,
    skin = 1,
    frame = 0,
    cosmetics = {},
    tints = {},
    scale = 1,
  } = options;

  /*
   * Renderer owns the default outfit.
   * Explicit Builder selections override it.
   */
  const resolvedCosmetics:
    Partial<Record<CosmeticSlot, string>> = {
    ...DEFAULT_COSMETICS,
  };

  for (
    const slot of Object.keys(
      cosmetics
    ) as CosmeticSlot[]
  ) {
    const selected =
      cosmetics[slot];

    if (
      typeof selected === "string" &&
      selected.trim()
    ) {
      resolvedCosmetics[slot] =
        selected;
    }
  }

  const base =
    getBaseData(
      manifest,
      skin
    );

  if (
    !base.frames ||
    base.frames.length === 0
  ) {
    throw new Error(
      `Skin ${skin} contains no base frames.`
    );
  }

  const baseFrameIndex =
    Math.max(
      0,
      Math.min(
        frame,
        base.frames.length - 1
      )
    );

  const basePath =
    base.frames[
      baseFrameIndex
    ];

  if (!basePath) {
    throw new Error(
      `Base frame ${baseFrameIndex} does not exist for skin ${skin}.`
    );
  }

  const baseImage =
    await loadImage(
      joinUrl(
        baseUrl,
        basePath
      )
    );

  const width =
    baseImage.naturalWidth ||
    baseImage.width;

  const height =
    baseImage.naturalHeight ||
    baseImage.height;

  if (!width || !height) {
    throw new Error(
      "Base character image has invalid dimensions."
    );
  }

  const nativeCanvas =
    createCanvas(
      width,
      height
    );

  const nativeContext =
    nativeCanvas.getContext(
      "2d"
    );

  if (!nativeContext) {
    throw new Error(
      "Unable to create renderer canvas."
    );
  }

  nativeContext.imageSmoothingEnabled =
    false;

  drawImage(
    nativeContext,
    baseImage,
    width,
    height
  );

  removeChromaKey(
    nativeContext,
    width,
    height
  );

  /*
   * Draw cosmetics in the correct layer order.
   */
  for (
    const slot of LAYER_ORDER
  ) {
    const cosmeticId =
      resolvedCosmetics[
        slot
      ];

    if (!cosmeticId) {
      continue;
    }

    const cosmetic =
      manifest.cosmetics?.[
        cosmeticId
      ];

    if (!cosmetic) {
      console.warn(
        `[Renderer] Cosmetic "${cosmeticId}" was not found in manifest.`
      );
      continue;
    }

    if (
      cosmetic.slot !== slot
    ) {
      console.warn(
        `[Renderer] Cosmetic "${cosmeticId}" has slot "${cosmetic.slot}" but was assigned to "${slot}".`
      );
      continue;
    }

    let cosmeticImages: HTMLImageElement[];

    try {
      cosmeticImages =
        await loadCosmeticImages(
          cosmetic,
          baseFrameIndex,
          base.frames,
          baseUrl,
          manifest
        );
    } catch (error) {
      console.warn(
        `[Renderer] Could not load ${slot} cosmetic "${cosmetic.name ?? cosmeticId}".`,
        error
      );
      continue;
    }

    if (cosmeticImages.length === 0) {
      continue;
    }

    const tint =
      tints[
        slot as keyof CosmeticTints
      ];

    for (const cosmeticImage of cosmeticImages) {
      const layerCanvas =
        createCanvas(
          width,
          height
        );

      const layerContext =
        layerCanvas.getContext(
          "2d"
        );

      if (!layerContext) {
        continue;
      }

      layerContext.imageSmoothingEnabled =
        false;

      drawImage(
        layerContext,
        cosmeticImage,
        width,
        height
      );

      removeChromaKey(
        layerContext,
        width,
        height
      );

      if (tint) {
        applyTint(
          layerContext,
          width,
          height,
          tint
        );
      }

      nativeContext.drawImage(
        layerCanvas,
        0,
        0
      );
    }
  }

  const safeScale =
    Number.isFinite(scale) &&
    scale > 0
      ? scale
      : 1;

  const finalCanvas =
    createCanvas(
      Math.round(
        width * safeScale
      ),
      Math.round(
        height * safeScale
      )
    );

  const finalContext =
    finalCanvas.getContext(
      "2d"
    );

  if (!finalContext) {
    throw new Error(
      "Unable to create final renderer canvas."
    );
  }

  finalContext.imageSmoothingEnabled =
    false;

  finalContext.drawImage(
    nativeCanvas,
    0,
    0,
    finalCanvas.width,
    finalCanvas.height
  );

  return finalCanvas;
}

export async function renderCharacterToDataUrl(
  options: RenderOptions
): Promise<string> {
  const canvas =
    await renderCharacter(
      options
    );

  return canvas.toDataURL(
    "image/png"
  );
}

export async function renderCharacterToImage(
  options: RenderOptions
): Promise<HTMLImageElement> {
  const dataUrl =
    await renderCharacterToDataUrl(
      options
    );

  return loadImage(
    dataUrl
  );
}
