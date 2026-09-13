```ts
// src/renderer/renderer.ts
//
// Team Fate cosmetic renderer
//
// The Fiereu / PokeMMO Clothes API is responsible for:
// - Cosmetic artwork
// - Front / Back / Side artwork
// - Cosmetic layering
//
// The Team Fate manifest is only used to determine which cosmetics
// are equipped.
//
// IMPORTANT:
// - Local frame numbers are NOT API item IDs.
// - Local manifest layer indexes are NOT API item IDs.
// - Team Fate skin numbers are NOT part of the Fiereu API URL.
//

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
  api_id?: number;
  apiId?: number;
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
  slot_codes?: Record<string, string>;
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

export type RendererView =
  | "front"
  | "side"
  | "back";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_BASE_URL =
  "/team-fate-renderer";

const API_BASE =
  "https://apis.fiereu.de/pokemmoclothes/v1";

const API_VERSION = 2;
const API_GENDER = 1;

/**
 * Fiereu scene IDs:
 *
 * 1 = Back
 * 2 = Front
 * 3 = Side
 */
const API_SCENE: Record<
  RendererView,
  number
> = {
  back: 1,
  front: 2,
  side: 3,
};

/* -------------------------------------------------------------------------- */
/* Fiereu slot mapping                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Fiereu API slot numbers.
 *
 * These are NOT Team Fate manifest layer indexes.
 *
 * Fiereu URL order:
 *
 * back
 * bicycle
 * eyes
 * face
 * gloves
 * hair
 * hat
 * legs
 * shoes
 * top
 */
const API_SLOT: Record<
  CosmeticSlot,
  number
> = {
  hat: 2,
  hair: 3,
  eyes: 4,
  face: 5,
  back: 6,
  top: 7,
  held: 8,
  shoes: 9,
  pants: 10,
  tool: 11,
  mount: 12,
};

/**
 * Slots currently supported by the Fiereu URL.
 */
const API_SLOTS: CosmeticSlot[] = [
  "back",
  "mount",
  "eyes",
  "face",
  "held",
  "hair",
  "hat",
  "pants",
  "shoes",
  "top",
];

/* -------------------------------------------------------------------------- */
/* PokeMMO cosmetic catalog                                                   */
/* -------------------------------------------------------------------------- */

const ITEM_DATA_URL =
  "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-hub/master/src/data/pokemmo/item.json";

type ApiItem = {
  id: number;
  en_name?: string;
  key?: string;
  category?: number;
};

type ApiCatalog = {
  byName: Map<string, number>;
  byKey: Map<string, number>;
  bySlug: Map<string, number>;
};

let manifestPromise:
  | Promise<RendererManifest>
  | null = null;

let apiCatalogPromise:
  | Promise<ApiCatalog>
  | null = null;

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
/* -------------------------------------------------------------------------- */

function joinUrl(
  baseUrl: string,
  path: string
): string {
  if (!path) {
    return "";
  }

  if (
    /^https?:\/\//i.test(path) ||
    path.startsWith("/")
  ) {
    return path;
  }

  return `${baseUrl.replace(
    /\/+$/,
    ""
  )}/${path.replace(/^\/+/, "")}`;
}

/* -------------------------------------------------------------------------- */
/* Manifest loading                                                           */
/* -------------------------------------------------------------------------- */

export async function loadRendererManifest(
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RendererManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(
      joinUrl(baseUrl, "manifest.json"),
      {
        cache: "no-cache",
      }
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

/* -------------------------------------------------------------------------- */
/* Name normalization                                                         */
/* -------------------------------------------------------------------------- */

function normalizeName(
  value: string
): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\s*\((?:m|f)\)\s*$/i,
      ""
    )
    .replace(
      /\bcolour\b/g,
      "color"
    )
    .replace(
      /\bxmas\b/g,
      "christmas"
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

function compact(
  value: string
): string {
  return normalizeName(value).replace(
    /\s+/g,
    ""
  );
}

function slug(
  value: string
): string {
  return normalizeName(value).replace(
    /\s+/g,
    "-"
  );
}

function addLookup(
  map: Map<string, number>,
  key: string | undefined,
  id: number
): void {
  if (!key) {
    return;
  }

  if (!map.has(key)) {
    map.set(key, id);
  }
}

/* -------------------------------------------------------------------------- */
/* PokeMMO catalog loading                                                    */
/* -------------------------------------------------------------------------- */

async function loadApiCatalog(): Promise<ApiCatalog> {
  if (!apiCatalogPromise) {
    apiCatalogPromise = fetch(
      ITEM_DATA_URL,
      {
        cache: "force-cache",
      }
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load PokeMMO cosmetic catalog: ${response.status}`
        );
      }

      const items =
        (await response.json()) as ApiItem[];

      const byName =
        new Map<string, number>();

      const byKey =
        new Map<string, number>();

      const bySlug =
        new Map<string, number>();

      for (const item of items) {
        /*
         * PokeMMO category 6 = cosmetic items.
         */
        if (
          item.category !== 6 ||
          !Number.isFinite(item.id)
        ) {
          continue;
        }

        if (item.en_name) {
          addLookup(
            byName,
            normalizeName(
              item.en_name
            ),
            item.id
          );

          addLookup(
            bySlug,
            slug(item.en_name),
            item.id
          );
        }

        if (item.key) {
          addLookup(
            byKey,
            normalizeName(
              item.key
            ),
            item.id
          );

          addLookup(
            bySlug,
            slug(item.key),
            item.id
          );
        }
      }

      return {
        byName,
        byKey,
        bySlug,
      };
    });
  }

  return apiCatalogPromise;
}

/* -------------------------------------------------------------------------- */
/* Known API IDs                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Known Fiereu / PokeMMO IDs that are not available in the older
 * PokeMMO Hub item.json mirror.
 *
 * These are actual PokeMMO item IDs.
 * They are NOT Team Fate layer indexes.
 */
const KNOWN_FIEREU_IDS: Record<
  string,
  number
> = {
  "elegant ponytail": 2563,
};

/* -------------------------------------------------------------------------- */
/* Name aliases                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Only keep aliases where the Team Fate name and PokeMMO catalog name
 * genuinely differ.
 *
 * Mermaid Hair Crown has intentionally been removed.
 *
 * The manifest/selection should now use:
 *
 *     Mermaid Hair (Alt)
 *
 * directly.
 */
const NAME_ALIASES: Record<
  string,
  string[]
> = {
  "default hair": [
    "default hair",
  ],

  brown: [
    "brown eyes",
  ],

  "brown eyes": [
    "brown eyes",
  ],

  angry: [
    "angry eyes",
  ],

  "angry eyes": [
    "angry eyes",
  ],

  "rock star": [
    "rockstar",
    "rock star",
  ],

  "desu's lab coat (colour)": [
    "desu's lab coat (colour)",
    "desu's lab coat (color)",
  ],

  "red christmas stocking": [
    "red christmas stocking",
    "red xmas stocking",
  ],

  "green christmas stocking": [
    "green christmas stocking",
    "green xmas stocking",
  ],

  "blue christmas stocking": [
    "blue christmas stocking",
    "blue xmas stocking",
  ],

  "yellow christmas stocking": [
    "yellow christmas stocking",
    "yellow xmas stocking",
  ],
};

/* -------------------------------------------------------------------------- */
/* API item resolution                                                        */
/* -------------------------------------------------------------------------- */

async function resolveApiItemId(
  cosmeticName: string,
  cosmetic: Cosmetic
): Promise<number> {
  /*
   * 1. Explicit API ID.
   *
   * This always takes priority.
   */
  const explicitId =
    cosmetic.api_id ??
    cosmetic.apiId;

  if (
    Number.isFinite(explicitId)
  ) {
    return Number(explicitId);
  }

  const normalized =
    normalizeName(
      cosmeticName
    );

  /*
   * 2. Known Fiereu corrections.
   */
  const knownId =
    KNOWN_FIEREU_IDS[
      normalized
    ];

  if (
    knownId !== undefined
  ) {
    return knownId;
  }

  /*
   * 3. API defaults.
   */
  if (
    normalized ===
    "default hair"
  ) {
    return 0;
  }

  if (
    normalized === "brown" ||
    normalized === "brown eyes"
  ) {
    return 1438;
  }

  if (
    normalized === "angry" ||
    normalized === "angry eyes"
  ) {
    return 1444;
  }

  /*
   * 4. Current PokeMMO catalog.
   */
  const catalog =
    a
```
