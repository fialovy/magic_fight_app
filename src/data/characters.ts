export interface CharacterMeta {
  namePath: string;
  displayName: string;
  imagePrefix: string;   // prefix for all image files: {prefix}_mf_face_{dir}.png, {prefix}_mf_blast_{n}_face_{dir}.png
  blastCount: number;    // number of casting art images available (0-indexed)
  isVariant: boolean;    // shapeshifted form — not shown on the character select screen
  hasDrunkSpecial: boolean; // has a drunk_special.json (currently only Winston)
}

export const CHARACTER_REGISTRY: CharacterMeta[] = [
  { namePath: 'adrian',             displayName: 'Adrian',       imagePrefix: 'adrian',        blastCount: 7, isVariant: false, hasDrunkSpecial: false },
  { namePath: 'anton',              displayName: 'Anton',        imagePrefix: 'anton',         blastCount: 4, isVariant: false, hasDrunkSpecial: false },
  { namePath: 'bastion',            displayName: 'Bastion',      imagePrefix: 'bastion',       blastCount: 5, isVariant: false, hasDrunkSpecial: false },
  { namePath: 'lucian',             displayName: 'Lucian',       imagePrefix: 'lucian',        blastCount: 6, isVariant: false, hasDrunkSpecial: false },
  { namePath: 'nora',               displayName: 'Nora',         imagePrefix: 'nora',          blastCount: 7, isVariant: false, hasDrunkSpecial: false },
  { namePath: 'sandoval',           displayName: 'Sandoval',     imagePrefix: 'sandoval',      blastCount: 4, isVariant: false, hasDrunkSpecial: false },
  { namePath: 'stella',             displayName: 'Stella',       imagePrefix: 'stella',        blastCount: 4, isVariant: false, hasDrunkSpecial: false },
  { namePath: 'winfield',           displayName: 'Winfield',     imagePrefix: 'winfield',      blastCount: 4, isVariant: false, hasDrunkSpecial: false },
  { namePath: 'winston',            displayName: 'Winston',      imagePrefix: 'winston',       blastCount: 7, isVariant: false, hasDrunkSpecial: true  },
  { namePath: 'nora/norm',          displayName: 'Norm',         imagePrefix: 'norm',          blastCount: 6, isVariant: true,  hasDrunkSpecial: false },
  { namePath: 'nora/meadow_sprite', displayName: 'Meadow Sprite',imagePrefix: 'meadow_sprite', blastCount: 3, isVariant: true,  hasDrunkSpecial: false },
];

export function findMeta(namePath: string): CharacterMeta | undefined {
  return CHARACTER_REGISTRY.find(m => m.namePath === namePath);
}

export const SELECTABLE_CHARACTERS = CHARACTER_REGISTRY.filter(m => !m.isVariant);
