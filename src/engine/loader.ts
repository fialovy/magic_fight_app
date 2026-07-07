import type { Character, MagicInfo, SpecialAbilityDef, TauntsInfo, ReactionsInfo } from '../types/game';
import { GAME_LIFE } from '../types/game';
import { findMeta } from '../data/characters';

const IMG_BASE    = '/images/characters/';
const ON_CAST     = `${IMG_BASE}on_cast/`;
const ON_IMPACT   = `${IMG_BASE}on_impact/`;
const DATA_BASE   = '/characters/';

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

async function fetchText(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

// Probes HEAD requests until a 404, caches result per prefix.
const blastCountCache = new Map<string, number>();

export async function probeBlastCount(imagePrefix: string): Promise<number> {
  if (blastCountCache.has(imagePrefix)) return blastCountCache.get(imagePrefix)!;
  let i = 0;
  while (i < 30) {
    const res = await fetch(`${ON_CAST}${imagePrefix}_mf_blast_${i}_face_right.png`, { method: 'HEAD' });
    if (!res.ok) break;
    i++;
  }
  blastCountCache.set(imagePrefix, i);
  return i;
}

export async function loadCharacter(namePath: string, inheritLife?: number): Promise<Character> {
  const meta = findMeta(namePath);
  if (!meta) throw new Error(`Unknown character: ${namePath}`);

  const base = `${DATA_BASE}${namePath}/`;
  const { imagePrefix, hasDrunkSpecial } = meta;

  const [magicInfo, tauntsInfo, reactionsInfo, specialAbilities, drunkSpecialAbilities, bio, asciiArt, blastCount] =
    await Promise.all([
      fetchJSON<MagicInfo>(`${base}magic.json`),
      fetchJSON<TauntsInfo>(`${base}taunts.json`),
      fetchJSON<ReactionsInfo>(`${base}reactions.json`),
      fetchJSON<Record<string, SpecialAbilityDef>>(`${base}special.json`),
      hasDrunkSpecial
        ? fetchJSON<Record<string, SpecialAbilityDef>>(`${base}drunk_special.json`)
        : Promise.resolve(null),
      fetchText(`${base}bio.txt`),
      fetchText(`${base}ascii_art.txt`),
      probeBlastCount(imagePrefix),
    ]);

  return {
    namePath,
    displayName: meta.displayName,
    life: inheritLife ?? GAME_LIFE,
    magicInfo: magicInfo!,
    specialAbilities: specialAbilities ?? {},
    drunkSpecialAbilities: drunkSpecialAbilities ?? {},
    tauntsInfo: tauntsInfo ?? null,
    reactionsInfo: reactionsInfo ?? null,
    bio: bio?.trim() ?? '',
    asciiArt: asciiArt?.trim() ?? null,
    imageLeft:      `${IMG_BASE}${imagePrefix}_mf_face_left.png`,
    imageRight:     `${IMG_BASE}${imagePrefix}_mf_face_right.png`,
    hitImageLeft:   `${ON_IMPACT}${imagePrefix}_mf_hit_face_left.png`,
    hitImageRight:  `${ON_IMPACT}${imagePrefix}_mf_hit_face_right.png`,
    blastImagesLeft:  Array.from({ length: blastCount }, (_, i) => `${ON_CAST}${imagePrefix}_mf_blast_${i}_face_left.png`),
    blastImagesRight: Array.from({ length: blastCount }, (_, i) => `${ON_CAST}${imagePrefix}_mf_blast_${i}_face_right.png`),
    affectedBy: {},
    savedMagicInfo: null,
    savedTauntsInfo: null,
    isDrunk: false,
  };
}
