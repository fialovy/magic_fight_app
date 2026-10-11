// Per-character progress, kept on the player's device only (localStorage).
// Lore is tracked by index into that character's lore.json, so new lore entries
// should be appended rather than inserted, or existing unlocks would shift.
//
// Shapeshift forms (e.g. 'nora/norm') keep their own lore, but count as their
// base character ('nora') for opponents beaten, in both directions.
const PROGRESS_KEY = 'mf_progress';

export interface CharacterProgress {
  lore: number[];
  beaten: string[];
}

export type ProgressStore = Record<string, CharacterProgress>;

const EMPTY: CharacterProgress = { lore: [], beaten: [] };

export function baseCharacterPath(namePath: string): string {
  return namePath.split('/')[0];
}

function addUnique<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list : [...list, item];
}

export function loadProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const store: ProgressStore = {};
    const entryFor = (path: string) => (store[path] ??= { lore: [], beaten: [] });
    for (const [namePath, value] of Object.entries(parsed)) {
      const entry = value as Partial<CharacterProgress> | null;
      const lore = Array.isArray(entry?.lore)
        ? entry.lore.filter((i) => Number.isInteger(i) && i >= 0)
        : [];
      const beaten = Array.isArray(entry?.beaten)
        ? entry.beaten.filter((p) => typeof p === 'string')
        : [];

      const own = entryFor(namePath);
      for (const i of lore) own.lore = addUnique(own.lore, i);
      // Opponent wins always live on the base character, keyed by base opponent
      const base = entryFor(baseCharacterPath(namePath));
      for (const p of beaten) base.beaten = addUnique(base.beaten, baseCharacterPath(p));
    }
    return store;
  } catch {
    return {};
  }
}

export function getCharacterProgress(
  store: ProgressStore,
  namePath: string,
): CharacterProgress {
  return store[namePath] ?? EMPTY;
}

// Prefer lore the player hasn't unlocked yet; once all are unlocked, pick any.
export function pickLoreIndex(count: number, unlocked: number[]): number {
  const fresh = Array.from({ length: count }, (_, i) => i).filter(
    (i) => !unlocked.includes(i),
  );
  const pool =
    fresh.length > 0 ? fresh : Array.from({ length: count }, (_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

// playerPath/opponentPath may be shapeshift forms: lore goes to the exact form
// the player won in, the opponent win goes to the base characters.
export function recordWin(
  playerPath: string,
  opponentPath: string,
  loreIndex: number | null,
): void {
  const store = loadProgress();

  const form = getCharacterProgress(store, playerPath);
  store[playerPath] = {
    ...form,
    lore: loreIndex === null ? form.lore : addUnique(form.lore, loreIndex),
  };

  const basePath = baseCharacterPath(playerPath);
  const base = getCharacterProgress(store, basePath);
  store[basePath] = {
    ...base,
    beaten: addUnique(base.beaten, baseCharacterPath(opponentPath)),
  };

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable; progress just won't persist */
  }
}
