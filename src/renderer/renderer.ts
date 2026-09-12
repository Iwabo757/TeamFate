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

const DEFAULT_DIRECTIONAL_FRAMES: Record<
  string,
  Partial<Record<number, number>>
> = {
  // The default clothing assets contain animation frames grouped by
  // direction. These are zero-based indexes into cosmetic.frames.
  // Base direction: 0 = Front, 1 = Back, 2 = Side.
  "T-Shirt": {
    1: 13, // cosmetic frame_14 = Back
    2: 26, // cosmetic frame_27 = Side
  },
  "Pants": {
    1: 10, // cosmetic frame_11 = Back
    2: 20, // cosmetic frame_21 = Side
  },
  "Shoes": {
    1: 4, // cosmetic frame_5 = Back
    2: 8, // cosmetic frame_9 = Side
  },
  "Default Hair": {
    1: 0, // cosmetic frame_1 = Back
    2: 1, // cosmetic frame_2 = Side
  },
};

function getCosmeticFrameIndex(
  baseFrame: number,
  frameCount: number,
  cosmeticName: string,
  slot: CosmeticSlot
): number {
  if (frameCount <= 0) return -1;

  // Front uses the original static layer.
  if (baseFrame === 0) return -1;

  // Default assets have known direction groups and must not use frame_1 /
  // frame_2 directly for Side/Back.
  const defaultMapping =
    DEFAULT_DIRECTIONAL_FRAMES[cosmeticName];

  if (defaultMapping && defaultMapping[baseFrame] !== undefined) {
    const index = defaultMapping[baseFrame];

    return index < frameCount ? index : -1;
  }

  // Eyes are special: they are not shown from the back.
  if (slot === "eyes") {
    if (baseFrame === 1) return -2;
    if (baseFrame === 2 && frameCount >= 4) return 3;
    if (baseFrame === 2 && frameCount >= 2) return 1;
    return -1;
  }

  // Generic directional cosmetics use the first extracted directional frames.
  if (baseFrame === 1) return 0;
  if (baseFrame === 2) return 1;

  return -1;
}

async function loadCosmeticImage(
  cosmetic: Cosmetic,
  baseFrame: number,
  baseUrl: string
): Promise<HTMLImageElement | null> {
  if (!cosmetic.layer) {
    throw new Error(
      `Cosmetic has no layer: ${cosmetic.name ?? "Unknown"}`
    );
  }

  const frames = cosmetic.frames ?? [];
  const index = getCosmeticFrameIndex(
    baseFrame,
    frames.length,
    cosmetic.name ?? "",
    cosmetic.slot
  );

  /* Explicitly hidden direction (for example Back eyes). */
  if (index === -2) {
    return null;
  }

  /* Front uses the original static layer. */
  if (index === -1) {
    if (baseFrame === 0) {
      return loadImage(
        joinUrl(baseUrl, cosmetic.layer)
      );
    }

    /* A front-only cosmetic should not be painted onto Side/Back. */
    return null;
  }

  const framePath = frames[index];

  if (!framePath) {
    return null;
  }

  try {
    return await loadImage(
      joinUrl(baseUrl, framePath)
    );
  } catch {
    /* Do NOT fall back to the front layer on Side/Back. That was the
       source of the backwards-looking clothing problem. */
    return null;
  }
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

function hexToRgb(
  color: string
): { r: number; g: number; b: number } | null {
  const value = color.trim().replace("#", "");

  if (value.length !== 6) return null;

  const number = Number.parseInt(value, 16);

  if (!Number.isFinite(number)) return null;

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
  const rgb = hexToRgb(color);

  if (!rgb) return;

  const imageData = context.getImageData(
    0,
    0,
    width,
    height
  );

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const luminance =
      0.2126 * r +
      0.7152 * g +
      0.0722 * b;

    const factor = luminance / 255;

    data[i] = Math.min(
      255,
      Math.round(rgb.r * factor)
    );

    data[i + 1] = Math.min(
      255,
      Math.round(rgb.g * factor)
    );

    data[i + 2] = Math.min(
      255,
      Math.round(rgb.b * factor)
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

  const firstKey = Object.keys(
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

  // Renderer owns the default outfit. Explicit Builder selections override it.
  const resolvedCosmetics: Partial<Record<CosmeticSlot, string>> = {
    ...DEFAULT_COSMETICS,
  };

  for (const slot of Object.keys(cosmetics) as CosmeticSlot[]) {
    const selected = cosmetics[slot];
    if (typeof selected === "string" && selected.trim()) {
      resolvedCosmetics[slot] = selected;
    }
  }

  const base = getBaseData(
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

  const baseFrameIndex = Math.max(
    0,
    Math.min(
      frame,
      base.frames.length - 1
    )
  );

  const basePath =
    base.frames[baseFrameIndex];

  if (!basePath) {
    throw new Error(
      `Base frame ${baseFrameIndex} does not exist for skin ${skin}.`
    );
  }

  const baseImage = await loadImage(
    joinUrl(baseUrl, basePath)
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
    createCanvas(width, height);

  const nativeContext =
    nativeCanvas.getContext("2d");

  if (!nativeContext) {
    throw new Error(
      "Unable to create renderer canvas."
    );
  }

  nativeContext.imageSmoothingEnabled = false;

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

  for (const slot of LAYER_ORDER) {
    const cosmeticId =
      resolvedCosmetics[slot];

    if (!cosmeticId) continue;

    const cosmetic =
      manifest.cosmetics?.[cosmeticId];

    if (!cosmetic) {
      console.warn(
        `[Renderer] Cosmetic "${cosmeticId}" was not found in manifest.`
      );
      continue;
    }

    if (cosmetic.slot !== slot) {
      console.warn(
        `[Renderer] Cosmetic "${cosmeticId}" has slot "${cosmetic.slot}" but was assigned to "${slot}".`
      );
      continue;
    }

    let cosmeticImage:
      HTMLImageElement | null;

    try {
      cosmeticImage =
        await loadCosmeticImage(
          cosmetic,
          frame,
          baseUrl
        );
    } catch (error) {
      console.warn(
        `[Renderer] Could not load ${slot} cosmetic "${cosmetic.name ?? cosmeticId}".`,
        error
      );
      continue;
    }

    if (!cosmeticImage) {
      continue;
    }

    const layerCanvas =
      createCanvas(width, height);

    const layerContext =
      layerCanvas.getContext("2d");

    if (!layerContext) continue;

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

    const tint =
      tints[
        slot as keyof CosmeticTints
      ];

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

  const safeScale =
    Number.isFinite(scale) &&
    scale > 0
      ? scale
      : 1;

  const finalCanvas =
    createCanvas(
      Math.round(width * safeScale),
      Math.round(height * safeScale)
    );

  const finalContext =
    finalCanvas.getContext("2d");

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
    await renderCharacter(options);

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

  return loadImage(dataUrl);
}
