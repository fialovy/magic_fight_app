import type { Character, ReactionsInfo, TauntsInfo } from '../types/game';
import { pick, roll } from './random';

function leafName(namePath: string): string {
  return namePath.split('/').pop() ?? namePath;
}

function pickLine(
  info: TauntsInfo | ReactionsInfo | null,
  opponentNamePath?: string,
): string | null {
  if (!info) return null;
  const pool = [...info.general];
  if (opponentNamePath) {
    const specific = info.opponents?.[leafName(opponentNamePath)];
    if (specific?.length) pool.push(...specific);
  }
  if (!pool.length || !roll(info.chance)) return null;
  return pick(pool);
}

export function pickReaction(
  character: Character,
  opponentNamePath?: string,
): string | null {
  return pickLine(character.reactionsInfo, opponentNamePath);
}

export function pickTaunt(
  character: Character,
  opponentNamePath?: string,
): string | null {
  return pickLine(character.tauntsInfo, opponentNamePath);
}
