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
  chooseLabel?: string;
  // shown on the per-form lore tabs for characters that have shapeshift forms
  formEmoji?: string;
  // shorter tab label when displayName is too long for the narrow form tabs
  formLabel?: string;
  // used in sentences like "unlock all of her lore"; falls back to "their"
  possessive?: string;
  // A shapeshift form of another character (e.g. Norm is a form of Nora):
  // not selectable on its own, nested under the base character's namePath, and
  // tracked with its own lore but its base character's opponent wins
  isVariant: boolean;
}

export const CHARACTER_REGISTRY: Record<string, CharacterMeta> = {
  adrian: {
    namePath: 'adrian',
    displayName: 'Adrian',
    imagePrefix: 'adrian',
    chooseLabel: 'Fine. Whatever.',
    isVariant: false,
    possessive: 'his',
  },
  anton: {
    namePath: 'anton',
    displayName: 'Anton',
    imagePrefix: 'anton',
    chooseLabel: 'Neat!',
    isVariant: false,
    possessive: 'his',
  },
  bastion: {
    namePath: 'bastion',
    displayName: 'Bastion',
    imagePrefix: 'bastion',
    chooseLabel: 'Choose!',
    isVariant: false,
    possessive: 'his',
  },
  lucian: {
    namePath: 'lucian',
    displayName: 'Lucian',
    imagePrefix: 'lucian',
    chooseLabel: 'Ready if you are!',
    isVariant: false,
    possessive: 'his',
  },
  nora: {
    namePath: 'nora',
    displayName: 'Nora',
    imagePrefix: 'nora',
    chooseLabel: 'Darn right, punk!',
    formEmoji: '♀️',
    isVariant: false,
    possessive: 'her/his/its',
  },
  sandoval: {
    namePath: 'sandoval',
    displayName: 'Sandoval',
    imagePrefix: 'sandoval',
    chooseLabel: "Let's GOOOO!",
    isVariant: false,
    possessive: 'his',
  },
  stella: {
    namePath: 'stella',
    displayName: 'Stella',
    imagePrefix: 'stella',
    chooseLabel: 'Heck yeah!',
    isVariant: false,
    possessive: 'her',
  },
  winfield: {
    namePath: 'winfield',
    displayName: 'Winfield',
    imagePrefix: 'winfield',
    chooseLabel: 'Valmis.',
    isVariant: false,
    possessive: 'his',
  },
  winston: {
    namePath: 'winston',
    displayName: 'Winston',
    imagePrefix: 'winston',
    chooseLabel: "Let's proceed.",
    isVariant: false,
    possessive: 'his',
  },
  'nora/norm': {
    namePath: 'nora/norm',
    displayName: 'Norm',
    imagePrefix: 'norm',
    formEmoji: '♂️',
    isVariant: true,
    possessive: 'his',
  },
  'nora/meadow_sprite': {
    namePath: 'nora/meadow_sprite',
    displayName: 'Meadow Sprite',
    imagePrefix: 'meadow_sprite',
    formEmoji: '🌿',
    formLabel: 'Sprite',
    isVariant: true,
    possessive: 'its',
  },
};

export function findMeta(namePath: string): CharacterMeta | undefined {
  return CHARACTER_REGISTRY[namePath];
}

export const SELECTABLE_CHARACTERS = Object.values(CHARACTER_REGISTRY).filter(
  (m) => !m.isVariant,
);

export function opponentsOf(meta: CharacterMeta): CharacterMeta[] {
  return SELECTABLE_CHARACTERS.filter((m) => m.namePath !== meta.namePath);
}

// A character plus any shapeshift forms nested under it (e.g. nora, nora/norm)
export function formsOf(meta: CharacterMeta): CharacterMeta[] {
  return [
    meta,
    ...Object.values(CHARACTER_REGISTRY).filter((m) =>
      m.namePath.startsWith(`${meta.namePath}/`),
    ),
  ];
}
