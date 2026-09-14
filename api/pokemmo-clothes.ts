const FIEREU_BASE = "https://apis.fiereu.de/pokemmoclothes/v1";
const ALLOWED_SCENES = new Set([1, 2, 3]);

function parseIntParam(value: unknown, fallback: number): number | null {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 0 || n > 99999) return null;
  return n;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method && req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const q = req.query ?? {};
    const scene = parseIntParam(q.scene, 2);
    const version = parseIntParam(q.version, 2);
    const gender = parseIntParam(q.gender, 1);

    if (scene === null || !ALLOWED_SCENES.has(scene)) {
      return res.status(400).json({ error: "Invalid scene" });
    }
    if (version === null || gender === null) {
      return res.status(400).json({ error: "Invalid version or gender" });
    }

    const slots: number[] = [];
    for (let i = 1; i <= 10; i++) {
      const value = parseIntParam(q[`s${i}`], 0);
      if (value === null) {
        return res.status(400).json({ error: `Invalid slot s${i}` });
      }
      slots.push(value);
    }

    const upstreamUrl = `${FIEREU_BASE}/${scene}/${version}/${gender}/${slots.join("/")}.png`;

    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
        "User-Agent": "Team-Fate-Cosmetic-Renderer/1.0",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Fiereu returned ${response.status}`,
        upstream: upstreamUrl,
      });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("X-Fiereu-URL", upstreamUrl);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("PokeMMO Clothes proxy error", error);
    return res.status(502).json({ error: "Unable to fetch PokeMMO Clothes image" });
  }
}
