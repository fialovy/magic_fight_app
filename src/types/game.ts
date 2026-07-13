export type MagicType = 'dark' | 'light' | 'chaotic' | 'ordered' | 'hot' | 'cold';
export const MAGIC_TYPES: MagicType[] = ['dark', 'light', 'chaotic', 'ordered', 'hot', 'cold'];

// ── Spell system ──────────────────────────────────────────────────────────────
export type SpellColor = 'red' | 'blue' | 'green' | 'purple';
export type SpellShape = 'heart' | 'square' | 'star' | 'triangle';
export type SpellFill  = 'solid' | 'vertical-stripe' | 'horizontal-stripe';
export type SpellDimensionKey = SpellColor | SpellShape | SpellFill;

export interface Spell {
  color: SpellColor;
  shape: SpellShape;
  fill:  SpellFill;
}

export interface CharacterAffinity {
  primary:   SpellDimensionKey; // power 3
  secondary: SpellDimensionKey; // power 2
  // everything else: power 1
}

export type PatternRule      = 'match-color' | 'match-shape' | 'match-fill' | 'avoid-color' | 'avoid-shape' | 'avoid-fill';
export type CollisionOutcome = 'decisive-win' | 'win' | 'neutral' | 'loss' | 'decisive-loss';
export type TimerResult      = 'correct' | 'wrong' | 'timeout';

export const GAME_LIFE = 10;
export const OPPONENT_SPECIAL_CHANCE = 0.2;
export const DEFAULT_EFFECT_TURNS = 3;

export interface MagicDeal {
  amount: number;
  spells: string[];
}

export interface MagicInfo {
  deals: Record<MagicType, MagicDeal>;
  takes: Record<MagicType, { amount: number }>;
}

export interface SpecialAbilityDef {
  description: string;
  effect: string;
}

export interface TauntsInfo {
  chance: number;
  taunts: string[];
}

export interface ReactionsInfo {
  chance: number;
  reactions: string[];
}

export interface Character {
  namePath: string;
  displayName: string;
  life: number;
  magicInfo: MagicInfo;
  specialAbilities: Record<string, SpecialAbilityDef>;
  drunkSpecialAbilities: Record<string, SpecialAbilityDef>;
  tauntsInfo: TauntsInfo | null;
  reactionsInfo: ReactionsInfo | null;
  bio: string;
  asciiArt: string | null;
  affinity: CharacterAffinity;
  imageLeft: string;
  imageRight: string;
  hitImageLeft: string;
  hitImageRight: string;
  blastImagesLeft: string[];
  blastImagesRight: string[];
  // runtime state
  affectedBy: Record<string, number>;
  savedMagicInfo: MagicInfo | null;
  savedTauntsInfo: TauntsInfo | null;
  isDrunk: boolean;
}

export type GameScreen = 'title' | 'character-select' | 'opponent-select' | 'fight' | 'game-over' | 'gallery';

export interface ActionChoice {
  key: string;
  label: string;
  description?: string;
  magicType?: MagicType;
  damage?: number;
  isSpecial: boolean;
}

export interface ActionResult {
  updatedActor: Character;
  updatedTarget: Character;
  damage: number;
  message: string;
  transformation?: { newCharacter: Character; message: string };
}

export interface LogEntry {
  id: number;
  text: string;
  type: 'player' | 'opponent' | 'system' | 'taunt';
}
