import {
  loadRendererManifest,
  renderCharacterToDataUrl,
  type RendererManifest,
} from "../renderer/renderer";

export type LocalCosmeticSetup = {
  skin: number;
  frame: number;
  cosmetics: Partial<
    Record<
      | "back"
      | "pants"
      | "shoes"
      | "top"
      | "eyes"
      | "face"
      | "hair"
      | "held"
      | "hat"
      | "tool"
      | "mount",
      string
    >
  >;
};

let manifestPromise: Promise<RendererManifest> | null = null;

export function getRendererManifest() {
  if (!manifestPromise) {
    manifestPromise = loadRendererManifest();
  }

  return manifestPromise;
}

export async function getCosmeticSetupImage(
  setup: LocalCosmeticSetup
) {
  const manifest = await getRendererManifest();

  return renderCharacterToDataUrl({
    manifest,
    skin: setup.skin,
    frame: setup.frame,
    cosmetics: setup.cosmetics,
    scale: 6,
  });
}
