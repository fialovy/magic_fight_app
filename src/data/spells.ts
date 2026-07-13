import type {
  Spell, SpellColor, SpellShape, SpellFill, SpellDimensionKey,
  CharacterAffinity, PatternRule, CollisionOutcome, TimerResult,
} from '../types/game';

export const SPELL_COLORS: SpellColor[] = ['red', 'blue', 'green', 'purple'];
export const SPELL_SHAPES: SpellShape[] = ['heart', 'square', 'star', 'triangle'];
export const SPELL_FILLS:  SpellFill[]  = ['solid', 'vertical-stripe', 'horizontal-stripe'];

export const OUTCOME_DAMAGE: Record<CollisionOutcome, number> = {
  'decisive-win':  4,
  'win':           2,
  'neutral':       0,
  'loss':          2,
  'decisive-loss': 4,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomSpell(): Spell {
  return { color: pick(SPELL_COLORS), shape: pick(SPELL_SHAPES), fill: pick(SPELL_FILLS) };
}

function applyDimension(spell: Spell, dim: SpellDimensionKey): Spell {
  if ((SPELL_COLORS as string[]).includes(dim)) return { ...spell, color: dim as SpellColor };
  if ((SPELL_SHAPES as string[]).includes(dim)) return { ...spell, shape: dim as SpellShape };
  return { ...spell, fill: dim as SpellFill };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function spellKey(s: Spell) { return `${s.color}|${s.shape}|${s.fill}`; }

function uniqueSpell(generate: () => Spell, seen: Set<string>): Spell {
  let spell: Spell;
  do { spell = generate(); } while (seen.has(spellKey(spell)));
  seen.add(spellKey(spell));
  return spell;
}

/** 4-card hand: 1 forced to primary dimension, 1 to secondary, 2 random — then shuffled. All cards guaranteed distinct. */
export function generateHand(affinity: CharacterAffinity): Spell[] {
  const seen = new Set<string>();
  return shuffle([
    uniqueSpell(() => applyDimension(randomSpell(), affinity.primary),   seen),
    uniqueSpell(() => applyDimension(randomSpell(), affinity.secondary),  seen),
    uniqueSpell(() => randomSpell(), seen),
    uniqueSpell(() => randomSpell(), seen),
  ]);
}

export function getDimensionPower(dim: SpellDimensionKey, affinity: CharacterAffinity): number {
  if (affinity.primary === dim)   return 3;
  if (affinity.secondary === dim) return 2;
  return 1;
}

export function getContestedDimension(rule: PatternRule, opponentSpell: Spell): SpellDimensionKey {
  if (rule === 'match-color' || rule === 'avoid-color') return opponentSpell.color;
  if (rule === 'match-shape' || rule === 'avoid-shape') return opponentSpell.shape;
  return opponentSpell.fill;
}

export function checkPattern(rule: PatternRule, playerSpell: Spell, opponentSpell: Spell): boolean {
  switch (rule) {
    case 'match-color': return playerSpell.color === opponentSpell.color;
    case 'match-shape': return playerSpell.shape === opponentSpell.shape;
    case 'match-fill':  return playerSpell.fill  === opponentSpell.fill;
    case 'avoid-color': return playerSpell.color !== opponentSpell.color;
    case 'avoid-shape': return playerSpell.shape !== opponentSpell.shape;
    case 'avoid-fill':  return playerSpell.fill  !== opponentSpell.fill;
  }
}

/**
 * patternBonus: correct = +2, timeout = −1, wrong = −2
 * net = (yourPower − theirPower) + patternBonus
 * ≥3 decisive-win | 1-2 win | 0 neutral | -1 to -2 loss | ≤-3 decisive-loss
 */
export function resolveCollision(
  rule:             PatternRule,
  playerAffinity:   CharacterAffinity,
  opponentSpell:    Spell,
  opponentAffinity: CharacterAffinity,
  timerResult:      TimerResult,
): CollisionOutcome {
  const dim       = getContestedDimension(rule, opponentSpell);
  const yourPower = getDimensionPower(dim, playerAffinity);
  const theirPower = getDimensionPower(dim, opponentAffinity);
  const bonus     = timerResult === 'correct' ? 2 : timerResult === 'timeout' ? -1 : -2;
  const net       = (yourPower - theirPower) + bonus;

  if (net >= 3)  return 'decisive-win';
  if (net >= 1)  return 'win';
  if (net === 0) return 'neutral';
  if (net >= -2) return 'loss';
  return 'decisive-loss';
}

export function randomPatternRule(): PatternRule {
  return pick(['match-color', 'match-shape', 'match-fill', 'avoid-color', 'avoid-shape', 'avoid-fill']);
}

function forceAvoid(spell: Spell, rule: PatternRule, oppSpell: Spell): Spell {
  if (rule === 'avoid-color' && spell.color === oppSpell.color) {
    const others = SPELL_COLORS.filter(c => c !== oppSpell.color);
    return { ...spell, color: pick(others) };
  }
  if (rule === 'avoid-shape' && spell.shape === oppSpell.shape) {
    const others = SPELL_SHAPES.filter(s => s !== oppSpell.shape);
    return { ...spell, shape: pick(others) };
  }
  if (rule === 'avoid-fill' && spell.fill === oppSpell.fill) {
    const others = SPELL_FILLS.filter(f => f !== oppSpell.fill);
    return { ...spell, fill: pick(others) };
  }
  return spell;
}

/** Ensures at least one card satisfies the rule for the given opponent spell. Replaces a random card if not, preserving uniqueness. */
export function guaranteeMatch(hand: Spell[], rule: PatternRule, oppSpell: Spell): Spell[] {
  if (hand.some(s => checkPattern(rule, s, oppSpell))) return hand;
  const result     = [...hand];
  const replaceIdx = Math.floor(Math.random() * result.length);
  const seen       = new Set(result.filter((_, i) => i !== replaceIdx).map(spellKey));
  if (rule.startsWith('avoid-')) {
    result[replaceIdx] = uniqueSpell(() => forceAvoid(randomSpell(), rule, oppSpell), seen);
  } else {
    const dim = getContestedDimension(rule, oppSpell);
    result[replaceIdx] = uniqueSpell(() => applyDimension(randomSpell(), dim), seen);
  }
  return result;
}
