export interface CharacterMeta {
  namePath: string;
  displayName: string;
  faceImagePrefix: string;
  blastImagePrefix: string;
  blastCount: number; // number of casting art images available for this character
  isVariant: boolean;  // is this another form of the character? (e.g., shapeshifted)
}

export const CHARACTER_REGISTRY: CharacterMeta[] = [
  { namePath: 'adrian',             displayName: 'Adrian',       faceImagePrefix: 'adrian',        blastImagePrefix: 'adrian',        blastCount: 5, isVariant: false },
  { namePath: 'anton',              displayName: 'Anton',        faceImagePrefix: 'anton',         blastImagePrefix: 'anton',         blastCount: 4, isVariant: false },
  { namePath: 'bastion',            displayName: 'Bastion',      faceImagePrefix: 'bastion',       blastImagePrefix: 'bastion',       blastCount: 3, isVariant: false },
  { namePath: 'lucian',             displayName: 'Lucian',       faceImagePrefix: 'lucian',        blastImagePrefix: 'lucian',        blastCount: 3, isVariant: false },
  { namePath: 'nora',               displayName: 'Nora',         faceImagePrefix: 'nora',          blastImagePrefix: 'nora',          blastCount: 3, isVariant: false },
  { namePath: 'sandoval',           displayName: 'Sandoval',     faceImagePrefix: 'sando',         blastImagePrefix: 'sando',         blastCount: 4, isVariant: false },
  { namePath: 'stella',             displayName: 'Stella',       faceImagePrefix: 'stella',        blastImagePrefix: 'stella',        blastCount: 4, isVariant: false },
  { namePath: 'winfield',           displayName: 'Winfield',     faceImagePrefix: 'winfield',      blastImagePrefix: 'winfield',      blastCount: 4, isVariant: false },
  { namePath: 'winston',            displayName: 'Winston',      faceImagePrefix: 'winston',       blastImagePrefix: 'winston',       blastCount: 4, isVariant: false },
  { namePath: 'nora/norm',          displayName: 'Norm',         faceImagePrefix: 'norm',          blastImagePrefix: 'norm',          blastCount: 3, isVariant: true },
  { namePath: 'nora/meadow_sprite', displayName: 'Meadow Sprite',faceImagePrefix: 'sprite',        blastImagePrefix: 'meadow_sprite', blastCount: 3, isVariant: true },
];

export function findMeta(namePath: string): CharacterMeta | undefined {
  return CHARACTER_REGISTRY.find(m => m.namePath === namePath);
}

export const SELECTABLE_CHARACTERS = CHARACTER_REGISTRY.filter(m => !m.isVariant);
