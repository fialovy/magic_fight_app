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

// A character is complete once they've beaten every opponent and every lore
// entry is unlocked, across all of their shapeshift forms. Lore that hasn't
// loaded yet counts as incomplete, so nothing unlocks early.
export function summarizeCompletion(
  meta: CharacterMeta,
  store: ProgressStore,
  loreByPath: Record<string, string[]>,
): CompletionSummary {
  const opponents = opponentsOf(meta);
  const beatenList = getCharacterProgress(store, meta.namePath).beaten;
  const beaten = opponents.filter((o) =>
    beatenList.includes(o.namePath),
  ).length;

  let loreUnlocked = 0;
  let loreTotal = 0;
  let loreLoaded = true;
  for (const form of formsOf(meta)) {
    const lore = loreByPath[form.namePath];
    if (lore === undefined) {
      loreLoaded = false;
      continue;
    }
    const unlocked = getCharacterProgress(store, form.namePath).lore;
    loreTotal += lore.length;
    loreUnlocked += lore.filter((_, i) => unlocked.includes(i)).length;
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
