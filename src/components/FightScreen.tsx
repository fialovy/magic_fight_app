import { useEffect, useRef, useState } from 'react';
import type { Character, CollisionOutcome, LogEntry, PatternRule, ReactionsInfo, Spell, TimerResult, TauntsInfo } from '../types/game';
import { GAME_LIFE } from '../types/game';
import { pickReaction, pickTaunt } from '../engine/combat';
import { sampleDominantColor } from '../engine/colorSampler';
import {
  checkPattern, generateHand, guaranteeMatch, OUTCOME_DAMAGE,
  randomPatternRule, randomSpell, resolveCollision,
} from '../data/spells';
import SpellCard from './SpellCard';
import { BLAST_COUNTS } from 'virtual:blast-counts';

interface Props {
  initialPlayer: Character;
  initialOpponent: Character;
  onGameOver: (winner: 'player' | 'opponent', player: Character, opponent: Character) => void;
}

type TurnPhase = 'between-turns' | 'hand-shown' | 'opponent-shown' | 'resolving';

interface BlastAnim { url: string; key: number; side: 'player' | 'opponent'; }

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
    imageLeft:        `/images/characters/${prefix}_mf_face_left.png`,
    imageRight:       `/images/characters/${prefix}_mf_face_right.png`,
    hitImageLeft:     `/images/characters/on_impact/${prefix}_mf_hit_face_left.png`,
    hitImageRight:    `/images/characters/on_impact/${prefix}_mf_hit_face_right.png`,
    blastImagesLeft:  Array.from({ length: count }, (_, i) => `/images/characters/on_cast/${prefix}_mf_blast_${i}_face_left.png`),
    blastImagesRight: Array.from({ length: count }, (_, i) => `/images/characters/on_cast/${prefix}_mf_blast_${i}_face_right.png`),
  };
}

let logCounter = 0;
function makeLog(text: string, type: LogEntry['type']): LogEntry {
  return { id: logCounter++, text, type };
}

function logClass(type: LogEntry['type']): string {
  switch (type) {
    case 'player':   return 'text-blue-300';
    case 'opponent': return 'text-rose-300';
    case 'taunt':    return 'text-amber-300 italic';
    case 'system':   return 'text-purple-400';
  }
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function buildLog(
  timerResult: TimerResult,
  outcome: CollisionOutcome,
  playerSpell: Spell | null,
  oppSpell: Spell,
  damage: number,
  opponentName: string,
): string {
  const you  = playerSpell ? `your ${playerSpell.color} ${playerSpell.shape}` : 'nothing';
  const them = `${opponentName}'s ${oppSpell.color} ${oppSpell.shape}`;
  const slow = timerResult === 'timeout' ? ' (too slow)' : '';
  switch (outcome) {
    case 'decisive-win':  return `${cap(you)} blew straight through ${them}!${slow} −${damage} HP`;
    case 'win':           return `${cap(you)} overpowered ${them}.${slow} −${damage} HP`;
    case 'neutral':       return `${cap(you)} and ${them} cancelled out.${slow}`;
    case 'loss':          return `${them} overpowered ${you}.${slow} −${damage} HP`;
    case 'decisive-loss': return `${them} blew straight through${slow}! −${damage} HP`;
  }
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
  const patternRef       = useRef({ rule: randomPatternRule() as PatternRule, turnsLeft: 5 });
  const cardClickRef     = useRef<((spell: Spell) => void) | null>(null);
  const playerBlastIdx   = useRef(0);
  const opponentBlastIdx = useRef(0);
  const noraFormIdxRef   = useRef(0);
  const noraFormDataRef  = useRef<NoraFormOverride[] | null>(null);
  const restartTimerRef  = useRef<(() => void) | null>(null);

  // Display state
  const [noraFormIdx, setNoraFormIdx]   = useState(0);
  const [player,       setPlayer]       = useState(initialPlayer);
  const [opponent,     setOpponent]     = useState(initialOpponent);
  const [log,          setLog]          = useState<LogEntry[]>([
    makeLog(`⚔️  ${initialPlayer.displayName} vs ${initialOpponent.displayName} — begin!`, 'system'),
  ]);
  const [phase,        setPhase]        = useState<TurnPhase>('between-turns');
  const [hand,         setHand]         = useState<Spell[]>([]);
  const [opponentSpell, setOpponentSpell] = useState<Spell | null>(null);
  const [selectedIdx,  setSelectedIdx]  = useState<number | null>(null);
  const [lastOutcome,  setLastOutcome]  = useState<CollisionOutcome | null>(null);
  const [blast,          setBlast]          = useState<BlastAnim | null>(null);
  const [hitAnim,        setHitAnim]        = useState<BlastAnim | null>(null);
  const [transitionAnim, setTransitionAnim] = useState<BlastAnim | null>(null);
  const [taunt,          setTaunt]          = useState<string | null>(null);

  const logEndRef           = useRef<HTMLDivElement>(null);
  const playerPortraitRef   = useRef<HTMLDivElement>(null);
  const opponentPortraitRef = useRef<HTMLDivElement>(null);
  const projectileRef       = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  async function showTransitionEffect(fromIdx: number, toIdx: number) {
    const isSprite = fromIdx === 2 || toIdx === 2;
    const suffix   = isSprite ? 'sprite_to_humanoid_or_humanoid_to_sprite' : 'humanoid_to_humanoid';
    const side     = isNora(initialPlayer) ? 'player' : 'opponent';
    const dir      = side === 'player' ? 'right' : 'left';
    const url      = `/images/characters/ability_transitions/nora_mf_splat_${suffix}_face_${dir}.png`;
    setTransitionAnim({ url, key: Date.now(), side });
    await delay(1800);
    setNoraFormIdx(toIdx);   // switch portrait only after animation completes
    setTransitionAnim(null);
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

  function fireProjectile(imageUrl: string, fromSide: 'player' | 'opponent') {
    const fromEl = fromSide === 'player' ? playerPortraitRef.current : opponentPortraitRef.current;
    const toEl   = fromSide === 'player' ? opponentPortraitRef.current : playerPortraitRef.current;
    const el = projectileRef.current;
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

  async function showBlast(caster: Character, casterSide: 'player' | 'opponent', recipient: Character) {
    const images = casterSide === 'player' ? caster.blastImagesRight : caster.blastImagesLeft;
    const recipientSide: 'player' | 'opponent' = casterSide === 'player' ? 'opponent' : 'player';
    const hitUrl = recipientSide === 'player' ? recipient.hitImageRight : recipient.hitImageLeft;

    if (images.length > 0) {
      const idxRef = casterSide === 'player' ? playerBlastIdx : opponentBlastIdx;
      const url = images[idxRef.current % images.length];
      idxRef.current++;
      fireProjectile(url, casterSide);
      setBlast({ url, key: Date.now(), side: casterSide });
    }

    await delay(836);
    setHitAnim({ url: hitUrl, key: Date.now(), side: recipientSide });
    await delay(1364);
    setBlast(null);
    setHitAnim(null);
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
    setTaunt(null);
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
        }, 3000);
      };
      restartTimerRef.current = arm;
      arm();
    });
    restartTimerRef.current = null;

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
      await showBlast(vP, 'player', vO);
    } else if (outcome === 'loss' || outcome === 'decisive-loss') {
      await showBlast(vO, 'opponent', vP);
    } else {
      await delay(800);
    }

    // Commit state
    setPlayer(newP);
    setOpponent(newO);
    livePlayerRef.current  = newP;
    liveOpponentRef.current = newO;

    const logType: LogEntry['type'] =
      (outcome === 'win' || outcome === 'decisive-win') ? 'player' :
      (outcome === 'loss' || outcome === 'decisive-loss') ? 'opponent' : 'system';

    const entries: LogEntry[] = [
      makeLog(buildLog(timerResult, outcome, selectedSpell, oppSpell, damage, o.displayName), logType),
    ];

    if ((outcome === 'loss' || outcome === 'decisive-loss') && damage > 0) {
      const reaction = pickReaction(newP);
      if (reaction) entries.push(makeLog(`${newP.displayName}: "${reaction}"`, 'taunt'));
    }

    const newTaunt = pickTaunt(o);
    if (newTaunt) {
      setTaunt(newTaunt);
      entries.push(makeLog(`${o.displayName}: "${newTaunt}"`, 'taunt'));
    }

    setLog(prev => [...prev, ...entries].slice(-60));

    await delay(800);

    const finalP = isNora(newP) ? applyNoraForm(newP, noraFormIdxRef.current, noraFormDataRef.current) : newP;
    const finalO = isNora(newO) ? applyNoraForm(newO, noraFormIdxRef.current, noraFormDataRef.current) : newO;
    if (newO.life <= 0) { onGameOver('player',   finalP, finalO); return; }
    if (newP.life <= 0) { onGameOver('opponent', finalP, finalO); return; }

    // Rotate pattern every 5 turns
    const newTurnsLeft = turnsLeft - 1;
    patternRef.current = newTurnsLeft <= 0
      ? { rule: randomPatternRule(), turnsLeft: 5 }
      : { rule, turnsLeft: newTurnsLeft };

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
          fetch(`/characters/${path}/taunts.json`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/characters/${path}/reactions.json`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        return { tauntsInfo: taunts, reactionsInfo: reactions } as NoraFormOverride;
      })
    ).then(data => { noraFormDataRef.current = data; });
  }, []);

  const showOpponentSpell = opponentSpell && (phase === 'opponent-shown' || phase === 'resolving');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col">
      <div
        ref={projectileRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{ width: 36, height: 36, zIndex: 100, opacity: 0 }}
      />

      <div className="text-center py-3 border-b border-purple-800">
        <span className="text-purple-400 text-sm tracking-widest uppercase">Magic Fight</span>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-0">
        {/* Player */}
        <div className="flex flex-col items-center justify-center p-4 md:w-64 shrink-0">
          <CharacterPanel
            character={isNora(player) ? applyNoraForm(player, noraFormIdx, noraFormDataRef.current) : player} side="player"
            blast={blast} hitAnim={hitAnim} transitionAnim={transitionAnim} taunt={null}
            portraitRef={playerPortraitRef}
            shapeshiftControl={isNora(player) ? <NoraSegmented formIdx={noraFormIdx} onChange={handleNoraFormChange} /> : undefined}
          />
        </div>

        {/* Center */}
        <div className="flex-1 flex flex-col px-2 py-4 min-h-48 md:min-h-0 gap-3">
          {/* Combat log */}
          <div
            className="flex-1 overflow-y-auto rounded-xl bg-black/30 border border-purple-900 p-3 text-sm space-y-1.5"
            style={{ maxHeight: '200px' }}
          >
            {log.map(entry => (
              <p key={entry.id} className={logClass(entry.type)}>{entry.text}</p>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Opponent spell */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-purple-500 text-xs uppercase tracking-widest h-4">
              {showOpponentSpell ? "Opponent's spell" : ''}
            </span>
            <div className="h-32 flex items-center justify-center">
              {showOpponentSpell ? (
                <SpellCard
                  spell={opponentSpell!}
                  size={110}
                  glowing={phase === 'opponent-shown'}
                />
              ) : (
                <div className="w-28 h-28 rounded-xl border-2 border-purple-800/20 bg-purple-950/20 flex items-center justify-center">
                  <span className="text-purple-800 text-3xl select-none">?</span>
                </div>
              )}
            </div>
            <div className="h-5 flex items-center justify-center">
              {phase === 'resolving' && lastOutcome && (
                <span className={`text-sm font-bold ${outcomeColor(lastOutcome)}`}>
                  {outcomeLabel(lastOutcome)}
                </span>
              )}
            </div>
          </div>

          {/* Player hand */}
          <div className="flex gap-2 justify-center">
            {hand.map((spell, i) => (
              <SpellCard
                key={i}
                spell={spell}
                size={80}
                onClick={() => handleCardClick(spell, i)}
                selected={selectedIdx === i}
                disabled={phase !== 'opponent-shown'}
              />
            ))}
          </div>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center justify-center p-4 md:w-64 shrink-0">
          <CharacterPanel
            character={isNora(opponent) ? applyNoraForm(opponent, noraFormIdx, noraFormDataRef.current) : opponent} side="opponent"
            blast={blast} hitAnim={hitAnim} transitionAnim={transitionAnim} taunt={taunt}
            portraitRef={opponentPortraitRef}
            shapeshiftControl={isNora(opponent) ? <NoraSegmented formIdx={noraFormIdx} onChange={handleNoraFormChange} /> : undefined}
          />
        </div>
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
  character, side, blast, hitAnim, transitionAnim, taunt, portraitRef, shapeshiftControl,
}: {
  character: Character;
  side: 'player' | 'opponent';
  blast: BlastAnim | null;
  hitAnim: BlastAnim | null;
  transitionAnim: BlastAnim | null;
  taunt: string | null;
  portraitRef?: React.RefObject<HTMLDivElement | null>;
  shapeshiftControl?: React.ReactNode;
}) {
  const isMyBlast      = blast?.side === side;
  const isMyHit        = hitAnim?.side === side;
  const isMyTransition = transitionAnim?.side === side;
  const img = side === 'player' ? character.imageRight : character.imageLeft;
  const pct = Math.max(0, (character.life / GAME_LIFE) * 100);
  const barColor = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex flex-col items-center w-52">
      <div className="h-20 w-full flex items-center justify-center mb-2">
        {side === 'opponent' && taunt && (
          <div className="text-xs bg-white/10 border border-purple-600 text-purple-200 rounded-xl px-3 py-1.5 text-center max-w-full overflow-hidden line-clamp-4">
            &ldquo;{taunt}&rdquo;
          </div>
        )}
      </div>

      {shapeshiftControl && <div className="mb-2">{shapeshiftControl}</div>}
      <div ref={portraitRef} className="relative w-44 h-44">
        <img src={img} alt={character.displayName} className="w-full h-full object-contain" />
        {isMyBlast && blast && (
          <img key={blast.key} src={blast.url} alt="" className="absolute inset-0 w-full h-full object-contain blast-animate" />
        )}
        {isMyHit && hitAnim && (
          <img key={hitAnim.key} src={hitAnim.url} alt="" className="absolute inset-0 w-full h-full object-contain hit-animate" />
        )}
        {isMyTransition && transitionAnim && (
          <img key={transitionAnim.key} src={transitionAnim.url} alt="" className="absolute inset-0 w-full h-full object-contain blast-animate" />
        )}
      </div>

      <span className="text-purple-200 text-sm font-semibold mt-2">{character.displayName}</span>
      <div className="h-5" />

      <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-purple-400 tabular-nums mt-1">{character.life} / {GAME_LIFE} HP</span>
    </div>
  );
}
