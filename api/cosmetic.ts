export default async function handler(req: any, res: any) {
  try {
    const scene = String(req.query.scene || "2");
    const gender = String(req.query.gender || "2");
    const params = String(req.query.params || "");

    if (!/^\d+$/.test(scene)) {
      return res.status(400).send("Invalid scene");
    }

    if (!/^\d+$/.test(gender)) {
      return res.status(400).send("Invalid gender");
    }

    if (!/^\d+(,\d+){9}$/.test(params)) {
      return res.status(400).send("Invalid cosmetic parameters");
    }

    /*
     * IMPORTANT:
     *
     * CosmeticBuilder already sends INTERNAL renderer IDs.
     *
     * Do not convert them through apiItems.json here.
     */

    const rendererUrl =
      `https://apis.fiereu.de/pokemmoclothes/v1/` +
      `${scene}/${gender}/1/${params
        .split(",")
        .join("/")}.png`;

    console.log(
      "Cosmetic renderer:",
      rendererUrl
    );

    const response =
      await fetch(rendererUrl);

    if (!response.ok) {
      return res
        .status(response.status)
        .send("Renderer unavailable");
    }

    const image =
      Buffer.from(
        await response.arrayBuffer()
      );

    res.setHeader(
      "Content-Type",
      "image/png"
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600"
    );

    return res
      .status(200)
      .send(image);
  } catch (error) {
    console.error(
      "Cosmetic renderer error:",
      error
    );

    return res
      .status(500)
      .send(
        "Cosmetic renderer error"
      );
  }
}