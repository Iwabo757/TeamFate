import manifest from './manifest.json';
import { renderCharacter } from './renderer';

// Put the extracted assets under /public/team-fate-renderer/
const canvas = await renderCharacter({
  manifest,
  baseUrl: '/team-fate-renderer',
  skin: 1,
  frame: 0,
  scale: 4,
  cosmetics: {
    hat: 'Backwards Cap',
    hair: 'Default Hair',
    top: 'T-Shirt',
    pants: 'Pants',
    shoes: 'Shoes',
    face: 'Moustache',
  },
});

previewElement.replaceChildren(canvas);
