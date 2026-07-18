import type {
  Spell, SpellColor, SpellShape, SpellFill, SpellDimensionKey,
  CharacterAffinity, PatternRule, CollisionOutcome, TimerResult,
} from '../types/game';

export const SPELL_COLORS: SpellColor[] = ['red', 'blue', 'green', 'purple'];
export const SPELL_SHAPES: SpellShape[] = ['heart', 'square', 'star', 'triangle'];
export const SPELL_FILLS:  SpellFill[]  = ['solid', 'vertical-stripe', 'horizontal-stripe', 'crosshatch', 'dots'];

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

export function getContestedDimensions(rule: PatternRule, opponentSpell: Spell): SpellDimensionKey[] {
  switch (rule) {
    case 'match-color':       case 'avoid-color':       return [opponentSpell.color];
    case 'match-shape':       case 'avoid-shape':       return [opponentSpell.shape];
    case 'match-fill':        case 'avoid-fill':        return [opponentSpell.fill];
    case 'match-color+shape': case 'avoid-color+shape': return [opponentSpell.color, opponentSpell.shape];
    case 'match-color+fill':  case 'avoid-color+fill':  return [opponentSpell.color, opponentSpell.fill];
    case 'match-shape+fill':  case 'avoid-shape+fill':  return [opponentSpell.shape, opponentSpell.fill];
  }
}

export function checkPattern(rule: PatternRule, playerSpell: Spell, opponentSpell: Spell): boolean {
  switch (rule) {
    case 'match-color':       return playerSpell.color === opponentSpell.color;
    case 'match-shape':       return playerSpell.shape === opponentSpell.shape;
    case 'match-fill':        return playerSpell.fill  === opponentSpell.fill;
    case 'avoid-color':       return playerSpell.color !== opponentSpell.color;
    case 'avoid-shape':       return playerSpell.shape !== opponentSpell.shape;
    case 'avoid-fill':        return playerSpell.fill  !== opponentSpell.fill;
    case 'match-color+shape': return playerSpell.color === opponentSpell.color && playerSpell.shape === opponentSpell.shape;
    case 'match-color+fill':  return playerSpell.color === opponentSpell.color && playerSpell.fill  === opponentSpell.fill;
    case 'match-shape+fill':  return playerSpell.shape === opponentSpell.shape && playerSpell.fill  === opponentSpell.fill;
    case 'avoid-color+shape': return playerSpell.color !== opponentSpell.color && playerSpell.shape !== opponentSpell.shape;
    case 'avoid-color+fill':  return playerSpell.color !== opponentSpell.color && playerSpell.fill  !== opponentSpell.fill;
    case 'avoid-shape+fill':  return playerSpell.shape !== opponentSpell.shape && playerSpell.fill  !== opponentSpell.fill;
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
  const dims       = getContestedDimensions(rule, opponentSpell);
  const yourPower  = Math.max(...dims.map(d => getDimensionPower(d, playerAffinity)));
  const theirPower = Math.max(...dims.map(d => getDimensionPower(d, opponentAffinity)));
  const bonus     = timerResult === 'correct' ? 2 : timerResult === 'timeout' ? -1 : -2;
  const net       = (yourPower - theirPower) + bonus;

  if (net >= 3)  return 'decisive-win';
  if (net >= 1)  return 'win';
  if (net === 0) return 'neutral';
  if (net >= -2) return 'loss';
  return 'decisive-loss';
}

export function randomPatternRule(): PatternRule {
  return pick([
    'match-color', 'match-shape', 'match-fill',
    'avoid-color', 'avoid-shape', 'avoid-fill',
    'match-color+shape', 'match-color+fill', 'match-shape+fill',
    'avoid-color+shape', 'avoid-color+fill', 'avoid-shape+fill',
  ]);
}

function makeValidSpell(rule: PatternRule, oppSpell: Spell): Spell {
  const b = randomSpell();
  const avoidColor = () => pick(SPELL_COLORS.filter(c => c !== oppSpell.color));
  const avoidShape = () => pick(SPELL_SHAPES.filter(s => s !== oppSpell.shape));
  const avoidFill  = () => pick(SPELL_FILLS.filter(f  => f !== oppSpell.fill));
  switch (rule) {
    case 'match-color':       return { ...b, color: oppSpell.color };
    case 'match-shape':       return { ...b, shape: oppSpell.shape };
    case 'match-fill':        return { ...b, fill:  oppSpell.fill  };
    case 'avoid-color':       return { ...b, color: b.color === oppSpell.color ? avoidColor() : b.color };
    case 'avoid-shape':       return { ...b, shape: b.shape === oppSpell.shape ? avoidShape() : b.shape };
    case 'avoid-fill':        return { ...b, fill:  b.fill  === oppSpell.fill  ? avoidFill()  : b.fill  };
    case 'match-color+shape': return { ...b, color: oppSpell.color, shape: oppSpell.shape };
    case 'match-color+fill':  return { ...b, color: oppSpell.color, fill:  oppSpell.fill  };
    case 'match-shape+fill':  return { ...b, shape: oppSpell.shape, fill:  oppSpell.fill  };
    case 'avoid-color+shape': return { ...b, color: b.color === oppSpell.color ? avoidColor() : b.color, shape: b.shape === oppSpell.shape ? avoidShape() : b.shape };
    case 'avoid-color+fill':  return { ...b, color: b.color === oppSpell.color ? avoidColor() : b.color, fill:  b.fill  === oppSpell.fill  ? avoidFill()  : b.fill  };
    case 'avoid-shape+fill':  return { ...b, shape: b.shape === oppSpell.shape ? avoidShape() : b.shape, fill:  b.fill  === oppSpell.fill  ? avoidFill()  : b.fill  };
  }
}

/** Ensures at least one card satisfies the rule for the given opponent spell. Replaces a random card if not, preserving uniqueness. */
export function guaranteeMatch(hand: Spell[], rule: PatternRule, oppSpell: Spell): Spell[] {
  if (hand.some(s => checkPattern(rule, s, oppSpell))) return hand;
  const result     = [...hand];
  const replaceIdx = Math.floor(Math.random() * result.length);
  const seen       = new Set(result.filter((_, i) => i !== replaceIdx).map(spellKey));
  result[replaceIdx] = uniqueSpell(() => makeValidSpell(rule, oppSpell), seen);
  return result;
}
