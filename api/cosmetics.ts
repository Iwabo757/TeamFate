export default async function handler(req: any, res: any) {
  try {
    const [
      catalogResponse,
      cosmeticDataResponse,
      apiItemsResponse,
    ] = await Promise.all([
      fetch(
        "https://www.pikammo.fr/Pokemmo/en/tools/cosmetiques"
      ),
      fetch(
        "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-data/main/data/items-cosmetic.json"
      ),
      fetch(
        "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-hub/main/src/data/apiItems.json"
      ),
    ]);

    if (
      !catalogResponse.ok ||
      !cosmeticDataResponse.ok ||
      !apiItemsResponse.ok
    ) {
      return res.status(502).json({
        error: "Unable to load cosmetic sources",
      });
    }

    const catalogHtml = await catalogResponse.text();
    const cosmeticData = await cosmeticDataResponse.json();
    const apiItems = await apiItemsResponse.json();

    /*
     * ---------------------------------------------------------
     * API ID -> INTERNAL RENDERER ID
     * ---------------------------------------------------------
     */

    const apiToInternal = new Map<number, number>();

    for (const item of apiItems) {
      const apiId = Number(item.apiID);
      const internalId = Number(item.id);

      if (
        Number.isFinite(apiId) &&
        Number.isFinite(internalId)
      ) {
        apiToInternal.set(apiId, internalId);
      }
    }

    /*
     * ---------------------------------------------------------
     * OLD COSMETIC METADATA
     *
     * This still contains useful slot information for older
     * cosmetics. Newer items are handled by inferSlot().
     * ---------------------------------------------------------
     */

    const metadataByApiId = new Map<number, any>();

    for (const cosmetic of cosmeticData) {
      const ids = Array.isArray(cosmetic.item_id)
        ? cosmetic.item_id
        : [cosmetic.item_id];

      for (const id of ids) {
        const numericId = Number(id);

        if (!Number.isFinite(numericId)) {
          continue;
        }

        metadataByApiId.set(numericId, {
          attribute: Number(cosmetic.attribute ?? 0),
          festival: Number(cosmetic.festival ?? 0),
          limitation: Number(cosmetic.limitation ?? 0),
          month: Number(cosmetic.month ?? 0),
          slot: Number(cosmetic.slot ?? 0),
          year: Number(cosmetic.year ?? 0),
        });
      }
    }

    /*
     * ---------------------------------------------------------
     * SLOT INFERENCE FOR NEWER COSMETICS
     *
     * PikaMMO has the current item catalog, while the older
     * cosmetic metadata file does not always contain newly
     * released cosmetics.
     *
     * Existing slot data always wins.
     * These rules are only used when no slot exists.
     * ---------------------------------------------------------
     */

    function inferSlot(name: string): number {
      const value = name
        .toLowerCase()
        .replace(/[’']/g, "'")
        .trim();

      /*
       * BICYCLE
       */
      if (
        value.includes("bicycle") ||
        value.includes("bike") ||
        value.includes("motorcycle") ||
        value.includes("motorbike")
      ) {
        return 12;
      }

      /*
       * GLOVES
       */
      if (
        value.includes("glove") ||
        value.includes("boxing glove")
      ) {
        return 8;
      }

      /*
       * SHOES
       */
      if (
        value.includes("shoe") ||
        value.includes("boots") ||
        value.includes("boot") ||
        value.includes("sandals") ||
        value.includes("sandal")
      ) {
        return 9;
      }

      /*
       * LEGS
       */
      if (
        value === "shorts" ||
        value.includes("pants") ||
        value.includes("trousers") ||
        value.includes("leggings") ||
        value.includes("skirt")
      ) {
        return 10;
      }

      /*
       * EYES
       */
      if (
        value.includes("contact") ||
        value.includes("glasses") ||
        value.includes("goggles") ||
        value.includes("sunglasses") ||
        value.includes("visor")
      ) {
        return 4;
      }

      /*
       * FACE
       */
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

      /*
       * BACK
       */
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

      /*
       * ROD / HELD COSMETIC
       */
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

      /*
       * HAIR
       *
       * These are intentionally checked BEFORE hats/headwear.
       * Newer cosmetics such as Mermaid Hair and Idol Hairstyle
       * were not present in the older slot metadata.
       */
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

      /*
       * FOREHEAD / SMALL HEAD ACCESSORIES
       */
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

      /*
       * HATS / HEADWEAR
       */
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

      /*
       * TOP / BODY
       */
      if (
        value.includes("outfit") ||
        value.includes("costume") ||
        value.includes("armor") ||
        value.includes("armour") ||
        value.includes("jacket") ||
        value.includes("coat") ||
        value.includes("shirt") ||
        value.includes("t-shirt") ||
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
        value.includes("cape")
      ) {
        return 7;
      }

      /*
       * Unknown items stay uncategorized rather than being
       * incorrectly forced into a clothing slot.
       */
      return 0;
    }

    /*
     * ---------------------------------------------------------
     * HTML HELPERS
     * ---------------------------------------------------------
     */

    const stripHtml = (value: string) =>
      value
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

    const rowRegex = /<tr[\s\S]*?<\/tr>/gi;

    const imageRegex =
      /vanity\/(\d+)\.png/i;

    const cellRegex =
      /<td[^>]*>([\s\S]*?)<\/td>/gi;

    const rows =
      catalogHtml.match(rowRegex) || [];

    /*
     * ---------------------------------------------------------
     * BUILD CURRENT COSMETIC CATALOG
     * ---------------------------------------------------------
     */

    const cosmetics: any[] = [];

    for (const row of rows) {
      /*
       * Every catalog entry has an image containing the API ID.
       */
      const imageMatch =
        row.match(imageRegex);

      if (!imageMatch) {
        continue;
      }

      const apiId =
        Number(imageMatch[1]);

      if (!Number.isFinite(apiId)) {
        continue;
      }

      const cells = [
        ...row.matchAll(cellRegex),
      ].map((match) =>
        stripHtml(match[1])
      );

      if (cells.length < 2) {
        continue;
      }

      /*
       * PikaMMO's current table contains:
       *
       * French name
       * English/GTL name
       * Type
       *
       * We ONLY accept rows whose type is Cosmetic.
       *
       * This is the important change that removes the
       * 38 particle effects from the clothing catalog.
       */

      const typeCell =
        cells[cells.length - 1]
          ?.toLowerCase()
          .trim();

      if (typeCell !== "cosmetic") {
        continue;
      }

      /*
       * Prefer the English/GTL name.
       */
      const possibleNames =
        cells.filter(
          (value) =>
            value &&
            value.toLowerCase() !== "cosmetic" &&
            value.toLowerCase() !== "particle"
        );

      const name =
        possibleNames[1] ||
        possibleNames[0] ||
        `Item ${apiId}`;

      /*
       * Convert the public/API item ID into the internal
       * renderer ID used by the PokeMMO clothes renderer.
       */
      const internalId =
        apiToInternal.get(apiId) ??
        apiId;

      /*
       * Old metadata if available.
       */
      const metadata =
        metadataByApiId.get(apiId) || {};

      /*
       * Existing metadata wins.
       *
       * If the old data has no slot, infer one from the
       * current catalog name.
       */
      const metadataSlot =
        Number(metadata.slot ?? 0);

      const slot =
        metadataSlot > 0
          ? metadataSlot
          : inferSlot(name);

      cosmetics.push({
        item_id: apiId,
        internal_id: internalId,

        name,

        /*
         * Renderer/icon data uses the internal ID.
         */
        icon_id: internalId,

        slot,

        attribute:
          Number(metadata.attribute ?? 0),

        festival:
          Number(metadata.festival ?? 0),

        limitation:
          Number(metadata.limitation ?? 0),

        month:
          Number(metadata.month ?? 0),

        year:
          Number(metadata.year ?? 0),
      });
    }

    /*
     * ---------------------------------------------------------
     * REMOVE DUPLICATES
     * ---------------------------------------------------------
     */

    const unique =
      new Map<number, any>();

    for (const cosmetic of cosmetics) {
      if (!unique.has(cosmetic.item_id)) {
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
     *
     * Slot first, then alphabetical name.
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
     * RESPONSE
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