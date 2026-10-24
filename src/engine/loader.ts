import type { Character, TauntsInfo, ReactionsInfo } from '../types/game';
import { GAME_LIFE } from '../types/game';
import { findMeta, CHARACTER_AFFINITIES } from '../data/characters';
import { BLAST_COUNTS } from 'virtual:blast-counts';

const BASE = import.meta.env.BASE_URL;
const IMG_BASE = `${BASE}images/characters/`;
const ON_CAST = `${IMG_BASE}on_cast/`;
const ON_IMPACT = `${IMG_BASE}on_impact/`;
const DATA_BASE = `${BASE}characters/`;

type Facing = 'left' | 'right';

export function faceUrl(imagePrefix: string, facing: Facing): string {
  return `${IMG_BASE}${imagePrefix}_mf_face_${facing}.png`;
}

export function hitUrl(imagePrefix: string, facing: Facing): string {
  return `${ON_IMPACT}${imagePrefix}_mf_hit_face_${facing}.png`;
}

export function blastUrls(imagePrefix: string, facing: Facing): string[] {
  return Array.from(
    { length: BLAST_COUNTS[imagePrefix] ?? 0 },
    (_, i) => `${ON_CAST}${imagePrefix}_mf_blast_${i}_face_${facing}.png`,
  );
}

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const loreCache = new Map<string, Promise<string[]>>();

export function loadLore(namePath: string): Promise<string[]> {
  const cached = loreCache.get(namePath);
  if (cached) return cached;
  const pending = fetchJSON<string[]>(`${DATA_BASE}${namePath}/lore.json`).then(
    (facts) => {
      const lore = (facts ?? []).filter((f) => f.length > 0);
      // Don't cache a failed/empty fetch, so a flaky connection can retry later
      if (lore.length === 0) loreCache.delete(namePath);
      return lore;
    },
  );
  loreCache.set(namePath, pending);
  return pending;
}

const bioCache = new Map<string, Promise<string>>();
// Resolved bios, so a popup can show an already-loaded bio without a flash
const bioText = new Map<string, string>();

export function loadBio(namePath: string): Promise<string> {
  const cached = bioCache.get(namePath);
  if (cached) return cached;
  const pending = fetch(`${DATA_BASE}${namePath}/bio.txt`)
    .then((r) => (r.ok ? r.text() : ''))
    .catch(() => '')
    .then((t) => {
      const bio = t.trim();
      if (bio) bioText.set(namePath, bio);
      else bioCache.delete(namePath); // retry later rather than cache a failure
      return bio;
    });
  bioCache.set(namePath, pending);
  return pending;
}

export function peekBio(namePath: string): string | undefined {
  return bioText.get(namePath);
}

export async function loadCharacter(
  namePath: string,
  inheritLife?: number,
): Promise<Character> {
  const meta = findMeta(namePath);
  if (!meta) throw new Error(`Unknown character: ${namePath}`);

  const { imagePrefix } = meta;
  const base = `${DATA_BASE}${namePath}/`;

  const [tauntsInfo, reactionsInfo] = await Promise.all([
    fetchJSON<TauntsInfo>(`${base}taunts.json`),
    fetchJSON<ReactionsInfo>(`${base}reactions.json`),
  ]);

  return {
    namePath,
    displayName: meta.displayName,
    life: inheritLife ?? GAME_LIFE,
    tauntsInfo: tauntsInfo ?? null,
    reactionsInfo: reactionsInfo ?? null,
    affinity: CHARACTER_AFFINITIES[imagePrefix]!,
    imageLeft: faceUrl(imagePrefix, 'left'),
    imageRight: faceUrl(imagePrefix, 'right'),
    hitImageLeft: hitUrl(imagePrefix, 'left'),
    hitImageRight: hitUrl(imagePrefix, 'right'),
    blastImagesLeft: blastUrls(imagePrefix, 'left'),
    blastImagesRight: blastUrls(imagePrefix, 'right'),
  };
}
