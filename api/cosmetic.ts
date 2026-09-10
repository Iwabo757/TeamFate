export default async function handler(req: any, res: any) {
  try {
    const [cosmeticsResponse, itemsResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-data/main/data/items-cosmetic.json"
      ),
      fetch(
        "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-data/main/data/items.json"
      ),
    ]);

    if (!cosmeticsResponse.ok || !itemsResponse.ok) {
      return res.status(502).json({
        error: "Unable to load cosmetic data",
      });
    }

    const cosmeticData = await cosmeticsResponse.json();
    const itemData = await itemsResponse.json();

    const itemsById = new Map<number, any>();

    for (const item of itemData) {
      itemsById.set(Number(item.id), item);
    }

    const cosmetics: any[] = [];

    for (const cosmetic of cosmeticData) {
      const ids = Array.isArray(cosmetic.item_id)
        ? cosmetic.item_id
        : [cosmetic.item_id];

      for (const id of ids) {
        const numericId = Number(id);
        const item = itemsById.get(numericId);

        cosmetics.push({
          item_id: numericId,
          name: item?.name || `Item ${numericId}`,
          icon_id: item?.icon_id ?? numericId,
          slot: Number(cosmetic.slot),
          attribute: Number(cosmetic.attribute ?? 0),
          festival: Number(cosmetic.festival ?? 0),
          limitation: Number(cosmetic.limitation ?? 0),
          month: Number(cosmetic.month ?? 0),
          year: Number(cosmetic.year ?? 0),
        });
      }
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    return res.status(200).json(cosmetics);
  } catch (error) {
    console.error("Cosmetic data error:", error);

    return res.status(500).json({
      error: "Failed to load cosmetic data",
    });
  }
}