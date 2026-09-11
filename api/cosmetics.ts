import fs from "node:fs/promises";
import path from "node:path";

type ClientItem = {
  id: number;
  name?: string;
  desc?: string;
  icon_id?: number;
};

type RendererMapping = {
  internal_id: number;
  slot: number;
  name: string;
};

type CosmeticResult = {
  item_id: number;
  internal_id?: number;
  renderer_supported: boolean;
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

const COSMETIC_DESCRIPTION =
  "A cosmetic item which can be used to modify your appearance.";

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

  if (
    value.includes("bicycle") ||
    value.includes("bike") ||
    value.includes("motorcycle") ||
    value.includes("motorbike")
  ) return 12;

  if (value.includes("glove") || value.includes("boxing glove")) return 8;

  if (
    value.includes("shoe") ||
    value.includes("boots") ||
    value.includes("boot") ||
    value.includes("sandals") ||
    value.includes("sandal") ||
    value.includes("sneakers")
  ) return 9;

  if (
    value === "shorts" ||
    value.includes("pants") ||
    value.includes("trousers") ||
    value.includes("leggings") ||
    value.includes("skirt") ||
    value.includes("jeans")
  ) return 10;

  if (
    value.includes("contact") ||
    value.includes("glasses") ||
    value.includes("goggles") ||
    value.includes("sunglasses") ||
    value.includes("visor")
  ) return 4;

  if (
    value.includes("mask") ||
    value.includes("moustache") ||
    value.includes("mustache") ||
    value.includes("beard") ||
    value.includes("eyebrow") ||
    value.includes("fang") ||
    value.includes("face paint") ||
    value.includes("face")
  ) return 5;

  if (
    value.includes("wing") ||
    value.includes("cape") ||
    value.includes("backpiece") ||
    value.includes("back piece") ||
    value.includes("backpack") ||
    value.includes("quiver") ||
    value.includes("tail")
  ) return 6;

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
  ) return 11;

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
  ) return 3;

  if (
    value.includes("hairpin") ||
    value.includes("hair pin") ||
    value.includes("hair clip") ||
    value.includes("forehead") ||
    value.includes("earring") ||
    value.includes("earrings")
  ) return 1;

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
  ) return 2;

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
  ) return 7;

  return 0;
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function loadLocalItems(): Promise<ClientItem[]> {
  return readJson<ClientItem>(
    path.join(process.cwd(), "data", "items.json")
  );
}

async function loadRendererMap(): Promise<Record<string, RendererMapping>> {
  return readJson<Record<string, RendererMapping>>(
    path.join(process.cwd(), "data", "cosmetic-renderer-map.json")
  );
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method && req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const [clientItems, rendererMap] = await Promise.all([
      loadLocalItems(),
      loadRendererMap(),
    ]);

    const currentCosmetics = clientItems.filter(
      (item) =>
        item &&
        Number.isFinite(Number(item.id)) &&
        item.desc === COSMETIC_DESCRIPTION
    );

    const cosmetics: CosmeticResult[] = [];

    for (const clientItem of currentCosmetics) {
      const itemId = Number(clientItem.id);
      if (!Number.isFinite(itemId)) continue;

      const name = cleanName(
        typeof clientItem.name === "string" && clientItem.name.trim()
          ? clientItem.name
          : `Item ${itemId}`
      );

      const mapping = rendererMap[String(itemId)];
      const slot = mapping?.slot || inferSlot(name);

      if (!SLOT_NAMES[slot]) continue;

      cosmetics.push({
        item_id: itemId,
        ...(mapping?.internal_id
          ? { internal_id: mapping.internal_id }
          : {}),
        renderer_supported: Boolean(mapping?.internal_id),
        name,
        icon_id: Number(clientItem.icon_id) || itemId,
        slot,
        attribute: 0,
        festival: 0,
        limitation: 0,
        month: 0,
        year: 0,
      });
    }

    const unique = new Map<number, CosmeticResult>();
    for (const cosmetic of cosmetics) {
      if (!unique.has(cosmetic.item_id)) {
        unique.set(cosmetic.item_id, cosmetic);
      }
    }

    const result = Array.from(unique.values()).sort((a, b) => {
      if (a.slot !== b.slot) return a.slot - b.slot;
      return a.name.localeCompare(b.name);
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("X-Cosmetic-Count", String(result.length));
    res.setHeader(
      "X-Client-Cosmetic-Count",
      String(currentCosmetics.length)
    );
    res.setHeader(
      "X-Renderer-Mapped-Count",
      String(result.filter((item) => item.renderer_supported).length)
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Cosmetic catalog error:", error);
    return res.status(500).json({
      error: "Failed to build cosmetic catalog",
    });
  }
}
