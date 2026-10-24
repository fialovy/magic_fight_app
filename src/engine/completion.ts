import {
  type CharacterMeta,
  SELECTABLE_CHARACTERS,
  formsOf,
  opponentsOf,
} from '../data/characters';
import { type ProgressStore, getCharacterProgress } from './progress';

export interface CompletionSummary {
  beaten: number;
  opponents: number;
  loreUnlocked: number;
  loreTotal: number;
  complete: boolean;
}

// Unlocked entries among a character's (or form's) loreCount lore entries.
// Stored indices are unique, so counting the in-range ones is enough.
export function unlockedLoreCount(
  store: ProgressStore,
  namePath: string,
  loreCount: number,
): number {
  return getCharacterProgress(store, namePath).lore.filter((i) => i < loreCount)
    .length;
}

// How many of a character's possible opponents they've beaten
export function beatenCount(store: ProgressStore, meta: CharacterMeta): number {
  const beaten = getCharacterProgress(store, meta.namePath).beaten;
  return opponentsOf(meta).filter((o) => beaten.includes(o.namePath)).length;
}

// A character is complete once they've beaten every opponent and every lore
// entry is unlocked, across all of their shapeshift forms. Lore that hasn't
// loaded yet counts as incomplete, so nothing unlocks early.
export function summarizeCompletion(
  meta: CharacterMeta,
  store: ProgressStore,
  loreByPath: Record<string, string[]>,
): CompletionSummary {
  const opponents = opponentsOf(meta);
  const beaten = beatenCount(store, meta);

  let loreUnlocked = 0;
  let loreTotal = 0;
  let loreLoaded = true;
  for (const form of formsOf(meta)) {
    const lore = loreByPath[form.namePath];
    if (lore === undefined) {
      loreLoaded = false;
      continue;
    }
    loreTotal += lore.length;
    loreUnlocked += unlockedLoreCount(store, form.namePath, lore.length);
  }

  return {
    beaten,
    opponents: opponents.length,
    loreUnlocked,
    loreTotal,
    complete:
      loreLoaded && beaten === opponents.length && loreUnlocked === loreTotal,
  };
}

export function isEverythingComplete(
  store: ProgressStore,
  loreByPath: Record<string, string[]>,
): boolean {
  return SELECTABLE_CHARACTERS.every(
    (m) => summarizeCompletion(m, store, loreByPath).complete,
  );
}
