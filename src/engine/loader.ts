import type { Character, MagicInfo, SpecialAbilityDef, TauntsInfo, ReactionsInfo } from '../types/game';
import { GAME_LIFE } from '../types/game';
import { findMeta } from '../data/characters';

const IMG_BASE = '/images/characters/';
const DATA_BASE = '/characters/';

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    // Vite dev server returns index.html (text/html, status 200) for missing public files
    if ((res.headers.get('content-type') ?? '').includes('text/html')) return null;
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

export async function loadCharacter(namePath: string, inheritLife?: number): Promise<Character> {
  const meta = findMeta(namePath);
  if (!meta) throw new Error(`Unknown character: ${namePath}`);

  const base = `${DATA_BASE}${namePath}/`;

  const [magicInfo, tauntsInfo, reactionsInfo, specialAbilities, drunkSpecialAbilities, bio, asciiArt] =
    await Promise.all([
      fetchJSON<MagicInfo>(`${base}magic.json`),
      fetchJSON<TauntsInfo>(`${base}taunts.json`),
      fetchJSON<ReactionsInfo>(`${base}reactions.json`),
      fetchJSON<Record<string, SpecialAbilityDef>>(`${base}special.json`),
      fetchJSON<Record<string, SpecialAbilityDef>>(`${base}drunk_special.json`),
      fetchText(`${base}bio.txt`),
      fetchText(`${base}ascii_art.txt`),
    ]);

  const { faceImagePrefix, blastImagePrefix, blastCount } = meta;

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
    imageLeft:  `${IMG_BASE}${faceImagePrefix}_mf_face_left.png`,
    imageRight: `${IMG_BASE}${faceImagePrefix}_mf_face_right.png`,
    blastImagesLeft:  Array.from({ length: blastCount }, (_, i) => `${IMG_BASE}${blastImagePrefix}_mf_blast_${i}_face_left.png`),
    blastImagesRight: Array.from({ length: blastCount }, (_, i) => `${IMG_BASE}${blastImagePrefix}_mf_blast_${i}_face_right.png`),
    affectedBy: {},
    savedMagicInfo: null,
    savedTauntsInfo: null,
    isDrunk: false,
  };
}
