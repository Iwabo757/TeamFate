export default async function handler(
  req: any,
  res: any
) {
  try {
    const scene = Number(
      req.query.scene ?? 2
    );

    const gender = Number(
      req.query.gender ?? 2
    );

    const params = String(
      req.query.params ?? ""
    );

    /*
     * Validate scene.
     */

    if (
      !Number.isInteger(scene) ||
      scene < 1 ||
      scene > 3
    ) {
      return res
        .status(400)
        .send("Invalid scene");
    }

    /*
     * Validate gender.
     *
     * 1 = Female
     * 2 = Male
     */

    if (
      gender !== 1 &&
      gender !== 2
    ) {
      return res
        .status(400)
        .send("Invalid gender");
    }

    /*
     * Renderer requires exactly
     * ten numeric cosmetic values.
     */

    if (
      !/^\d+(,\d+){9}$/.test(params)
    ) {
      return res
        .status(400)
        .send(
          "Invalid cosmetic parameters"
        );
    }

    /*
     * IMPORTANT:
     *
     * The CosmeticBuilder already stores
     * renderer/internal IDs.
     *
     * DO NOT convert them through apiItems.json.
     *
     * The previous version could accidentally
     * convert a valid internal renderer ID
     * into another cosmetic's API ID.
     */

    const rendererParams =
      params
        .split(",")
        .map((value) => {
          const number = Number(value);

          if (
            !Number.isInteger(number) ||
            number < 0
          ) {
            throw new Error(
              "Invalid renderer ID"
            );
          }

          return number;
        });

    /*
     * Build the actual PokeMMO character
     * renderer URL.
     *
     * Format:
     *
     * /v1/
     *   scene/
     *   gender/
     *   character/
     *   back/
     *   bicycle/
     *   eyes/
     *   face/
     *   gloves/
     *   hair/
     *   hat/
     *   legs/
     *   shoes/
     *   top
     */

    const rendererUrl =
      `https://apis.fiereu.de/pokemmoclothes/v1/` +
      `${scene}/` +
      `${gender}/` +
      `1/` +
      `${rendererParams.join("/")}.png`;

    console.log(
      "Cosmetic renderer:",
      rendererUrl
    );

    /*
     * Request the image from the renderer.
     */

    const response = await fetch(
      rendererUrl
    );

    if (!response.ok) {
      console.error(
        "Renderer returned:",
        response.status,
        rendererUrl
      );

      return res
        .status(response.status)
        .send(
          "Renderer unavailable"
        );
    }

    const image =
      Buffer.from(
        await response.arrayBuffer()
      );

    /*
     * Return the PNG directly to the browser.
     */

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