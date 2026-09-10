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
  const c = {
    ...DEFAULT_CLOTHES,
    ...clothes,
  };

  const params = [
    c[6],  // back
    c[12], // bicycle
    c[4],  // eyes
    c[5],  // face
    c[8],  // gloves
    c[3],  // hair
    c[2],  // hat
    c[10], // legs
    c[9],  // shoes
    c[7],  // top
  ];

  const rendererBase =
    import.meta.env.VITE_COSMETIC_RENDERER_URL;

  if (!rendererBase) {
    return null;
  }

  return `${rendererBase}/${sceneId}/2/1/${params.join("/")}.png`;
}