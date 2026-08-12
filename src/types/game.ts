// ── Spell system ──────────────────────────────────────────────────────────────
export type SpellColor = 'red' | 'blue' | 'green' | 'purple' | 'orange';
export type SpellShape = 'heart' | 'square' | 'star' | 'triangle';
export type SpellFill = 'solid' | 'vertical-stripe' | 'crosshatch' | 'dots';
export type SpellRotation = 'clockwise' | 'counter-clockwise';
export type SpellDimensionKey =
  | SpellColor
  | SpellShape
  | SpellFill
  | SpellRotation;

export interface Spell {
  color: SpellColor;
  shape: SpellShape;
  fill: SpellFill;
  rotation: SpellRotation;
}

// give the characters some individual hidden strengths
export interface CharacterAffinity {
  primary: SpellDimensionKey; // power 3
  secondary: SpellDimensionKey; // power 2
  // everything else: power 1
}

export type PatternRule =
  | 'match-color'
  | 'match-shape'
  | 'match-fill'
  | 'match-rotation'
  | 'avoid-color'
  | 'avoid-shape'
  | 'avoid-fill'
  | 'avoid-rotation'
  | 'match-color+shape'
  | 'match-color+fill'
  | 'match-shape+fill'
  | 'match-color+rotation'
  | 'match-shape+rotation'
  | 'match-fill+rotation'
  | 'avoid-color+shape'
  | 'avoid-color+fill'
  | 'avoid-shape+fill'
  | 'avoid-color+rotation'
  | 'avoid-shape+rotation'
  | 'avoid-fill+rotation';

// affects the projectile visuals
export type CollisionOutcome =
  | 'decisive-win'
  | 'win'
  | 'neutral'
  | 'loss'
  | 'decisive-loss';

export type TimerResult = 'correct' | 'wrong' | 'timeout';

// total health bar to start out
export const GAME_LIFE = 20;
// timer steps down every N turns regardless of rule rotation
export const TIMER_STEP_TURNS = 5;

export type GameMode = 'guess' | 'follow';
export type GameSpeed = 'slow' | 'medium' | 'fast';
export interface GameConfig {
  mode: GameMode;
  speed: GameSpeed;
}
export const DEFAULT_CONFIG: GameConfig = { mode: 'follow', speed: 'medium' };

// patternTurns: how many turns a rule lasts before rotating
export const PATTERN_TURNS: Record<GameMode, number> = { follow: 1, guess: 4 };

export const SPEED_TIMER: Record<GameMode, Record<GameSpeed, { startMs: number; stepMs: number; floorMs: number }>> = {
  guess: {
    slow:   { startMs: 3000, stepMs: 200, floorMs: 1500 },
    medium: { startMs: 2000, stepMs: 175, floorMs: 1000 },
    fast:   { startMs: 1400, stepMs: 175, floorMs: 700  },
  },
  follow: {
    slow:   { startMs: 2000, stepMs: 175, floorMs: 1000 },
    medium: { startMs: 1400, stepMs: 175, floorMs: 700  },
    fast:   { startMs: 900,  stepMs: 125, floorMs: 450  },
  },
};

export const MOBILE_WIDTH_ESTIMATE = 768;

export interface TauntsInfo {
  // how likely this particular character is to taunt (e.g., Adrian is very likely)
  chance: number;
  // taunts said to any opponent
  general: string[];
  // dict of particular taunts aimed at particular opponents
  opponents?: Record<string, string[]>;
}

export interface ReactionsInfo {
  // how likely this particular character is to react when hit
  chance: number;
  // reactions said to any opponent
  general: string[];
  // dict of particular reactions aimed at particular opponents
  opponents?: Record<string, string[]>;
}

export interface Character {
  namePath: string;
  displayName: string;
  life: number;
  tauntsInfo: TauntsInfo | null;
  reactionsInfo: ReactionsInfo | null;
  affinity: CharacterAffinity;
  // main portraits - need the ability to face either direction depending
  // on whether you are player or opponent
  imageLeft: string;
  imageRight: string;
  // monochrome 'expressive' versions I drew for spell impact
  hitImageLeft: string;
  hitImageRight: string;
  // combat images
  blastImagesLeft: string[];
  blastImagesRight: string[];
}

export type GameScreen =
  | 'title'
  | 'character-select'
  | 'opponent-select'
  | 'fight'
  | 'game-over'
  | 'gallery';

export interface TurnRecord {
  rule: PatternRule;
  timerResult: TimerResult;
  outcome: CollisionOutcome;
}
