export default async function handler(req: any, res: any) {
  try {
    const scene = String(req.query.scene || "2");
    const params = String(req.query.params || "");

    if (!/^\d+$/.test(scene)) {
      return res.status(400).send("Invalid scene");
    }

    if (!/^\d+(,\d+){9}$/.test(params)) {
      return res.status(400).send("Invalid cosmetic parameters");
    }

    const [apiItemsResponse, cosmeticsResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-hub/main/src/data/apiItems.json"
      ),
      fetch(
        "https://raw.githubusercontent.com/PokeMMO-Tools/pokemmo-data/main/data/items-cosmetic.json"
      ),
    ]);

    if (!apiItemsResponse.ok || !cosmeticsResponse.ok) {
      return res.status(502).send("Unable to load cosmetic data");
    }

    const apiItems = await apiItemsResponse.json();
    const cosmetics = await cosmeticsResponse.json();

    // Build a set of IDs that are actually cosmetic API IDs.
    const cosmeticApiIds = new Set<number>();

    for (const cosmetic of cosmetics) {
      const ids = Array.isArray(cosmetic.item_id)
        ? cosmetic.item_id
        : [cosmetic.item_id];

      for (const id of ids) {
        const numericId = Number(id);

        if (Number.isFinite(numericId)) {
          cosmeticApiIds.add(numericId);
        }
      }
    }

    // Convert API cosmetic IDs to the internal renderer IDs.
    const convertedParams = params.split(",").map((value) => {
      const id = Number(value);

      if (!cosmeticApiIds.has(id)) {
        return id;
      }

      const mapping = apiItems.find(
        (item: any) => Number(item.apiID) === id
      );

      return mapping ? Number(mapping.id) : id;
    });

    const rendererUrl =
      `https://apis.fiereu.de/pokemmoclothes/v1/` +
      `${scene}/2/1/${convertedParams.join("/")}.png`;

    console.log("Cosmetic renderer:", rendererUrl);

    const response = await fetch(rendererUrl);

    if (!response.ok) {
      return res.status(response.status).send("Renderer unavailable");
    }

    const image = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600"
    );

    return res.status(200).send(image);
  } catch (error) {
    console.error("Cosmetic renderer error:", error);
    return res.status(500).send("Cosmetic renderer error");
  }
}