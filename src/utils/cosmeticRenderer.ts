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

export function getCosmeticSetupImage(
  sceneId: number,
  genderId: number,
  clothes: Record<number, number>
) {
  const c = {
    ...DEFAULT_CLOTHES,
    ...clothes,
  };

  const params = [
    c[6],
    c[12],
    c[4],
    c[5],
    c[8],
    c[3],
    c[2],
    c[10],
    c[9],
    c[7],
  ];

  return `/api/cosmetic?scene=${sceneId}&gender=${genderId}&params=${params.join(
    ","
  )}`;
}