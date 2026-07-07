export interface CharacterMeta {
  namePath: string;
  displayName: string;
  imagePrefix: string;   // prefix for all image files: {prefix}_mf_face_{dir}.png etc.
  isVariant: boolean;    // shapeshifted form — not shown on the character select screen
  hasDrunkSpecial: boolean; // has a drunk_special.json (currently only Winston)
}

export const CHARACTER_REGISTRY: CharacterMeta[] = [
  { namePath: 'adrian',             displayName: 'Adrian',        imagePrefix: 'adrian',        isVariant: false, hasDrunkSpecial: false },
  { namePath: 'anton',              displayName: 'Anton',         imagePrefix: 'anton',         isVariant: false, hasDrunkSpecial: false },
  { namePath: 'bastion',            displayName: 'Bastion',       imagePrefix: 'bastion',       isVariant: false, hasDrunkSpecial: false },
  { namePath: 'lucian',             displayName: 'Lucian',        imagePrefix: 'lucian',        isVariant: false, hasDrunkSpecial: false },
  { namePath: 'nora',               displayName: 'Nora',          imagePrefix: 'nora',          isVariant: false, hasDrunkSpecial: false },
  { namePath: 'sandoval',           displayName: 'Sandoval',      imagePrefix: 'sandoval',      isVariant: false, hasDrunkSpecial: false },
  { namePath: 'stella',             displayName: 'Stella',        imagePrefix: 'stella',        isVariant: false, hasDrunkSpecial: false },
  { namePath: 'winfield',           displayName: 'Winfield',      imagePrefix: 'winfield',      isVariant: false, hasDrunkSpecial: false },
  { namePath: 'winston',            displayName: 'Winston',       imagePrefix: 'winston',       isVariant: false, hasDrunkSpecial: true  },
  { namePath: 'nora/norm',          displayName: 'Norm',          imagePrefix: 'norm',          isVariant: true,  hasDrunkSpecial: false },
  { namePath: 'nora/meadow_sprite', displayName: 'Meadow Sprite', imagePrefix: 'meadow_sprite', isVariant: true,  hasDrunkSpecial: false },
];

export function findMeta(namePath: string): CharacterMeta | undefined {
  return CHARACTER_REGISTRY.find(m => m.namePath === namePath);
}

export const SELECTABLE_CHARACTERS = CHARACTER_REGISTRY.filter(m => !m.isVariant);
