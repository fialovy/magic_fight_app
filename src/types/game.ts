// ── Spell system ──────────────────────────────────────────────────────────────
export type SpellColor    = 'red' | 'blue' | 'green' | 'purple' | 'orange';
export type SpellShape    = 'heart' | 'square' | 'star' | 'triangle';
export type SpellFill     = 'solid' | 'vertical-stripe' | 'crosshatch' | 'dots';
export type SpellRotation = 'clockwise' | 'counter-clockwise';
export type SpellDimensionKey = SpellColor | SpellShape | SpellFill | SpellRotation;

export interface Spell {
  color:    SpellColor;
  shape:    SpellShape;
  fill:     SpellFill;
  rotation: SpellRotation;
}

export interface CharacterAffinity {
  primary:   SpellDimensionKey; // power 3
  secondary: SpellDimensionKey; // power 2
  // everything else: power 1
}

export type PatternRule      = 'match-color' | 'match-shape' | 'match-fill' | 'match-rotation'
                             | 'avoid-color' | 'avoid-shape' | 'avoid-fill' | 'avoid-rotation'
                             | 'match-color+shape' | 'match-color+fill' | 'match-shape+fill'
                             | 'match-color+rotation' | 'match-shape+rotation' | 'match-fill+rotation'
                             | 'avoid-color+shape' | 'avoid-color+fill' | 'avoid-shape+fill'
                             | 'avoid-color+rotation' | 'avoid-shape+rotation' | 'avoid-fill+rotation';
export type CollisionOutcome = 'decisive-win' | 'win' | 'neutral' | 'loss' | 'decisive-loss';
export type TimerResult      = 'correct' | 'wrong' | 'timeout';

export const GAME_LIFE       = 20;
export const PATTERN_TURNS   = 4;
export const TIMER_START_MS  = 2500;
export const TIMER_STEP_MS   = 250;
export const TIMER_FLOOR_MS  = 1100;

export interface TauntsInfo {
  chance: number;
  general: string[];
  opponents?: Record<string, string[]>;
}

export interface ReactionsInfo {
  chance: number;
  general: string[];
  opponents?: Record<string, string[]>;
}

export interface Character {
  namePath: string;
  displayName: string;
  life: number;
  tauntsInfo: TauntsInfo | null;
  reactionsInfo: ReactionsInfo | null;
  affinity: CharacterAffinity;
  imageLeft: string;
  imageRight: string;
  hitImageLeft: string;
  hitImageRight: string;
  blastImagesLeft: string[];
  blastImagesRight: string[];
}

export type GameScreen = 'title' | 'character-select' | 'opponent-select' | 'fight' | 'game-over' | 'gallery';

export interface TurnRecord {
  rule:        PatternRule;
  timerResult: TimerResult;
  outcome:     CollisionOutcome;
}
