import type { Character, TauntsInfo, ReactionsInfo } from '../types/game';
import { GAME_LIFE } from '../types/game';
import { findMeta, CHARACTER_AFFINITIES } from '../data/characters';
import { BLAST_COUNTS } from 'virtual:blast-counts';

const BASE      = import.meta.env.BASE_URL;
const IMG_BASE  = `${BASE}images/characters/`;
const ON_CAST   = `${IMG_BASE}on_cast/`;
const ON_IMPACT = `${IMG_BASE}on_impact/`;
const DATA_BASE = `${BASE}characters/`;

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function loadCharacter(namePath: string, inheritLife?: number): Promise<Character> {
  const meta = findMeta(namePath);
  if (!meta) throw new Error(`Unknown character: ${namePath}`);

  const { imagePrefix } = meta;
  const base = `${DATA_BASE}${namePath}/`;
  const blastCount = BLAST_COUNTS[imagePrefix] ?? 0;

  const [tauntsInfo, reactionsInfo] = await Promise.all([
    fetchJSON<TauntsInfo>(`${base}taunts.json`),
    fetchJSON<ReactionsInfo>(`${base}reactions.json`),
  ]);

  return {
    namePath,
    displayName:    meta.displayName,
    life:           inheritLife ?? GAME_LIFE,
    tauntsInfo:     tauntsInfo ?? null,
    reactionsInfo:  reactionsInfo ?? null,
    affinity:       CHARACTER_AFFINITIES[imagePrefix]!,
    imageLeft:      `${IMG_BASE}${imagePrefix}_mf_face_left.png`,
    imageRight:     `${IMG_BASE}${imagePrefix}_mf_face_right.png`,
    hitImageLeft:   `${ON_IMPACT}${imagePrefix}_mf_hit_face_left.png`,
    hitImageRight:  `${ON_IMPACT}${imagePrefix}_mf_hit_face_right.png`,
    blastImagesLeft:  Array.from({ length: blastCount }, (_, i) => `${ON_CAST}${imagePrefix}_mf_blast_${i}_face_left.png`),
    blastImagesRight: Array.from({ length: blastCount }, (_, i) => `${ON_CAST}${imagePrefix}_mf_blast_${i}_face_right.png`),
  };
}
