import type { Character } from '../types/game';
import { pick, roll } from './random';

function leafName(namePath: string): string {
  return namePath.split('/').pop() ?? namePath;
}

export function pickReaction(character: Character): string | null {
  const info = character.reactionsInfo;
  if (!info || !info.general.length) return null;
  if (roll(info.chance)) return pick(info.general);
  return null;
}

export function pickTaunt(character: Character, opponentNamePath?: string): string | null {
  const info = character.tauntsInfo;
  if (!info) return null;
  const pool = [...info.general];
  if (opponentNamePath) {
    const specific = info.opponents?.[leafName(opponentNamePath)];
    if (specific?.length) pool.push(...specific);
  }
  if (!pool.length || !roll(info.chance)) return null;
  return pick(pool);
}
