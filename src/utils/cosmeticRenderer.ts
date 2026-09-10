export const DEFAULT_CLOTHES = {
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
  clothes: Record<number, number>
) {
  const c = { ...DEFAULT_CLOTHES, ...clothes };

  return (
    `https://apis.fiereu.de/pokemmoclothes/v1/${sceneId}/2/1/` +
    `${c[6]}/${c[12]}/${c[4]}/${c[5]}/${c[8]}/${c[3]}/` +
    `${c[2]}/${c[10]}/${c[9]}/${c[7]}.png`
  );
}
