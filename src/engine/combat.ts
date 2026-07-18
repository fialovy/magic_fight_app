import type { Character } from '../types/game';
import { pick, roll } from './random';

export function pickReaction(character: Character): string | null {
  if (!character.reactionsInfo) return null;
  if (roll(character.reactionsInfo.chance)) return pick(character.reactionsInfo.reactions);
  return null;
}

export function pickTaunt(character: Character): string | null {
  if (!character.tauntsInfo) return null;
  if (roll(character.tauntsInfo.chance)) return pick(character.tauntsInfo.taunts);
  return null;
}
