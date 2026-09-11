const DEFAULT_CLOTHES: Record<number, number> = {
  1: 0,
  2: 0,
  3: 1183,
  4: 1441,
  5: 1322,
  6: 0,
  7: 1323,
  8: 0,
  9: 1327,
  10: 1316,
  11: 0,
  12: 0,
};

/*
 * PokeMMO renderer slots:
 *
 * 1  Forehead
 * 2  Hat
 * 3  Hair
 * 4  Eyes
 * 5  Face
 * 6  Back
 * 7  Top
 * 8  Gloves
 * 9  Shoes
 * 10 Legs
 * 11 Rod
 * 12 Bicycle
 *
 * Renderer gender:
 *
 * 1 = Female
 * 2 = Male
 */

export function getCosmeticSetupImage(
  sceneId: number,
  genderId: number,
  clothes: Record<number, number>
) {
  const c = {
    ...DEFAULT_CLOTHES,
    ...clothes,
  };

  /*
   * The external renderer expects these
   * cosmetic slots in this exact order.
   */

  const params = [
    c[6] ?? 0,   // Back
    c[12] ?? 0,  // Bicycle
    c[4] ?? 0,   // Eyes
    c[5] ?? 0,   // Face
    c[8] ?? 0,   // Gloves
    c[3] ?? 0,   // Hair
    c[2] ?? 0,   // Hat
    c[10] ?? 0,  // Legs
    c[9] ?? 0,   // Shoes
    c[7] ?? 0,   // Top
  ];

  return (
    `/api/cosmetic` +
    `?scene=${encodeURIComponent(sceneId)}` +
    `&gender=${encodeURIComponent(genderId)}` +
    `&params=${encodeURIComponent(
      params.join(",")
    )}`
  );
}