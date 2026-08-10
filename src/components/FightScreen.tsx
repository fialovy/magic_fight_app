import { useEffect, useRef, useState } from 'react';
import type {
  Character,
  CollisionOutcome,
  PatternRule,
  ReactionsInfo,
  Spell,
  TimerResult,
  TauntsInfo,
  TurnRecord,
} from '../types/game';
import {
  GAME_LIFE,
  MOBILE_WIDTH_ESTIMATE,
  PATTERN_TURNS,
  TIMER_FLOOR_MS,
  TIMER_START_MS,
  TIMER_STEP_MS,
  TIMER_STEP_TURNS,
} from '../types/game';
import { pick } from '../engine/random';
import { pickReaction, pickTaunt } from '../engine/combat';
import { sampleDominantColor } from '../engine/colorSampler';
import {
  checkPattern,
  generateHand,
  guaranteeMatch,
  OUTCOME_DAMAGE,
  randomPatternRule,
  randomSpell,
  resolveCollision,
} from '../data/spells';
import SpellCard from './SpellCard';
import { BLAST_COUNTS } from 'virtual:blast-counts';
import confetti from 'canvas-confetti';

interface Props {
  initialPlayer: Character;
  initialOpponent: Character;
  onGameOver: (
    winner: 'player' | 'opponent',
    player: Character,
    opponent: Character,
    history: TurnRecord[],
  ) => void;
}

type TurnPhase =
  | 'between-turns'
  | 'hand-shown'
  | 'opponent-shown'
  | 'resolving';

interface BlastAnim {
  url: string;
  key: number;
  side: 'player' | 'opponent';
}

// Emoji burst for specific blast images to use instead of the default confettis
// that are just a couple of sampled colors from the image — add any image stem here
// if a particular emoji seems like a good confetti for it (without _face_left/right.png)
const BLAST_EMOJI: Record<string, string> = {
  winston_mf_blast_0: '🚂',
  sandoval_mf_blast_2: '❄️',
  winfield_mf_blast_1: '🤪',
  bastion_mf_blast_0: '🌸',
  bastion_mf_blast_4: '🥞',
  lucian_mf_blast_3: '💖',
  meadow_sprite_mf_blast_0: '🌿',
  nora_mf_blast_5: '🌈',
};

function blastEmojiFor(url: string): string | undefined {
  const stem = (url.split('/').pop() ?? '').replace(
    /_face_(left|right)\.png$/,
    '',
  );
  return BLAST_EMOJI[stem];
}

const ORB_SIZE = 36;
const FALLBACK_ORB_COLOR = '#fbbf24'; // amber-400 — used when a character has no blast images
const FALLBACK_CLASH_COLOR = '#a855f7'; // purple-500 — used in neutral clash when an image is missing

function nextBlastUrl(
  images: string[],
  idxRef: React.MutableRefObject<number>,
): string | null {
  if (images.length === 0) return null;
  return images[idxRef.current++ % images.length];
}

function sampleColor(url: string | null, fallback: string): Promise<string> {
  return url ? sampleDominantColor(url) : Promise.resolve(fallback);
}

const ORB_SHAPES: { clipPath: string; borderRadius: string }[] = [
  { clipPath: 'none', borderRadius: '50%' },
  {
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    borderRadius: '0',
  },
  {
    clipPath:
      'polygon(50% 0%, 54% 46%, 100% 50%, 54% 54%, 50% 100%, 46% 54%, 0% 50%, 46% 46%)',
    borderRadius: '0',
  },
  {
    clipPath:
      'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
    borderRadius: '0',
  },
  {
    clipPath:
      'polygon(50% 0%, 57% 34%, 85% 15%, 66% 43%, 100% 50%, 66% 57%, 85% 85%, 57% 66%, 50% 100%, 43% 66%, 15% 85%, 34% 57%, 0% 50%, 34% 43%, 15% 15%, 43% 34%)',
    borderRadius: '0',
  },
];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const SUBSTRATE_FORM_DEFS = [
  { emoji: '♀️', prefix: 'nora', path: 'nora', displayName: 'Nora' },
  { emoji: '♂️', prefix: 'norm', path: 'nora/norm', displayName: 'Norm' },
  {
    emoji: '🌿',
    prefix: 'meadow_sprite',
    path: 'nora/meadow_sprite',
    displayName: 'Meadow Sprite',
  },
] as const;

const SUBSTRATE_NAME_PATHS: Set<string> = new Set(
  SUBSTRATE_FORM_DEFS.map((f) => f.path),
);
const SUBSTRATE_IDX = Object.fromEntries(
  SUBSTRATE_FORM_DEFS.map((f, i) => [f.prefix, i]),
) as Record<(typeof SUBSTRATE_FORM_DEFS)[number]['prefix'], number>;

function isTheSubstrate(c: Character) {
  return SUBSTRATE_NAME_PATHS.has(c.namePath);
}

// for desktop vs. mobile placement of player vs. opponent
function panelClass(side: 'player' | 'opponent', character: Character): string {
  const order = side === 'player' ? 'order-3 md:order-1' : 'order-1 md:order-3';
  const height = isTheSubstrate(character)
    ? 'h-[min(calc(28vh_+_44px),264px)]'
    : 'h-[min(28vh,220px)]';
  return `${order} flex flex-col items-center p-2 md:p-4 w-full md:w-72 xl:w-96 md:shrink-0 md:h-auto ${height}`;
}

function fireBurst(
  targetEl: HTMLElement,
  colors: string[],
  count: number,
  emoji?: string,
) {
  const rect = targetEl.getBoundingClientRect();
  const origin = {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  };
  const mobile = window.innerWidth < MOBILE_WIDTH_ESTIMATE;
  const sharedConfettiConfig = {
    particleCount: mobile ? Math.round(count * 0.5) : count,
    origin,
    spread: 65,
    startVelocity: mobile ? 16 : 22,
    gravity: 0.9,
    decay: 0.88,
    ticks: mobile ? 55 : 120,
  };
  if (emoji) {
    const shape = confetti.shapeFromText({ text: emoji, scalar: 2 });
    confetti({ shapes: [shape], scalar: 2.5, ...sharedConfettiConfig });
  } else {
    confetti({ colors, shapes: ['star', 'circle'], ...sharedConfettiConfig });
  }
}

interface SubstrateFormOverride {
  tauntsInfo: TauntsInfo | null;
  reactionsInfo: ReactionsInfo | null;
}

// When Norm/Nora changes forms, we have to override all of the character
// metadata including their images of course
function applySubstrateShapeshift(
  c: Character,
  formIdx: number,
  overrides?: SubstrateFormOverride[] | null,
): Character {
  const { prefix, path, displayName } = SUBSTRATE_FORM_DEFS[formIdx];
  const count = BLAST_COUNTS[prefix] ?? 0;
  const ov = overrides?.[formIdx];
  return {
    ...c,
    namePath: path,
    displayName,
    tauntsInfo: ov ? ov.tauntsInfo : c.tauntsInfo,
    reactionsInfo: ov ? ov.reactionsInfo : c.reactionsInfo,
    imageLeft: `${import.meta.env.BASE_URL}images/characters/${prefix}_mf_face_left.png`,
    imageRight: `${import.meta.env.BASE_URL}images/characters/${prefix}_mf_face_right.png`,
    hitImageLeft: `${import.meta.env.BASE_URL}images/characters/on_impact/${prefix}_mf_hit_face_left.png`,
    hitImageRight: `${import.meta.env.BASE_URL}images/characters/on_impact/${prefix}_mf_hit_face_right.png`,
    blastImagesLeft: Array.from(
      { length: count },
      (_, i) =>
        `${import.meta.env.BASE_URL}images/characters/on_cast/${prefix}_mf_blast_${i}_face_left.png`,
    ),
    blastImagesRight: Array.from(
      { length: count },
      (_, i) =>
        `${import.meta.env.BASE_URL}images/characters/on_cast/${prefix}_mf_blast_${i}_face_right.png`,
    ),
  };
}

const OUTCOME_DISPLAY: Record<
  CollisionOutcome,
  { label: string; color: string }
> = {
  'decisive-win': { label: '✦ Decisive!', color: 'text-amber-300' },
  win: { label: '↑ Overpowered!', color: 'text-blue-300' },
  neutral: { label: '≈ Clash', color: 'text-purple-400' },
  loss: { label: '↓ Overpowered', color: 'text-rose-400' },
  'decisive-loss': { label: '✦ Shattered!', color: 'text-rose-600' },
};

function parseRule(rule: PatternRule): { isAvoid: boolean; dims: string[] } {
  return {
    isAvoid: rule.startsWith('avoid'),
    // both 'match-' and 'avoid-' are 6 chars
    dims: rule.slice(6).split('+').map((d) => d.toUpperCase()),
  };
}

export default function FightScreen({
  initialPlayer,
  initialOpponent,
  onGameOver,
}: Props) {
  // Refs hold live values read by async turn logic — avoids stale closures
  const livePlayerRef = useRef(initialPlayer);
  const liveOpponentRef = useRef(initialOpponent);
  const patternRef = useRef({
    rule: randomPatternRule() as PatternRule,
    turnsLeft: PATTERN_TURNS,
  });
  const cardClickRef = useRef<((spell: Spell) => void) | null>(null);
  const playerBlastIdx = useRef(0);
  const opponentBlastIdx = useRef(0);
  const substrateFormIdxRef = useRef(0);
  const timerDurationRef = useRef(TIMER_START_MS);
  const timerStepCountRef = useRef(0);
  const substrateFormDataRef = useRef<SubstrateFormOverride[] | null>(null);
  const restartTimerRef = useRef<(() => void) | null>(null);
  const turnHistoryRef = useRef<TurnRecord[]>([]);

  // Display state — substrateForm combines idx + transition overlay so they always update in one render
  const [substrateForm, setSubstrateForm] = useState<{
    idx: number;
    anim: BlastAnim | null;
  }>({ idx: 0, anim: null });
  const [player, setPlayer] = useState(initialPlayer);
  const [opponent, setOpponent] = useState(initialOpponent);
  const [phase, setPhase] = useState<TurnPhase>('between-turns');
  const [hand, setHand] = useState<Spell[]>([]);
  const [opponentSpell, setOpponentSpell] = useState<Spell | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [lastOutcome, setLastOutcome] = useState<CollisionOutcome | null>(null);
  const [blast, setBlast] = useState<BlastAnim | null>(null);
  const [hitAnim, setHitAnim] = useState<BlastAnim | null>(null);
  const [playerSpeech, setPlayerSpeech] = useState<string | null>(null);
  const [opponentSpeech, setOpponentSpeech] = useState<string | null>(null);
  const [playerDmgFloat, setPlayerDmgFloat] = useState<{
    text: string;
    key: number;
  } | null>(null);
  const [opponentDmgFloat, setOpponentDmgFloat] = useState<{
    text: string;
    key: number;
  } | null>(null);
  const [currentRule, setCurrentRule] = useState<PatternRule>(
    patternRef.current.rule,
  );
  const [ruleKey, setRuleKey] = useState(0);
  const streakRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [timerBar, setTimerBar] = useState<{ duration: number; key: number; isAvoid: boolean } | null>(null);

  const playerPortraitRef = useRef<HTMLDivElement>(null);
  const opponentPortraitRef = useRef<HTMLDivElement>(null);
  const projectileRef = useRef<HTMLDivElement>(null);
  const projectile2Ref = useRef<HTMLDivElement>(null);

  async function showShapeshiftEffect(fromIdx: number, toIdx: number) {
    const isSprite =
      fromIdx === SUBSTRATE_IDX.meadow_sprite ||
      toIdx === SUBSTRATE_IDX.meadow_sprite;
    // The splat effect picture is different depending on what forms we are
    // going between 🏳️‍🌈
    const suffix = isSprite
      ? 'sprite_to_humanoid_or_humanoid_to_sprite'
      : 'humanoid_to_humanoid';
    const side = isTheSubstrate(initialPlayer) ? 'player' : 'opponent';
    const dir = side === 'player' ? 'right' : 'left';
    const url = `${import.meta.env.BASE_URL}images/characters/ability_transitions/nora_mf_splat_${suffix}_face_${dir}.png`;

    // Show overlay (transition-flash: opacity 1→1→0 over 1800ms, fade starts at 80%=1440ms)
    setSubstrateForm((v) => ({ ...v, anim: { url, key: Date.now(), side } }));

    // At 1440ms the overlay is still fully opaque — safe to swap portrait underneath
    await delay(1440);
    setSubstrateForm((v) => ({ ...v, idx: toIdx }));

    // At 1800ms the CSS fade reaches opacity:0 (forwards fill keeps it there) — safe to remove
    await delay(400);
    setSubstrateForm((v) => ({ ...v, anim: null }));
  }

  function handleSubstrateFormChange(idx: number) {
    const prev = substrateFormIdxRef.current;
    if (idx === prev) return;
    substrateFormIdxRef.current = idx; // update ref immediately so turn logic uses new form
    // setSubstrateFormIdx is called inside showShapeshiftEffect after the animation
    showShapeshiftEffect(prev, idx);
    restartTimerRef.current?.();
  }

  function handleCardClick(spell: Spell, idx: number) {
    if (!cardClickRef.current) return;
    setSelectedIdx(idx);
    const cb = cardClickRef.current;
    cardClickRef.current = null;
    cb(spell);
  }

  function fireProjectile(
    color: string,
    fromSide: 'player' | 'opponent',
    orbEl?: HTMLDivElement | null,
  ) {
    const fromEl =
      fromSide === 'player'
        ? playerPortraitRef.current
        : opponentPortraitRef.current;
    const toEl =
      fromSide === 'player'
        ? opponentPortraitRef.current
        : playerPortraitRef.current;
    const el = orbEl !== undefined ? orbEl : projectileRef.current;
    if (!fromEl || !toEl || !el || typeof el.animate !== 'function') return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    // center it but then kinda back up to REALLY center it because it also has width
    const fromX = fromRect.left + fromRect.width / 2 - ORB_SIZE / 2;
    const fromY = fromRect.top + fromRect.height / 2 - ORB_SIZE / 2;
    const toX = toRect.left + toRect.width / 2 - ORB_SIZE / 2;
    const toY = toRect.top + toRect.height / 2 - ORB_SIZE / 2;
    const shape = pick(ORB_SHAPES);
    el.style.clipPath = shape.clipPath;
    el.style.borderRadius = shape.borderRadius;
    el.style.background = `radial-gradient(circle, white 0%, ${color} 35%, transparent 70%)`;
    el.style.filter = `drop-shadow(0 0 10px ${color})`;
    el.animate(
      [
        { transform: `translate(${fromX}px, ${fromY}px)`, opacity: 0 },
        {
          transform: `translate(${fromX}px, ${fromY}px)`,
          opacity: 1,
          offset: 0.07,
        },
        {
          transform: `translate(${toX}px,   ${toY}px)`,
          opacity: 0.9,
          offset: 0.88,
        },
        { transform: `translate(${toX}px,   ${toY}px)`, opacity: 0 },
      ],
      { duration: 950, easing: 'ease-in', fill: 'none' },
    );
  }

  async function showBlast(
    caster: Character,
    casterSide: 'player' | 'opponent',
    recipient: Character,
    outcome: CollisionOutcome,
  ) {
    const images =
      casterSide === 'player'
        ? caster.blastImagesRight
        : caster.blastImagesLeft;
    const recipientSide: 'player' | 'opponent' =
      casterSide === 'player' ? 'opponent' : 'player';
    const hitUrl =
      recipientSide === 'player'
        ? recipient.hitImageRight
        : recipient.hitImageLeft;
    const recipientEl = (
      recipientSide === 'player' ? playerPortraitRef : opponentPortraitRef
    ).current;
    const decisive = outcome === 'decisive-win' || outcome === 'decisive-loss';
    const idxRef = casterSide === 'player' ? playerBlastIdx : opponentBlastIdx;

    let firstBlastUrl: string | undefined;

    // Kick off hit image color sampling immediately so it's ready when the orb lands
    // We use this to color the confetti to match the colors in the character art
    const hitColorPromise = sampleDominantColor(hitUrl);

    // First orb — await color first so delay() starts in sync with the animation
    let hex = FALLBACK_ORB_COLOR;
    const url = nextBlastUrl(images, idxRef);
    if (url) {
      firstBlastUrl = url;
      // Resolving color ensures the image is decoded; delay starts only after animation fires
      hex = await sampleDominantColor(url);
      fireProjectile(hex, casterSide);
      setBlast({ url, key: Date.now(), side: casterSide });
    }

    if (decisive && images.length > 0) {
      // Second orb fires at t=300 — sample its color in parallel with the wait
      const url2 = nextBlastUrl(images, idxRef);
      const hex2Promise = sampleColor(url2, FALLBACK_ORB_COLOR);
      await delay(300);
      fireProjectile(await hex2Promise, casterSide, projectile2Ref.current);
      await delay(536); // 300+536 = 836 → first orb arrives
    } else {
      await delay(836);
    }

    const hitHex = await hitColorPromise;
    const colors = [hex, hitHex];

    // First hit at t=836
    const burstEmoji = firstBlastUrl ? blastEmojiFor(firstBlastUrl) : undefined;
    setHitAnim({ url: hitUrl, key: Date.now(), side: recipientSide });
    if (recipientEl)
      fireBurst(recipientEl, colors, decisive ? 50 : 35, burstEmoji);

    if (decisive) {
      // Second orb arrives at t=300+836=1136 → wait 1136−836=300ms after first hit
      await delay(300);
      setHitAnim({ url: hitUrl, key: Date.now(), side: recipientSide });
      if (recipientEl) fireBurst(recipientEl, colors, 30, burstEmoji);
      await delay(700);
    } else {
      await delay(1364);
    }

    setBlast(null);
    setHitAnim(null);
  }

  async function showNeutralClash(vP: Character, vO: Character) {
    const pImages = vP.blastImagesRight;
    const oImages = vO.blastImagesLeft;

    // Capture URLs before incrementing, then resolve both colors in parallel
    const pUrl = nextBlastUrl(pImages, playerBlastIdx);
    const oUrl = nextBlastUrl(oImages, opponentBlastIdx);
    const [pColor, oColor] = await Promise.all([
      sampleColor(pUrl, FALLBACK_CLASH_COLOR),
      sampleColor(oUrl, FALLBACK_CLASH_COLOR),
    ]);

    // Both colors resolved → fire both projectiles, then start delay
    if (pUrl) fireProjectile(pColor, 'player');
    if (oUrl) fireProjectile(oColor, 'opponent', projectile2Ref.current);

    await delay(800);

    const pEl = playerPortraitRef.current;
    const oEl = opponentPortraitRef.current;
    if (pEl) fireBurst(pEl, [pColor, oColor], 25);
    if (oEl) fireBurst(oEl, [oColor, pColor], 25);
    await delay(400);
  }

  async function runTurn() {
    const p = livePlayerRef.current;
    const o = liveOpponentRef.current;
    const { rule } = patternRef.current;

    // Generate opponent spell first so hand can guarantee at least one matching card
    const oppSpell = randomSpell();

    // Phase 1: show hand
    setHand(guaranteeMatch(generateHand(p.affinity), rule, oppSpell));
    setSelectedIdx(null);
    setLastOutcome(null);
    setOpponentSpell(null);
    setPhase('hand-shown');

    await delay(800);

    // Phase 2: opponent spell reveals, countdown begins
    setOpponentSpell(oppSpell);
    setPhase('opponent-shown');
    setTimerBar({ duration: timerDurationRef.current, key: Date.now(), isAvoid: rule.startsWith('avoid') });

    const selectedSpell = await new Promise<Spell | null>((resolve) => {
      cardClickRef.current = resolve;
      let timeoutId: ReturnType<typeof setTimeout>;
      const arm = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (cardClickRef.current) {
            cardClickRef.current = null;
            resolve(null);
          }
          restartTimerRef.current = null;
        }, timerDurationRef.current);
      };
      restartTimerRef.current = arm;
      arm();
    });
    restartTimerRef.current = null;

    setPlayerSpeech(null);
    setOpponentSpeech(null);
    setPhase('resolving');
    setTimerBar(null);

    // Determine outcome
    const timedOut = selectedSpell === null;
    const timerResult: TimerResult = timedOut
      ? 'timeout'
      : checkPattern(rule, selectedSpell, oppSpell)
        ? 'correct'
        : 'wrong';

    streakRef.current = timerResult === 'correct' ? streakRef.current + 1 : 0;
    setStreak(streakRef.current);

    const outcome = resolveCollision(
      rule,
      p.affinity,
      oppSpell,
      o.affinity,
      timerResult,
    );
    turnHistoryRef.current.push({ rule, timerResult, outcome });
    setLastOutcome(outcome);

    const damage = OUTCOME_DAMAGE[outcome];
    let newP = { ...p };
    let newO = { ...o };
    if (outcome === 'decisive-win' || outcome === 'win') {
      newO = { ...newO, life: Math.max(0, newO.life - damage) };
    } else if (outcome === 'decisive-loss' || outcome === 'loss') {
      newP = { ...newP, life: Math.max(0, newP.life - damage) };
    }

    // Collision visuals — use form-overridden images if the substrate is fighting
    const vP = isTheSubstrate(p)
      ? applySubstrateShapeshift(
          p,
          substrateFormIdxRef.current,
          substrateFormDataRef.current,
        )
      : p;
    const vO = isTheSubstrate(o)
      ? applySubstrateShapeshift(
          o,
          substrateFormIdxRef.current,
          substrateFormDataRef.current,
        )
      : o;
    if (outcome === 'win' || outcome === 'decisive-win') {
      await showBlast(vP, 'player', vO, outcome);
    } else if (outcome === 'loss' || outcome === 'decisive-loss') {
      await showBlast(vO, 'opponent', vP, outcome);
    } else {
      await showNeutralClash(vP, vO);
    }

    // Commit state
    setPlayer(newP);
    setOpponent(newO);
    livePlayerRef.current = newP;
    liveOpponentRef.current = newO;

    // Floating damage number over the hit character's portrait
    if (damage > 0) {
      const float = { text: `−${damage}`, key: Date.now() };
      if (outcome === 'win' || outcome === 'decisive-win')
        setOpponentDmgFloat(float);
      else if (outcome === 'loss' || outcome === 'decisive-loss')
        setPlayerDmgFloat(float);
    }

    // Speech bubbles
    if ((outcome === 'loss' || outcome === 'decisive-loss') && damage > 0) {
      const reaction = pickReaction(vP, vO.namePath);
      if (reaction) setPlayerSpeech(reaction);
    }
    const newTaunt = pickTaunt(vO, vP.namePath);
    if (newTaunt) setOpponentSpeech(newTaunt);

    await delay(800);

    const finalP = isTheSubstrate(newP)
      ? applySubstrateShapeshift(
          newP,
          substrateFormIdxRef.current,
          substrateFormDataRef.current,
        )
      : newP;
    const finalO = isTheSubstrate(newO)
      ? applySubstrateShapeshift(
          newO,
          substrateFormIdxRef.current,
          substrateFormDataRef.current,
        )
      : newO;
    if (newO.life <= 0) {
      onGameOver('player', finalP, finalO, turnHistoryRef.current);
      return;
    }
    if (newP.life <= 0) {
      onGameOver('opponent', finalP, finalO, turnHistoryRef.current);
      return;
    }

    // Rule rotates every turn; timer steps down every TIMER_STEP_TURNS turns
    const newRule = randomPatternRule();
    patternRef.current = { rule: newRule, turnsLeft: PATTERN_TURNS };
    setCurrentRule(newRule);
    setRuleKey((k) => k + 1);
    timerStepCountRef.current += 1;
    if (timerStepCountRef.current % TIMER_STEP_TURNS === 0) {
      timerDurationRef.current = Math.max(
        TIMER_FLOOR_MS,
        timerDurationRef.current - TIMER_STEP_MS,
      );
    }

    await delay(400);
    runTurn();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    runTurn();
  }, []);

  // make sure the substrate's stuff is always up to date
  useEffect(() => {
    if (!isTheSubstrate(initialPlayer) && !isTheSubstrate(initialOpponent))
      return;
    Promise.all(
      SUBSTRATE_FORM_DEFS.map(async ({ path }) => {
        const [taunts, reactions] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}characters/${path}/taunts.json`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`${import.meta.env.BASE_URL}characters/${path}/reactions.json`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        return {
          tauntsInfo: taunts,
          reactionsInfo: reactions,
        } as SubstrateFormOverride;
      }),
    ).then((data) => {
      substrateFormDataRef.current = data;
    });
  }, []);

  const showOpponentSpell =
    opponentSpell && (phase === 'opponent-shown' || phase === 'resolving');
  const currentDisplay = parseRule(currentRule);
  const isPlayerSubstrate = isTheSubstrate(player);
  const isOpponentSubstrate = isTheSubstrate(opponent);
  const displayPlayer = isPlayerSubstrate
    ? applySubstrateShapeshift(
        player,
        substrateForm.idx,
        substrateFormDataRef.current,
      )
    : player;
  const displayOpponent = isOpponentSubstrate
    ? applySubstrateShapeshift(
        opponent,
        substrateForm.idx,
        substrateFormDataRef.current,
      )
    : opponent;

  return (
    <div className="min-h-dvh app-bg flex flex-col">
      <div
        ref={projectileRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{ width: ORB_SIZE, height: ORB_SIZE, zIndex: 100, opacity: 0 }}
      />
      <div
        ref={projectile2Ref}
        className="fixed top-0 left-0 pointer-events-none"
        style={{ width: ORB_SIZE, height: ORB_SIZE, zIndex: 100, opacity: 0 }}
      />


      <div className="text-center py-1 md:py-3 border-b border-purple-800">
        <span className="text-purple-400 text-sm tracking-widest uppercase">
          Magic Fight
        </span>
      </div>

      {/* Arena row: portraits + center controls */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Put the player on the bottom for mobile (order-3); on the left for desktop (md:order-1) */}
        {/* I absolutely refuse to respect anything other than portrait mode on mobile. */}
        <div className={panelClass('player', player)}>
          <CharacterPanel
            character={displayPlayer}
            side="player"
            blast={blast}
            hitAnim={hitAnim}
            transitionAnim={substrateForm.anim}
            speech={playerSpeech}
            dmgFloat={playerDmgFloat}
            onDmgFloatEnd={() => setPlayerDmgFloat(null)}
            portraitRef={playerPortraitRef}
            streak={streak}
            shapeshiftControl={
              isPlayerSubstrate ? (
                <SubstrateSegmented
                  formIdx={substrateForm.idx}
                  onChange={handleSubstrateFormChange}
                />
              ) : undefined
            }
          />
        </div>

        {/* Center — always middle */}
        <div className="order-2 flex-1 flex flex-col items-center justify-center gap-1 md:gap-4 px-4 py-1 md:py-0">
          <span
            key={ruleKey}
            className={`badge-flash inline-flex gap-2 text-sm md:text-lg font-bold tracking-widest px-3 md:px-5 py-1 md:py-2 rounded-full border-2 ${currentDisplay.isAvoid ? 'text-rose-300 border-rose-600 bg-rose-950/60' : 'text-blue-300 border-blue-600 bg-blue-950/60'}`}
          >
            {currentDisplay.dims.map((dim, i) => (
              <span key={i} className={currentDisplay.isAvoid ? 'line-through' : undefined}>{dim}</span>
            ))}
          </span>
          <span
            className={`hidden md:block text-purple-500 text-xs uppercase tracking-widest ${showOpponentSpell ? '' : 'invisible'}`}
          >
            Opponent's spell
          </span>
          <div className="w-20 h-20 md:w-36 md:h-36">
            {showOpponentSpell ? (
              <SpellCard
                spell={opponentSpell!}
                glowing={phase === 'opponent-shown'}
              />
            ) : (
              <div className="w-full h-full rounded-xl border-2 border-purple-800/20 bg-purple-950/20 flex items-center justify-center">
                <span className="text-purple-800 text-4xl select-none">?</span>
              </div>
            )}
          </div>
          <div className="w-20 md:w-36 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
            {timerBar && (
              <div
                key={timerBar.key}
                className={`h-full rounded-full timer-drain ${timerBar.isAvoid ? 'bg-rose-400' : 'bg-blue-400'}`}
                style={{ '--timer-duration': `${timerBar.duration}ms` } as React.CSSProperties}
              />
            )}
          </div>
          <div className="h-5 flex items-center justify-center">
            {phase === 'resolving' && lastOutcome && (
              <span className={`text-sm font-bold ${OUTCOME_DISPLAY[lastOutcome].color}`}>
                {OUTCOME_DISPLAY[lastOutcome].label}
              </span>
            )}
          </div>
        </div>

        {/* Opponent — mobile: top (order-1); desktop: right (md:order-3) */}
        <div className={panelClass('opponent', opponent)}>
          <CharacterPanel
            character={displayOpponent}
            side="opponent"
            blast={blast}
            hitAnim={hitAnim}
            transitionAnim={substrateForm.anim}
            speech={opponentSpeech}
            dmgFloat={opponentDmgFloat}
            onDmgFloatEnd={() => setOpponentDmgFloat(null)}
            portraitRef={opponentPortraitRef}
            shapeshiftControl={
              isOpponentSubstrate ? (
                <SubstrateSegmented
                  formIdx={substrateForm.idx}
                  onChange={handleSubstrateFormChange}
                />
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Hand row — sticky so spell choices are always visible */}
      <div className="sticky bottom-0 z-20 py-2 md:py-5 flex justify-center gap-2 md:gap-4 border-t border-purple-800/30 bg-indigo-950/90 backdrop-blur-sm">
        {hand.map((spell, i) => (
          <div key={i} className="w-20 h-20 md:w-24 md:h-24 shrink-0">
            <SpellCard
              spell={spell}
              onClick={() => handleCardClick(spell, i)}
              selected={selectedIdx === i}
              disabled={phase !== 'opponent-shown'}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// shapeshift buttons for fun
function SubstrateSegmented({
  formIdx,
  onChange,
}: {
  formIdx: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex rounded-lg border border-purple-700 overflow-hidden">
      {SUBSTRATE_FORM_DEFS.map((f, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={[
            'px-3 py-1 text-base transition-colors',
            i === formIdx
              ? 'bg-amber-500 text-amber-100'
              : 'bg-purple-900/60 text-purple-300 hover:bg-purple-800',
            i > 0 ? 'border-l border-purple-700' : '',
          ].join(' ')}
        >
          {f.emoji}
        </button>
      ))}
    </div>
  );
}

function CharacterPanel({
  character,
  side,
  blast,
  hitAnim,
  transitionAnim,
  speech,
  dmgFloat,
  onDmgFloatEnd,
  portraitRef,
  streak,
  shapeshiftControl,
}: {
  character: Character;
  side: 'player' | 'opponent';
  blast: BlastAnim | null;
  hitAnim: BlastAnim | null;
  transitionAnim: BlastAnim | null;
  speech: string | null;
  dmgFloat: { text: string; key: number } | null;
  onDmgFloatEnd: () => void;
  portraitRef?: React.RefObject<HTMLDivElement | null>;
  streak?: number;
  shapeshiftControl?: React.ReactNode;
}) {
  const isMyBlast = blast?.side === side;
  const isMyHit = hitAnim?.side === side;
  const isMyTransition = transitionAnim?.side === side;
  const img = side === 'player' ? character.imageRight : character.imageLeft;
  const pct = Math.max(0, (character.life / GAME_LIFE) * 100);
  const barColor =
    pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-rose-500';
  const dmgColor = side === 'player' ? 'text-rose-400' : 'text-amber-300';

  return (
    <div className="flex flex-col items-center md:justify-center w-full flex-1 min-h-0 relative">
      {/* Speech bubble — absolutely outside the panel, never affects portrait size */}
      {speech && (
        <div
          className={[
            'absolute z-20 w-36',
            'left-1/2 -translate-x-1/2 bottom-14 md:bottom-auto',
            'md:top-1/4 md:translate-x-0',
            side === 'player'
              ? 'md:left-full md:ml-3'
              : 'md:left-auto md:right-full md:mr-3',
          ].join(' ')}
        >
          <div className="relative bg-purple-950/90 border border-purple-500 rounded-xl px-3 py-2 text-sm text-purple-100 text-center break-words animate-fade-in">
            &ldquo;{speech}&rdquo;
            <div
              className={`hidden md:block absolute top-3 w-3 h-3 bg-purple-950/90 rotate-45
              ${
                side === 'player'
                  ? '-left-1.5 border-l border-b border-purple-500'
                  : '-right-1.5 border-r border-t border-purple-500'
              }`}
            />
          </div>
        </div>
      )}

      {shapeshiftControl && (
        <div className="shrink-0 mb-2">{shapeshiftControl}</div>
      )}

      {/* Portrait — mobile player: order-2 so name/HP (order-1) floats above it */}
      <div
        ref={portraitRef}
        className={`relative w-full flex-1 min-h-20 md:flex-none md:aspect-square${side === 'player' ? ' max-md:order-2' : ''}`}
      >
        <img
          src={img}
          alt={character.displayName}
          className="w-full h-full object-contain"
        />

        {isMyBlast && blast && (
          <img
            key={blast.key}
            src={blast.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain blast-animate"
          />
        )}
        {isMyHit && hitAnim && (
          <img
            key={hitAnim.key}
            src={hitAnim.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain hit-animate"
          />
        )}
        {isMyTransition && transitionAnim && (
          <img
            key={transitionAnim.key}
            src={transitionAnim.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain transition-animate"
          />
        )}
        {dmgFloat && (
          <div
            key={dmgFloat.key}
            className={`absolute left-1/2 top-1/4 damage-float text-6xl font-black select-none z-10 ${dmgColor}`}
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)',
            }}
            onAnimationEnd={onDmgFloatEnd}
          >
            {dmgFloat.text}
          </div>
        )}
      </div>

      {/* Name/HP — mobile player: max-md:order-1 floats above portrait; desktop always below */}
      <div
        className={`shrink-0 w-full flex flex-col items-center max-md:mt-0.5 md:mt-3${side === 'player' ? ' max-md:order-1' : ''}`}
      >
        <span className="text-purple-200 text-base md:text-lg font-semibold">
          {character.displayName}
        </span>
        <div className="w-full max-w-48 md:max-w-none bg-slate-800 rounded-full h-2 md:h-3 border border-slate-700 mt-1 md:mt-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-purple-400 tabular-nums mt-0.5">
          {character.life} / {GAME_LIFE} HP
        </span>
        {streak !== undefined && (
          <span className={`text-xs font-bold text-amber-400 mt-0.5 ${streak >= 2 ? '' : 'invisible'}`}>
            🔥 ×{streak}
          </span>
        )}
      </div>
    </div>
  );
}
