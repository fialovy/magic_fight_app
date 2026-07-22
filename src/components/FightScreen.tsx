import { useEffect, useRef, useState } from 'react';
import type { Character, CollisionOutcome, PatternRule, ReactionsInfo, Spell, TimerResult, TauntsInfo } from '../types/game';
import { GAME_LIFE, PATTERN_TURNS, TIMER_FLOOR_MS, TIMER_START_MS, TIMER_STEP_MS } from '../types/game';
import { pickReaction, pickTaunt } from '../engine/combat';
import { sampleDominantColor } from '../engine/colorSampler';
import {
  checkPattern, generateHand, guaranteeMatch, OUTCOME_DAMAGE,
  randomPatternRule, randomSpell, resolveCollision,
} from '../data/spells';
import SpellCard from './SpellCard';
import { BLAST_COUNTS } from 'virtual:blast-counts';
import confetti from 'canvas-confetti';

interface Props {
  initialPlayer: Character;
  initialOpponent: Character;
  onGameOver: (winner: 'player' | 'opponent', player: Character, opponent: Character) => void;
}

type TurnPhase = 'between-turns' | 'hand-shown' | 'opponent-shown' | 'resolving';

interface BlastAnim { url: string; key: number; side: 'player' | 'opponent'; }

// Emoji burst for specific blast images — add any image stem here (without _face_left/right.png)
const BLAST_EMOJI: Record<string, string> = {
  winston_mf_blast_0: '🚂',
};

function blastEmojiFor(url: string): string | undefined {
  const stem = (url.split('/').pop() ?? '').replace(/_face_(left|right)\.png$/, '');
  return BLAST_EMOJI[stem];
}

const ORB_SHAPES: { clipPath: string; borderRadius: string }[] = [
  { clipPath: 'none',                                                                                                                                                       borderRadius: '50%' },
  { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',                                                                                                               borderRadius: '0'   },
  { clipPath: 'polygon(50% 0%, 54% 46%, 100% 50%, 54% 54%, 50% 100%, 46% 54%, 0% 50%, 46% 46%)',                                                                           borderRadius: '0'   },
  { clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',                                                          borderRadius: '0'   },
  { clipPath: 'polygon(50% 0%, 57% 34%, 85% 15%, 66% 43%, 100% 50%, 66% 57%, 85% 85%, 57% 66%, 50% 100%, 43% 66%, 15% 85%, 34% 57%, 0% 50%, 34% 43%, 15% 15%, 43% 34%)', borderRadius: '0'   },
];

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const NORA_FORM_DEFS = [
  { emoji: '♀️', prefix: 'nora',          path: 'nora',               displayName: 'Nora'          },
  { emoji: '♂️', prefix: 'norm',          path: 'nora/norm',          displayName: 'Norm'          },
  { emoji: '🌿', prefix: 'meadow_sprite', path: 'nora/meadow_sprite', displayName: 'Meadow Sprite' },
] as const;

const NORA_NAME_PATHS = new Set(['nora', 'nora/norm', 'nora/meadow_sprite']);

function isNora(c: Character) { return NORA_NAME_PATHS.has(c.namePath); }

interface NoraFormOverride { tauntsInfo: TauntsInfo | null; reactionsInfo: ReactionsInfo | null; }

function applyNoraForm(c: Character, formIdx: number, overrides?: NoraFormOverride[] | null): Character {
  const { prefix, displayName } = NORA_FORM_DEFS[formIdx];
  const count = BLAST_COUNTS[prefix] ?? 0;
  const ov    = overrides?.[formIdx];
  return {
    ...c,
    displayName,
    tauntsInfo:    ov ? ov.tauntsInfo    : c.tauntsInfo,
    reactionsInfo: ov ? ov.reactionsInfo : c.reactionsInfo,
    imageLeft:        `${import.meta.env.BASE_URL}images/characters/${prefix}_mf_face_left.png`,
    imageRight:       `${import.meta.env.BASE_URL}images/characters/${prefix}_mf_face_right.png`,
    hitImageLeft:     `${import.meta.env.BASE_URL}images/characters/on_impact/${prefix}_mf_hit_face_left.png`,
    hitImageRight:    `${import.meta.env.BASE_URL}images/characters/on_impact/${prefix}_mf_hit_face_right.png`,
    blastImagesLeft:  Array.from({ length: count }, (_, i) => `${import.meta.env.BASE_URL}images/characters/on_cast/${prefix}_mf_blast_${i}_face_left.png`),
    blastImagesRight: Array.from({ length: count }, (_, i) => `${import.meta.env.BASE_URL}images/characters/on_cast/${prefix}_mf_blast_${i}_face_right.png`),
  };
}

function outcomeLabel(outcome: CollisionOutcome): string {
  switch (outcome) {
    case 'decisive-win':  return '✦ Decisive!';
    case 'win':           return '↑ Overpowered!';
    case 'neutral':       return '≈ Clash';
    case 'loss':          return '↓ Overpowered';
    case 'decisive-loss': return '✦ Shattered!';
  }
}

function outcomeColor(outcome: CollisionOutcome): string {
  switch (outcome) {
    case 'decisive-win':  return 'text-amber-300';
    case 'win':           return 'text-blue-300';
    case 'neutral':       return 'text-purple-400';
    case 'loss':          return 'text-rose-400';
    case 'decisive-loss': return 'text-rose-600';
  }
}

export default function FightScreen({ initialPlayer, initialOpponent, onGameOver }: Props) {
  // Refs hold live values read by async turn logic — avoids stale closures
  const livePlayerRef    = useRef(initialPlayer);
  const liveOpponentRef  = useRef(initialOpponent);
  const patternRef       = useRef({ rule: randomPatternRule() as PatternRule, turnsLeft: PATTERN_TURNS });
  const cardClickRef     = useRef<((spell: Spell) => void) | null>(null);
  const playerBlastIdx   = useRef(0);
  const opponentBlastIdx = useRef(0);
  const noraFormIdxRef   = useRef(0);
  const timerDurationRef = useRef(TIMER_START_MS);
  const noraFormDataRef  = useRef<NoraFormOverride[] | null>(null);
  const restartTimerRef  = useRef<(() => void) | null>(null);

  // Display state — noraForm combines idx + transition overlay so they always update in one render
  const [noraForm, setNoraForm] = useState<{ idx: number; anim: BlastAnim | null }>({ idx: 0, anim: null });
  const [player,       setPlayer]       = useState(initialPlayer);
  const [opponent,     setOpponent]     = useState(initialOpponent);
  const [phase,        setPhase]        = useState<TurnPhase>('between-turns');
  const [hand,         setHand]         = useState<Spell[]>([]);
  const [opponentSpell, setOpponentSpell] = useState<Spell | null>(null);
  const [selectedIdx,  setSelectedIdx]  = useState<number | null>(null);
  const [lastOutcome,  setLastOutcome]  = useState<CollisionOutcome | null>(null);
  const [blast,   setBlast]   = useState<BlastAnim | null>(null);
  const [hitAnim, setHitAnim] = useState<BlastAnim | null>(null);
  const [playerSpeech,   setPlayerSpeech]   = useState<string | null>(null);
  const [opponentSpeech, setOpponentSpeech] = useState<string | null>(null);
  const [playerDmgFloat,   setPlayerDmgFloat]   = useState<{ text: string; key: number } | null>(null);
  const [opponentDmgFloat, setOpponentDmgFloat] = useState<{ text: string; key: number } | null>(null);
  const [currentRule,  setCurrentRule]  = useState<PatternRule>(patternRef.current.rule);
  const [ruleAnnounce, setRuleAnnounce] = useState<{ rule: PatternRule; key: number } | null>({ rule: patternRef.current.rule, key: Date.now() });

  const playerPortraitRef   = useRef<HTMLDivElement>(null);
  const opponentPortraitRef = useRef<HTMLDivElement>(null);
  const projectileRef       = useRef<HTMLDivElement>(null);
  const projectile2Ref      = useRef<HTMLDivElement>(null);


  function fireBurst(targetEl: HTMLElement, colors: string[], count: number, emoji?: string) {
    const rect = targetEl.getBoundingClientRect();
    const origin = {
      x: (rect.left + rect.width  / 2) / window.innerWidth,
      y: (rect.top  + rect.height / 2) / window.innerHeight,
    };
    if (emoji) {
      const shape = confetti.shapeFromText({ text: emoji, scalar: 2 });
      confetti({ particleCount: count, spread: 70, origin, shapes: [shape], scalar: 2.5,
        startVelocity: 22, gravity: 0.9, decay: 0.88 });
    } else {
      confetti({ particleCount: count, spread: 60, origin, colors,
        shapes: ['star', 'circle'], startVelocity: 20, gravity: 0.8, decay: 0.9 });
    }
  }

  async function showTransitionEffect(fromIdx: number, toIdx: number) {
    const isSprite = fromIdx === 2 || toIdx === 2;
    const suffix   = isSprite ? 'sprite_to_humanoid_or_humanoid_to_sprite' : 'humanoid_to_humanoid';
    const side     = isNora(initialPlayer) ? 'player' : 'opponent';
    const dir      = side === 'player' ? 'right' : 'left';
    const url      = `${import.meta.env.BASE_URL}images/characters/ability_transitions/nora_mf_splat_${suffix}_face_${dir}.png`;

    // Show overlay (transition-flash: opacity 1→1→0 over 1800ms, fade starts at 80%=1440ms)
    setNoraForm(v => ({ ...v, anim: { url, key: Date.now(), side } }));

    // At 1440ms the overlay is still fully opaque — safe to swap portrait underneath
    await delay(1440);
    setNoraForm(v => ({ ...v, idx: toIdx }));

    // At 1800ms the CSS fade reaches opacity:0 (forwards fill keeps it there) — safe to remove
    await delay(400);
    setNoraForm(v => ({ ...v, anim: null }));
  }

  function handleNoraFormChange(idx: number) {
    const prev = noraFormIdxRef.current;
    if (idx === prev) return;
    noraFormIdxRef.current = idx;  // update ref immediately so turn logic uses new form
    // setNoraFormIdx is called inside showTransitionEffect after the animation
    showTransitionEffect(prev, idx);
    restartTimerRef.current?.();
  }

  function handleCardClick(spell: Spell, idx: number) {
    if (!cardClickRef.current) return;
    setSelectedIdx(idx);
    const cb = cardClickRef.current;
    cardClickRef.current = null;
    cb(spell);
  }

  function fireProjectile(imageUrl: string, fromSide: 'player' | 'opponent', orbEl?: HTMLDivElement | null) {
    const fromEl = fromSide === 'player' ? playerPortraitRef.current : opponentPortraitRef.current;
    const toEl   = fromSide === 'player' ? opponentPortraitRef.current : playerPortraitRef.current;
    const el = orbEl !== undefined ? orbEl : projectileRef.current;
    if (!fromEl || !toEl || !el || typeof el.animate !== 'function') return;

    const S = 36;
    const fromRect = fromEl.getBoundingClientRect();
    const toRect   = toEl.getBoundingClientRect();
    const fromX = fromRect.left + fromRect.width  / 2 - S / 2;
    const fromY = fromRect.top  + fromRect.height / 2 - S / 2;
    const toX   = toRect.left  + toRect.width    / 2 - S / 2;
    const toY   = toRect.top   + toRect.height   / 2 - S / 2;
    const shape = ORB_SHAPES[Math.floor(Math.random() * ORB_SHAPES.length)];
    el.style.clipPath     = shape.clipPath;
    el.style.borderRadius = shape.borderRadius;

    sampleDominantColor(imageUrl).then(color => {
      el.style.background = `radial-gradient(circle, white 0%, ${color} 35%, transparent 70%)`;
      el.style.filter     = `drop-shadow(0 0 10px ${color})`;
      el.animate([
        { transform: `translate(${fromX}px, ${fromY}px)`, opacity: 0 },
        { transform: `translate(${fromX}px, ${fromY}px)`, opacity: 1,   offset: 0.07 },
        { transform: `translate(${toX}px,   ${toY}px)`,   opacity: 0.9, offset: 0.88 },
        { transform: `translate(${toX}px,   ${toY}px)`,   opacity: 0 },
      ], { duration: 950, easing: 'ease-in', fill: 'none' });
    });
  }

  async function showBlast(caster: Character, casterSide: 'player' | 'opponent', recipient: Character, outcome: CollisionOutcome) {
    const images      = casterSide === 'player' ? caster.blastImagesRight : caster.blastImagesLeft;
    const recipientSide: 'player' | 'opponent' = casterSide === 'player' ? 'opponent' : 'player';
    const hitUrl      = recipientSide === 'player' ? recipient.hitImageRight : recipient.hitImageLeft;
    const recipientEl = (recipientSide === 'player' ? playerPortraitRef : opponentPortraitRef).current;
    const decisive    = outcome === 'decisive-win' || outcome === 'decisive-loss';
    const idxRef      = casterSide === 'player' ? playerBlastIdx : opponentBlastIdx;

    let colorPromise: Promise<string> | null = null;
    let firstBlastUrl: string | undefined;

    // First orb fires at t=0
    if (images.length > 0) {
      const url = images[idxRef.current % images.length];
      firstBlastUrl = url;
      idxRef.current++;
      colorPromise = sampleDominantColor(url);
      fireProjectile(url, casterSide);
      setBlast({ url, key: Date.now(), side: casterSide });
    }

    if (decisive && images.length > 0) {
      // Second orb fires at t=300 — both in flight simultaneously
      await delay(300);
      fireProjectile(images[idxRef.current % images.length], casterSide, projectile2Ref.current);
      idxRef.current++;
      await delay(536); // 300+536 = 836 → first orb arrives
    } else {
      await delay(836);
    }

    const hex    = colorPromise ? await colorPromise : '#fbbf24';
    const colors = [hex, hex, '#ffffff'];

    // First hit at t=836
    const burstEmoji = firstBlastUrl ? blastEmojiFor(firstBlastUrl) : undefined;
    setHitAnim({ url: hitUrl, key: Date.now(), side: recipientSide });
    if (recipientEl) fireBurst(recipientEl, colors, decisive ? 50 : 35, burstEmoji);

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

    let pColorPromise: Promise<string> | null = null;
    let oColorPromise: Promise<string> | null = null;

    if (pImages.length > 0) {
      const url = pImages[playerBlastIdx.current % pImages.length];
      playerBlastIdx.current++;
      pColorPromise = sampleDominantColor(url);
      fireProjectile(url, 'player');
    }
    if (oImages.length > 0) {
      const url = oImages[opponentBlastIdx.current % oImages.length];
      opponentBlastIdx.current++;
      oColorPromise = sampleDominantColor(url);
      fireProjectile(url, 'opponent', projectile2Ref.current);
    }

    await delay(800);
    const pColor = pColorPromise ? await pColorPromise : '#a855f7';
    const oColor = oColorPromise ? await oColorPromise : '#a855f7';

    const pEl = playerPortraitRef.current;
    const oEl = opponentPortraitRef.current;
    if (pEl) fireBurst(pEl, [pColor, pColor, '#ffffff'], 25);
    if (oEl) fireBurst(oEl, [oColor, oColor, '#ffffff'], 25);
    await delay(400);
  }

  async function runTurn() {
    const p = livePlayerRef.current;
    const o = liveOpponentRef.current;
    const { rule, turnsLeft } = patternRef.current;

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

    const selectedSpell = await new Promise<Spell | null>(resolve => {
      cardClickRef.current = resolve;
      let timeoutId: ReturnType<typeof setTimeout>;
      const arm = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (cardClickRef.current) { cardClickRef.current = null; resolve(null); }
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

    // Determine outcome
    const timedOut = selectedSpell === null;
    const timerResult: TimerResult = timedOut
      ? 'timeout'
      : checkPattern(rule, selectedSpell, oppSpell) ? 'correct' : 'wrong';

    const outcome = resolveCollision(rule, p.affinity, oppSpell, o.affinity, timerResult);
    setLastOutcome(outcome);

    const damage = OUTCOME_DAMAGE[outcome];
    let newP = { ...p };
    let newO = { ...o };
    if (outcome === 'decisive-win' || outcome === 'win') {
      newO = { ...newO, life: Math.max(0, newO.life - damage) };
    } else if (outcome === 'decisive-loss' || outcome === 'loss') {
      newP = { ...newP, life: Math.max(0, newP.life - damage) };
    }

    // Collision visuals — use form-overridden images if Nora is fighting
    const vP = isNora(p) ? applyNoraForm(p, noraFormIdxRef.current, noraFormDataRef.current) : p;
    const vO = isNora(o) ? applyNoraForm(o, noraFormIdxRef.current, noraFormDataRef.current) : o;
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
    livePlayerRef.current  = newP;
    liveOpponentRef.current = newO;

    // Floating damage number over the hit character's portrait
    if (damage > 0) {
      const float = { text: `−${damage}`, key: Date.now() };
      if (outcome === 'win' || outcome === 'decisive-win') setOpponentDmgFloat(float);
      else if (outcome === 'loss' || outcome === 'decisive-loss') setPlayerDmgFloat(float);
    }

    // Speech bubbles
    if ((outcome === 'loss' || outcome === 'decisive-loss') && damage > 0) {
      const reaction = pickReaction(vP);
      if (reaction) setPlayerSpeech(reaction);
    }
    const newTaunt = pickTaunt(vO);
    if (newTaunt) setOpponentSpeech(newTaunt);

    await delay(800);

    const finalP = isNora(newP) ? applyNoraForm(newP, noraFormIdxRef.current, noraFormDataRef.current) : newP;
    const finalO = isNora(newO) ? applyNoraForm(newO, noraFormIdxRef.current, noraFormDataRef.current) : newO;
    if (newO.life <= 0) { onGameOver('player',   finalP, finalO); return; }
    if (newP.life <= 0) { onGameOver('opponent', finalP, finalO); return; }

    // Rotate pattern every 5 turns
    const newTurnsLeft = turnsLeft - 1;
    if (newTurnsLeft <= 0) {
      const newRule = randomPatternRule();
      patternRef.current = { rule: newRule, turnsLeft: PATTERN_TURNS };
      timerDurationRef.current = Math.max(TIMER_FLOOR_MS, timerDurationRef.current - TIMER_STEP_MS);
      setCurrentRule(newRule);
      const oldMode = rule.startsWith('avoid') ? 'avoid' : 'match';
      const newMode = newRule.startsWith('avoid') ? 'avoid' : 'match';
      if (oldMode !== newMode) setRuleAnnounce({ rule: newRule, key: Date.now() });
    } else {
      patternRef.current = { rule, turnsLeft: newTurnsLeft };
    }

    await delay(400);
    runTurn();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { runTurn(); }, []);

  useEffect(() => {
    if (!isNora(initialPlayer) && !isNora(initialOpponent)) return;
    Promise.all(
      NORA_FORM_DEFS.map(async ({ path }) => {
        const [taunts, reactions] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}characters/${path}/taunts.json`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${import.meta.env.BASE_URL}characters/${path}/reactions.json`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        return { tauntsInfo: taunts, reactionsInfo: reactions } as NoraFormOverride;
      })
    ).then(data => { noraFormDataRef.current = data; });
  }, []);

  const showOpponentSpell = opponentSpell && (phase === 'opponent-shown' || phase === 'resolving');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col">
      <div ref={projectileRef}  className="fixed top-0 left-0 pointer-events-none" style={{ width: 36, height: 36, zIndex: 100, opacity: 0 }} />
      <div ref={projectile2Ref} className="fixed top-0 left-0 pointer-events-none" style={{ width: 36, height: 36, zIndex: 100, opacity: 0 }} />

      {ruleAnnounce && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <span
            key={ruleAnnounce.key}
            className={`text-7xl font-extrabold tracking-widest uppercase rule-pulse select-none ${ruleAnnounce.rule.startsWith('avoid') ? 'text-rose-400' : 'text-blue-300'}`}
            onAnimationEnd={() => setRuleAnnounce(null)}
          >
            {ruleAnnounce.rule.startsWith('avoid') ? 'AVOID' : 'MATCH'}{' '}
            <span className="text-4xl">({ruleAnnounce.rule.includes('+') ? 'x2' : 'x1'})</span>
          </span>
        </div>
      )}

      <div className="text-center py-3 border-b border-purple-800">
        <span className="text-purple-400 text-sm tracking-widest uppercase">Magic Fight</span>
      </div>

      {/* Arena row: portraits + center controls */}
      <div className="flex flex-1 min-h-0">
        {/* Player */}
        <div className="flex flex-col items-center p-4 w-72 xl:w-96 shrink-0">
          <CharacterPanel
            character={isNora(player) ? applyNoraForm(player, noraForm.idx, noraFormDataRef.current) : player} side="player"
            blast={blast} hitAnim={hitAnim} transitionAnim={noraForm.anim}
            speech={playerSpeech}
            dmgFloat={playerDmgFloat} onDmgFloatEnd={() => setPlayerDmgFloat(null)}
            portraitRef={playerPortraitRef}
            shapeshiftControl={isNora(player) ? <NoraSegmented formIdx={noraForm.idx} onChange={handleNoraFormChange} /> : undefined}
          />
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <span className={`text-lg font-bold tracking-widest px-5 py-2 rounded-full border-2 ${currentRule.startsWith('avoid') ? 'text-rose-300 border-rose-600 bg-rose-950/60' : 'text-blue-300 border-blue-600 bg-blue-950/60'}`}>
            {currentRule.startsWith('avoid') ? 'AVOID' : 'MATCH'}
          </span>
          <span className={`text-purple-500 text-xs uppercase tracking-widest ${showOpponentSpell ? '' : 'invisible'}`}>
            Opponent's spell
          </span>
          {showOpponentSpell ? (
            <SpellCard spell={opponentSpell!} size={150} glowing={phase === 'opponent-shown'} />
          ) : (
            <div className="w-36 h-36 rounded-xl border-2 border-purple-800/20 bg-purple-950/20 flex items-center justify-center">
              <span className="text-purple-800 text-4xl select-none">?</span>
            </div>
          )}
          <div className="h-5 flex items-center justify-center">
            {phase === 'resolving' && lastOutcome && (
              <span className={`text-sm font-bold ${outcomeColor(lastOutcome)}`}>
                {outcomeLabel(lastOutcome)}
              </span>
            )}
          </div>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center p-4 w-72 xl:w-96 shrink-0">
          <CharacterPanel
            character={isNora(opponent) ? applyNoraForm(opponent, noraForm.idx, noraFormDataRef.current) : opponent} side="opponent"
            blast={blast} hitAnim={hitAnim} transitionAnim={noraForm.anim}
            speech={opponentSpeech}
            dmgFloat={opponentDmgFloat} onDmgFloatEnd={() => setOpponentDmgFloat(null)}
            portraitRef={opponentPortraitRef}
            shapeshiftControl={isNora(opponent) ? <NoraSegmented formIdx={noraForm.idx} onChange={handleNoraFormChange} /> : undefined}
          />
        </div>
      </div>

      {/* Hand row — sticky so spell choices are always visible */}
      <div className="sticky bottom-0 z-20 py-5 flex justify-center gap-4 border-t border-purple-800/30 bg-indigo-950/90 backdrop-blur-sm">
        {hand.map((spell, i) => (
          <SpellCard
            key={i}
            spell={spell}
            size={100}
            onClick={() => handleCardClick(spell, i)}
            selected={selectedIdx === i}
            disabled={phase !== 'opponent-shown'}
          />
        ))}
      </div>
    </div>
  );
}

function NoraSegmented({ formIdx, onChange }: { formIdx: number; onChange: (i: number) => void }) {
  return (
    <div className="flex rounded-lg border border-purple-700 overflow-hidden">
      {NORA_FORM_DEFS.map((f, i) => (
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
  character, side, blast, hitAnim, transitionAnim, speech, dmgFloat, onDmgFloatEnd, portraitRef, shapeshiftControl,
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
  shapeshiftControl?: React.ReactNode;
}) {
  const isMyBlast      = blast?.side === side;
  const isMyHit        = hitAnim?.side === side;
  const isMyTransition = transitionAnim?.side === side;
  const img = side === 'player' ? character.imageRight : character.imageLeft;
  const pct = Math.max(0, (character.life / GAME_LIFE) * 100);
  const barColor = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-rose-500';
  const dmgColor = side === 'player' ? 'text-rose-400' : 'text-amber-300';

  return (
    <div className="flex flex-col items-center w-full flex-1 min-h-0 relative">
      {/* Speech bubble — absolutely outside the panel, never affects portrait size */}
      {speech && (
        <div className={`absolute top-1/4 z-20 w-36 ${side === 'player' ? 'left-full ml-3' : 'right-full mr-3'}`}>
          <div className="relative bg-purple-950/90 border border-purple-500 rounded-xl px-3 py-2 text-sm text-purple-100 text-center break-words animate-fade-in">
            &ldquo;{speech}&rdquo;
            <div className={`absolute top-3 w-3 h-3 bg-purple-950/90 rotate-45
              ${side === 'player'
                ? '-left-1.5 border-l border-b border-purple-500'
                : '-right-1.5 border-r border-t border-purple-500'
              }`}
            />
          </div>
        </div>
      )}

      {shapeshiftControl && <div className="shrink-0 mb-2">{shapeshiftControl}</div>}

      {/* Portrait always fills full panel width */}
      <div ref={portraitRef} className="relative w-full flex-1 min-h-20">
        <img src={img} alt={character.displayName} className="w-full h-full object-contain" />

        {isMyBlast && blast && (
          <img key={blast.key} src={blast.url} alt="" className="absolute inset-0 w-full h-full object-contain blast-animate" />
        )}
        {isMyHit && hitAnim && (
          <img key={hitAnim.key} src={hitAnim.url} alt="" className="absolute inset-0 w-full h-full object-contain hit-animate" />
        )}
        {isMyTransition && transitionAnim && (
          <img key={transitionAnim.key} src={transitionAnim.url} alt="" className="absolute inset-0 w-full h-full object-contain transition-animate" />
        )}
        {dmgFloat && (
          <div
            key={dmgFloat.key}
            className={`absolute left-1/2 top-1/4 damage-float text-6xl font-black select-none z-10 ${dmgColor}`}
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)' }}
            onAnimationEnd={onDmgFloatEnd}
          >
            {dmgFloat.text}
          </div>
        )}
      </div>

      {/* Name and HP always visible below */}
      <span className="shrink-0 text-purple-200 text-lg font-semibold mt-2">{character.displayName}</span>
      <div className="shrink-0 w-full bg-slate-800 rounded-full h-3 border border-slate-700 mt-2">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs text-purple-400 tabular-nums mt-1">{character.life} / {GAME_LIFE} HP</span>
    </div>
  );
}
