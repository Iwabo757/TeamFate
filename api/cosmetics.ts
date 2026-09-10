export default async function handler(req: any, res: any) {
  try {
    const [catalogResponse, cosmeticDataResponse, apiItemsResponse] =
      await Promise.all([
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
     * ------------------------------------------------------------
     * Build API ID -> internal renderer ID mapping
     * ------------------------------------------------------------
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
     * ------------------------------------------------------------
     * Build metadata lookup from PokeMMO-Tools
     * ------------------------------------------------------------
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
     * ------------------------------------------------------------
     * Extract current catalog entries from PikaMMO
     *
     * Their cosmetic images use:
     *
     * /assets/img/vanity/<API_ID>.png
     *
     * We use that ID to connect the current catalog to
     * PokeMMO's internal renderer ID.
     * ------------------------------------------------------------
     */

    const cosmetics: any[] = [];

    const rowRegex =
      /<tr[\s\S]*?<\/tr>/gi;

    const imageRegex =
      /vanity\/(\d+)\.png/i;

    const cellRegex =
      /<td[^>]*>([\s\S]*?)<\/td>/gi;

    const stripHtml = (value: string) =>
      value
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const rows = catalogHtml.match(rowRegex) || [];

    for (const row of rows) {
      const imageMatch = row.match(imageRegex);

      if (!imageMatch) {
        continue;
      }

      const apiId = Number(imageMatch[1]);

      if (!Number.isFinite(apiId)) {
        continue;
      }

      const cells = [...row.matchAll(cellRegex)].map((match) =>
        stripHtml(match[1])
      );

      if (cells.length < 2) {
        continue;
      }

      /*
       * The English catalog name is normally the second
       * meaningful cell in the row.
       */

      const possibleNames = cells.filter(
        (value) =>
          value &&
          value.toLowerCase() !== "cosmetic" &&
          value.toLowerCase() !== "particle"
      );

      const name =
        possibleNames[possibleNames.length - 1] ||
        `Item ${apiId}`;

      const internalId =
        apiToInternal.get(apiId) ?? apiId;

      const metadata =
        metadataByApiId.get(apiId) || {};

      cosmetics.push({
        item_id: apiId,
        internal_id: internalId,
        name,
        icon_id: internalId,

        slot: Number(metadata.slot ?? 0),

        attribute: Number(
          metadata.attribute ?? 0
        ),

        festival: Number(
          metadata.festival ?? 0
        ),

        limitation: Number(
          metadata.limitation ?? 0
        ),

        month: Number(
          metadata.month ?? 0
        ),

        year: Number(
          metadata.year ?? 0
        ),
      });
    }

    /*
     * ------------------------------------------------------------
     * Remove duplicate API IDs
     * ------------------------------------------------------------
     */

    const unique = new Map<number, any>();

    for (const cosmetic of cosmetics) {
      if (!unique.has(cosmetic.item_id)) {
        unique.set(
          cosmetic.item_id,
          cosmetic
        );
      }
    }

    const result = Array.from(
      unique.values()
    );

    /*
     * ------------------------------------------------------------
     * Cache the catalog
     * ------------------------------------------------------------
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
      error: "Failed to build cosmetic catalog",
    });
  }
}