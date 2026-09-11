import fs from "node:fs/promises";
import path from "node:path";

type ClientItem = {
  id: number;
  name?: string;
  desc?: string;
  region_id?: number;
  icon_id?: number;
  name_string_id?: number;
  desc_string_id?: number;
};

type CosmeticMetadata = {
  item_id?: number | number[];
  name?: string;
  attribute?: number;
  festival?: number;
  limitation?: number;
  month?: number;
  slot?: number;
  year?: number;
};

type ApiItem = {
  apiID?: number;
  id?: number;
};

type CosmeticResult = {
  item_id: number;
  internal_id?: number;
  name: string;
  icon_id: number;
  slot: number;
  attribute: number;
  festival: number;
  limitation: number;
  month: number;
  year: number;
};

const SLOT_NAMES: Record<number, string> = {
  1: "Forehead",
  2: "Hat",
  3: "Hair",
  4: "Eyes",
  5: "Face",
  6: "Back",
  7: "Top",
  8: "Gloves",
  9: "Shoes",
  10: "Legs",
  11: "Rod",
  12: "Bicycle",
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanName(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#x2F;/gi, "/")
    .trim();
}

function inferSlot(name: string): number {
  const value = normalizeName(name);

  // Bicycle
  if (
    value.includes("bicycle") ||
    value.includes("bike") ||
    value.includes("motorcycle") ||
    value.includes("motorbike")
  ) {
    return 12;
  }

  // Gloves
  if (
    value.includes("glove") ||
    value.includes("boxing glove")
  ) {
    return 8;
  }

  // Shoes
  if (
    value.includes("shoe") ||
    value.includes("boots") ||
    value.includes("boot") ||
    value.includes("sandals") ||
    value.includes("sandal") ||
    value.includes("sneakers")
  ) {
    return 9;
  }

  // Legs
  if (
    value === "shorts" ||
    value.includes("pants") ||
    value.includes("trousers") ||
    value.includes("leggings") ||
    value.includes("skirt") ||
    value.includes("jeans")
  ) {
    return 10;
  }

  // Eyes
  if (
    value.includes("contact") ||
    value.includes("glasses") ||
    value.includes("goggles") ||
    value.includes("sunglasses") ||
    value.includes("visor")
  ) {
    return 4;
  }

  // Face
  if (
    value.includes("mask") ||
    value.includes("moustache") ||
    value.includes("mustache") ||
    value.includes("beard") ||
    value.includes("eyebrow") ||
    value.includes("fang") ||
    value.includes("face paint") ||
    value.includes("face")
  ) {
    return 5;
  }

  // Back
  if (
    value.includes("wing") ||
    value.includes("cape") ||
    value.includes("backpiece") ||
    value.includes("back piece") ||
    value.includes("backpack") ||
    value.includes("quiver") ||
    value.includes("tail")
  ) {
    return 6;
  }

  // Rod / handheld
  if (
    value.includes("rod") ||
    value.includes("staff") ||
    value.includes("broom") ||
    value.includes("scythe") ||
    value.includes("sword") ||
    value.includes("rapier") ||
    value.includes("spear") ||
    value.includes("pitchfork") ||
    value.includes("hammer") ||
    value.includes("axe") ||
    value.includes("guitar") ||
    value.includes("microphone") ||
    value.includes("bow") ||
    value.includes("fan") ||
    value.includes("torch") ||
    value.includes("watering can") ||
    value.includes("fishing")
  ) {
    return 11;
  }

  // Hair
  if (
    value === "afro" ||
    value.includes("hair") ||
    value.includes("hairstyle") ||
    value.includes("faux hawk") ||
    value.includes("sideswept") ||
    value.includes("pony tail") ||
    value.includes("ponytail") ||
    value.includes("mohawk") ||
    value.includes("bob cut") ||
    value.includes("long hair") ||
    value.includes("short hair") ||
    value.includes("curly hair") ||
    value.includes("spiky hair") ||
    value.includes("wavy hair") ||
    value.includes("origin hairstyle") ||
    value.includes("idol hairstyle")
  ) {
    return 3;
  }

  // Forehead
  if (
    value.includes("hairpin") ||
    value.includes("hair pin") ||
    value.includes("hair clip") ||
    value.includes("forehead") ||
    value.includes("earring") ||
    value.includes("earrings")
  ) {
    return 1;
  }

  // Hats
  if (
    value.includes("hat") ||
    value.includes("cap") ||
    value.includes("helmet") ||
    value.includes("hood") ||
    value.includes("beanie") ||
    value.includes("beret") ||
    value.includes("fedora") ||
    value.includes("fez") ||
    value.includes("sombrero") ||
    value.includes("headdress") ||
    value.includes("headband") ||
    value.includes("headwear") ||
    value.includes("crown") ||
    value.includes("tiara") ||
    value.includes("horn") ||
    value.includes("antler") ||
    value.includes("halo") ||
    value.includes("veil") ||
    value.includes("earmuff") ||
    value.includes("headphones") ||
    value.includes("bandana") ||
    value.includes("boater") ||
    value.includes("straw hat")
  ) {
    return 2;
  }

  // Top / clothing
  if (
    value.includes("outfit") ||
    value.includes("costume") ||
    value.includes("armor") ||
    value.includes("armour") ||
    value.includes("jacket") ||
    value.includes("coat") ||
    value.includes("shirt") ||
    value.includes("t shirt") ||
    value.includes("tshirt") ||
    value.includes("jersey") ||
    value.includes("uniform") ||
    value.includes("robe") ||
    value.includes("dress") ||
    value.includes("suit") ||
    value.includes("tuxedo") ||
    value.includes("vest") ||
    value.includes("cloak") ||
    value.includes("poncho") ||
    value.includes("toga") ||
    value.includes("tunic") ||
    value.includes("tracksuit") ||
    value.includes("apron") ||
    value.includes("tabard") ||
    value.includes("clothing") ||
    value.includes("attire") ||
    value.includes("bodysuit") ||
    value.includes("hoodie") ||
    value.includes("scarf") ||
    value.includes("overalls")
  ) {
    return 7;
  }

  return 0;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCatalog(
  html: string
): Map<number, { name: string; slot: number }> {
  const result = new Map<
    number,
    { name: string; slot: number }
  >();

  const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
  const imageRegex = /vanity\/(\d+)\.png/i;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  const rows = html.match(rowRegex) || [];

  for (const row of rows) {
    const imageMatch = row.match(imageRegex);

    if (!imageMatch) {
      continue;
    }

    const apiId = Number(imageMatch[1]);

    if (!Number.isFinite(apiId)) {
      continue;
    }

    const cells = [
      ...row.matchAll(cellRegex),
    ].map((match) => stripHtml(match[1]));

    if (cells.length < 2) {
      continue;
    }

    const typeCell =
      cells[cells.length - 1]
        ?.toLowerCase()
        .trim();

    // Ignore particles.
    if (typeCell !== "cosmetic") {
      continue;
    }

    const possibleNames = cells.filter(
      (value) =>
        value &&
        value.toLowerCase() !== "cosmetic" &&
        value.toLowerCase() !== "particle"
    );

    const name =
      possibleNames[1] ||
      possibleNames[0] ||
      `Item ${apiId}`;

    result.set(apiId, {
      name: cleanName(name),
      slot: inferSlot(name),
    });
  }

  return result;
}

async function loadLocalItems(): Promise<ClientItem[]> {
  const filePath = path.join(
    process.cwd(),
    "data",
    "items.json"
  );

  const raw = await fs.readFile(
    filePath,
    "utf8"
  );

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "data/items.json is not an array"
    );
  }

  return parsed;
}

export default async function handler(
  req: any,
  res: any
) {
  try {
    /*
     * ---------------------------------------------------------
     * LOAD CURRENT CLIENT ITEMS
     * ---------------------------------------------------------
     *
     * This is now our authoritative list.
     *
     * The uploaded PokeMMO client dump contains:
     *
     *   2,957 total items
     *   794 cosmetic items
     *
     * This means newly released cosmetics are included here.
     */

    const clientItems =
      await loadLocalItems();

    /*
     * ---------------------------------------------------------
     * KEEP ONLY COSMETICS
     * ---------------------------------------------------------
     */

    const currentCosmetics =
      clientItems.filter(
        (item) =>
          item &&
          Number.isFinite(Number(item.id)) &&
          item.desc ===
            "A cosmetic item which can be used to modify your appearance."
      );

    /*
     * ---------------------------------------------------------
     * LOAD OLD MAPPING SOURCES
     * ---------------------------------------------------------
     *
     * These are NOT used to discover the current cosmetic list.
     *
     * They are only used when possible to determine the
     * renderer/internal ID.
     */

    const [
      cosmeticDataResponse,
      apiItemsResponse,
      catalogResponse,
    ] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-data/main/data/items-cosmetic.json"
      ),

      fetch(
        "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-hub/main/src/data/apiItems.json"
      ),

      fetch(
        "https://www.pikammo.fr/Pokemmo/en/tools/cosmetiques"
      ),
    ]);

    /*
     * ---------------------------------------------------------
     * PARSE OPTIONAL EXTERNAL SOURCES
     * ---------------------------------------------------------
     */

    let cosmeticData: CosmeticMetadata[] = [];
    let apiItems: ApiItem[] = [];
    let catalogHtml = "";

    if (cosmeticDataResponse.ok) {
      try {
        const data =
          await cosmeticDataResponse.json();

        if (Array.isArray(data)) {
          cosmeticData = data;
        }
      } catch {
        console.warn(
          "Unable to parse cosmetic metadata"
        );
      }
    }

    if (apiItemsResponse.ok) {
      try {
        const data =
          await apiItemsResponse.json();

        if (Array.isArray(data)) {
          apiItems = data;
        }
      } catch {
        console.warn(
          "Unable to parse apiItems.json"
        );
      }
    }

    if (catalogResponse.ok) {
      try {
        catalogHtml =
          await catalogResponse.text();
      } catch {
        console.warn(
          "Unable to read PikaMMO catalog"
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * API ID -> INTERNAL RENDERER ID
     * ---------------------------------------------------------
     */

    const apiToInternal =
      new Map<number, number>();

    for (const item of apiItems) {
      const apiId = Number(item.apiID);
      const internalId = Number(item.id);

      if (
        Number.isFinite(apiId) &&
        Number.isFinite(internalId) &&
        internalId > 0
      ) {
        apiToInternal.set(
          apiId,
          internalId
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * NAME -> INTERNAL RENDERER ID
     * ---------------------------------------------------------
     *
     * This gives older cosmetics another chance to resolve.
     */

    const internalByName =
      new Map<string, number>();

    for (const cosmetic of cosmeticData) {
      const ids = Array.isArray(
        cosmetic.item_id
      )
        ? cosmetic.item_id
        : [cosmetic.item_id];

      if (
        typeof cosmetic.name !== "string" ||
        !cosmetic.name.trim()
      ) {
        continue;
      }

      const normalized =
        normalizeName(cosmetic.name);

      if (!normalized) {
        continue;
      }

      for (const id of ids) {
        const internalId = Number(id);

        if (
          !Number.isFinite(internalId) ||
          internalId <= 0
        ) {
          continue;
        }

        if (
          !internalByName.has(normalized)
        ) {
          internalByName.set(
            normalized,
            internalId
          );
        }
      }
    }

    /*
     * ---------------------------------------------------------
     * OLD METADATA BY ID
     * ---------------------------------------------------------
     */

    const metadataById =
      new Map<number, CosmeticMetadata>();

    for (const cosmetic of cosmeticData) {
      const ids = Array.isArray(
        cosmetic.item_id
      )
        ? cosmetic.item_id
        : [cosmetic.item_id];

      for (const id of ids) {
        const numericId = Number(id);

        if (!Number.isFinite(numericId)) {
          continue;
        }

        metadataById.set(
          numericId,
          cosmetic
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * CURRENT PIKAMMO CATALOG
     * ---------------------------------------------------------
     */

    const catalog =
      catalogHtml
        ? parseCatalog(catalogHtml)
        : new Map<
            number,
            { name: string; slot: number }
          >();

    /*
     * ---------------------------------------------------------
     * BUILD FINAL LIST
     * ---------------------------------------------------------
     */

    const cosmetics: CosmeticResult[] =
      [];

    for (const clientItem of currentCosmetics) {
      const apiId =
        Number(clientItem.id);

      if (!Number.isFinite(apiId)) {
        continue;
      }

      /*
       * Current client name is the first choice.
       */

      let name =
        typeof clientItem.name === "string" &&
        clientItem.name.trim()
          ? cleanName(clientItem.name)
          : `Item ${apiId}`;

      /*
       * PikaMMO catalog can provide a cleaner
       * current display name.
       */

      const catalogEntry =
        catalog.get(apiId);

      if (
        catalogEntry?.name &&
        catalogEntry.name.trim()
      ) {
        name = catalogEntry.name;
      }

      /*
       * -------------------------------------------------------
       * RESOLVE INTERNAL RENDERER ID
       * -------------------------------------------------------
       *
       * Priority:
       *
       * 1. Current apiItems.json mapping
       * 2. Old cosmetic metadata by matching name
       *
       * We DO NOT pretend the API ID is an internal ID.
       *
       * That was the reason many of the new cosmetics
       * were producing broken previews.
       */

      const directInternal =
        apiToInternal.get(apiId);

      const nameInternal =
        internalByName.get(
          normalizeName(name)
        );

      const internalId =
        directInternal ??
        nameInternal;

      /*
       * -------------------------------------------------------
       * METADATA
       * -------------------------------------------------------
       */

      const metadata =
        metadataById.get(apiId) ||
        (internalId !== undefined
          ? metadataById.get(internalId)
          : undefined);

      const metadataSlot =
        Number(metadata?.slot ?? 0);

      /*
       * PikaMMO slot is preferred over inference.
       */

      const catalogSlot =
        Number(
          catalogEntry?.slot ?? 0
        );

      const slot =
        metadataSlot > 0
          ? metadataSlot
          : catalogSlot > 0
          ? catalogSlot
          : inferSlot(name);

      /*
       * Ignore anything we cannot classify.
       *
       * This prevents random items from being put
       * into the wrong clothing category.
       */

      if (slot <= 0 || !SLOT_NAMES[slot]) {
        continue;
      }

      cosmetics.push({
        item_id: apiId,

        ...(internalId !== undefined
          ? {
              internal_id: internalId,
            }
          : {}),

        name,

        /*
         * The current client icon is the safest icon
         * for the current item ID.
         */
        icon_id:
          Number(clientItem.icon_id) ||
          apiId,

        slot,

        attribute:
          Number(
            metadata?.attribute ?? 0
          ),

        festival:
          Number(
            metadata?.festival ?? 0
          ),

        limitation:
          Number(
            metadata?.limitation ?? 0
          ),

        month:
          Number(
            metadata?.month ?? 0
          ),

        year:
          Number(
            metadata?.year ?? 0
          ),
      });
    }

    /*
     * ---------------------------------------------------------
     * REMOVE DUPLICATES
     * ---------------------------------------------------------
     */

    const unique =
      new Map<number, CosmeticResult>();

    for (const cosmetic of cosmetics) {
      if (
        !unique.has(cosmetic.item_id)
      ) {
        unique.set(
          cosmetic.item_id,
          cosmetic
        );
      }
    }

    const result =
      Array.from(unique.values());

    /*
     * ---------------------------------------------------------
     * SORT
     * ---------------------------------------------------------
     */

    result.sort((a, b) => {
      if (a.slot !== b.slot) {
        return a.slot - b.slot;
      }

      return a.name.localeCompare(
        b.name
      );
    });

    /*
     * ---------------------------------------------------------
     * CACHE
     * ---------------------------------------------------------
     */

    res.setHeader(
      "Content-Type",
      "application/json"
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    /*
     * Helpful debugging headers.
     */

    res.setHeader(
      "X-Cosmetic-Count",
      String(result.length)
    );

    res.setHeader(
      "X-Client-Cosmetic-Count",
      String(
        currentCosmetics.length
      )
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Cosmetic catalog error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to build cosmetic catalog",
    });
  }
}