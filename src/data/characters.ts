import type { CharacterAffinity } from '../types/game';

export const CHARACTER_AFFINITIES: Record<string, CharacterAffinity> = {
  sandoval:      { primary: 'star',             secondary: 'blue'     },
  winston:       { primary: 'blue',             secondary: 'square'   },
  winfield:      { primary: 'triangle',         secondary: 'blue'     },
  stella:        { primary: 'red',              secondary: 'star'     },
  nora:          { primary: 'heart',            secondary: 'purple'   },
  norm:          { primary: 'heart',            secondary: 'purple'   },
  meadow_sprite: { primary: 'heart',            secondary: 'purple'   },
  bastion:       { primary: 'square',           secondary: 'red'      },
  adrian:        { primary: 'purple',           secondary: 'triangle' },
  anton:         { primary: 'vertical-stripe',  secondary: 'star'     },
  lucian:        { primary: 'green',            secondary: 'square'   },
};

export interface CharacterMeta {
  namePath: string;
  displayName: string;
  imagePrefix: string;
  isVariant: boolean;
}

export const CHARACTER_REGISTRY: CharacterMeta[] = [
  { namePath: 'adrian',             displayName: 'Adrian',        imagePrefix: 'adrian',        isVariant: false },
  { namePath: 'anton',              displayName: 'Anton',         imagePrefix: 'anton',         isVariant: false },
  { namePath: 'bastion',            displayName: 'Bastion',       imagePrefix: 'bastion',       isVariant: false },
  { namePath: 'lucian',             displayName: 'Lucian',        imagePrefix: 'lucian',        isVariant: false },
  { namePath: 'nora',               displayName: 'Nora',          imagePrefix: 'nora',          isVariant: false },
  { namePath: 'sandoval',           displayName: 'Sandoval',      imagePrefix: 'sandoval',      isVariant: false },
  { namePath: 'stella',             displayName: 'Stella',        imagePrefix: 'stella',        isVariant: false },
  { namePath: 'winfield',           displayName: 'Winfield',      imagePrefix: 'winfield',      isVariant: false },
  { namePath: 'winston',            displayName: 'Winston',       imagePrefix: 'winston',       isVariant: false },
  { namePath: 'nora/norm',          displayName: 'Norm',          imagePrefix: 'norm',          isVariant: true  },
  { namePath: 'nora/meadow_sprite', displayName: 'Meadow Sprite', imagePrefix: 'meadow_sprite', isVariant: true  },
];

export function findMeta(namePath: string): CharacterMeta | undefined {
  return CHARACTER_REGISTRY.find(m => m.namePath === namePath);
}

export const SELECTABLE_CHARACTERS = CHARACTER_REGISTRY.filter(m => !m.isVariant);
