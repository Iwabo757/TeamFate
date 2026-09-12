Directional cosmetic renderer patch

Replace:
  src/renderer/renderer.ts
  public/team-fate-renderer/manifest.json

Copy the cosmetics/ directory contents into:
  public/team-fate-renderer/cosmetics/

The PokeMMO addons PAK stores five 57x56 render layers per cosmetic.
The manifest now exposes them as frames[0..4].
