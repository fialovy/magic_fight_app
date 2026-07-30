import type { CharacterAffinity } from '../types/game';

// particular dimensions that each character has a more powerful hit with
export const CHARACTER_AFFINITIES: Record<string, CharacterAffinity> = {
  sandoval: { primary: 'star', secondary: 'blue' },
  winston: { primary: 'blue', secondary: 'square' },
  winfield: { primary: 'triangle', secondary: 'blue' },
  stella: { primary: 'red', secondary: 'star' },
  nora: { primary: 'heart', secondary: 'purple' },
  norm: { primary: 'heart', secondary: 'purple' },
  meadow_sprite: { primary: 'heart', secondary: 'purple' },
  bastion: { primary: 'square', secondary: 'red' },
  adrian: { primary: 'purple', secondary: 'triangle' },
  anton: { primary: 'vertical-stripe', secondary: 'star' },
  lucian: { primary: 'green', secondary: 'square' },
};

export interface CharacterMeta {
  namePath: string;
  displayName: string;
  imagePrefix: string;
  // for now this only refers to shapeshifting, which no longer does anything
  // meaningful for the game itself, but there could be other ways to 'change' a
  // character in the future
  isVariant: boolean;
}

export const CHARACTER_REGISTRY: Record<string, CharacterMeta> = {
  adrian: {
    namePath: 'adrian',
    displayName: 'Adrian',
    imagePrefix: 'adrian',
    isVariant: false,
  },
  anton: {
    namePath: 'anton',
    displayName: 'Anton',
    imagePrefix: 'anton',
    isVariant: false,
  },
  bastion: {
    namePath: 'bastion',
    displayName: 'Bastion',
    imagePrefix: 'bastion',
    isVariant: false,
  },
  lucian: {
    namePath: 'lucian',
    displayName: 'Lucian',
    imagePrefix: 'lucian',
    isVariant: false,
  },
  nora: {
    namePath: 'nora',
    displayName: 'Nora',
    imagePrefix: 'nora',
    isVariant: false,
  },
  sandoval: {
    namePath: 'sandoval',
    displayName: 'Sandoval',
    imagePrefix: 'sandoval',
    isVariant: false,
  },
  stella: {
    namePath: 'stella',
    displayName: 'Stella',
    imagePrefix: 'stella',
    isVariant: false,
  },
  winfield: {
    namePath: 'winfield',
    displayName: 'Winfield',
    imagePrefix: 'winfield',
    isVariant: false,
  },
  winston: {
    namePath: 'winston',
    displayName: 'Winston',
    imagePrefix: 'winston',
    isVariant: false,
  },
  'nora/norm': {
    namePath: 'nora/norm',
    displayName: 'Norm',
    imagePrefix: 'norm',
    isVariant: true,
  },
  'nora/meadow_sprite': {
    namePath: 'nora/meadow_sprite',
    displayName: 'Meadow Sprite',
    imagePrefix: 'meadow_sprite',
    isVariant: true,
  },
};

export function findMeta(namePath: string): CharacterMeta | undefined {
  return CHARACTER_REGISTRY[namePath];
}

export const SELECTABLE_CHARACTERS = Object.values(CHARACTER_REGISTRY).filter(
  (m) => !m.isVariant,
);
