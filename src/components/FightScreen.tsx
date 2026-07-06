import { useEffect, useRef, useState } from 'react';
import type { ActionChoice, Character, LogEntry, MagicType } from '../types/game';
import { GAME_LIFE } from '../types/game';
import { executeAction, getActionChoices, pickOpponentAction, pickReaction, pickTaunt, wearDownEffects } from '../engine/combat';
import { sampleDominantColor } from '../engine/colorSampler';

interface Props {
  initialPlayer: Character;
  initialOpponent: Character;
  onGameOver: (winner: 'player' | 'opponent', player: Character, opponent: Character) => void;
}

type Phase = 'choosing' | 'animating';

interface BlastAnim {
  url: string;
  key: number;
  side: 'player' | 'opponent';
}

const ORB_SHAPES: { clipPath: string; borderRadius: string }[] = [
  { clipPath: 'none',                                                                                                                                                       borderRadius: '50%' }, // circle
  { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',                                                                                                               borderRadius: '0'   }, // diamond
  { clipPath: 'polygon(50% 0%, 54% 46%, 100% 50%, 54% 54%, 50% 100%, 46% 54%, 0% 50%, 46% 46%)',                                                                           borderRadius: '0'   }, // 4-pointed star
  { clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',                                                          borderRadius: '0'   }, // 5-pointed star
  { clipPath: 'polygon(50% 0%, 57% 34%, 85% 15%, 66% 43%, 100% 50%, 66% 57%, 85% 85%, 57% 66%, 50% 100%, 43% 66%, 15% 85%, 34% 57%, 0% 50%, 34% 43%, 15% 15%, 43% 34%)', borderRadius: '0'   }, // 8-pointed burst
];

const MAGIC_COLORS: Record<MagicType, string> = {
  dark:    'bg-purple-800 hover:bg-purple-700 border-purple-500 text-purple-100',
  light:   'bg-amber-700  hover:bg-amber-600  border-amber-400  text-amber-100',
  chaotic: 'bg-rose-800   hover:bg-rose-700   border-rose-500   text-rose-100',
  ordered: 'bg-blue-800   hover:bg-blue-700   border-blue-500   text-blue-100',
  hot:     'bg-orange-700 hover:bg-orange-600 border-orange-400 text-orange-100',
  cold:    'bg-cyan-800   hover:bg-cyan-700   border-cyan-500   text-cyan-100',
};

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

let logCounter = 0;
function makeLog(text: string, type: LogEntry['type']): LogEntry {
  return { id: logCounter++, text, type };
}

export default function FightScreen({ initialPlayer, initialOpponent, onGameOver }: Props) {
  const [player, setPlayer] = useState(initialPlayer);
  const [opponent, setOpponent] = useState(initialOpponent);
  const [log, setLog] = useState<LogEntry[]>([
    makeLog(`⚔️  ${initialPlayer.displayName} vs ${initialOpponent.displayName} — begin!`, 'system'),
  ]);
  const [choices, setChoices] = useState<ActionChoice[]>(() => getActionChoices(initialPlayer));
  const [phase, setPhase] = useState<Phase>('choosing');
  const [blast, setBlast] = useState<BlastAnim | null>(null);
  const [transitionAnim, setTransitionAnim] = useState<BlastAnim | null>(null);
  const [taunt, setTaunt] = useState<string | null>(null);

  const playerBlastIdx = useRef(0);
  const opponentBlastIdx = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const playerPortraitRef = useRef<HTMLDivElement>(null);
  const opponentPortraitRef = useRef<HTMLDivElement>(null);
  const projectileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  function fireProjectile(imageUrl: string, fromSide: 'player' | 'opponent') {
    const fromEl = fromSide === 'player' ? playerPortraitRef.current : opponentPortraitRef.current;
    const toEl   = fromSide === 'player' ? opponentPortraitRef.current : playerPortraitRef.current;
    const el = projectileRef.current;
    if (!fromEl || !toEl || !el) return;
    if (typeof el.animate !== 'function') return;

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

  async function showTransition(side: 'player' | 'opponent', fromPath: string, toPath: string) {
    const isSprite = fromPath === 'nora/meadow_sprite' || toPath === 'nora/meadow_sprite';
    const suffix = isSprite
      ? 'sprite_to_humanoid_or_humanoid_to_sprite'
      : 'humanoid_to_humanoid';
    const dir = side === 'player' ? 'right' : 'left';
    const url = `/images/characters/ability_transitions/nora_mf_splat_${suffix}_face_${dir}.png`;
    setTransitionAnim({ url, key: Date.now(), side });
    await delay(1800);
    setTransitionAnim(null);
  }

  async function showBlast(character: Character, side: 'player' | 'opponent') {
    const images = side === 'player' ? character.blastImagesRight : character.blastImagesLeft;
    const idx = side === 'player' ? playerBlastIdx : opponentBlastIdx;
    const url = images[idx.current % images.length];
    idx.current++;
    fireProjectile(url, side); // fire-and-forget; runs concurrently with blast image
    setBlast({ url, key: Date.now(), side });
    await delay(2200);
    setBlast(null);
  }

  async function executeTurn(actionKey: string) {
    setPhase('animating');
    setTaunt(null);

    let p = player;
    let o = opponent;

    // ── Player's turn ──────────────────────────────────────────────────
    const pResult = await executeAction(actionKey, p, o);
    const pFromPath = p.namePath;
    p = pResult.updatedActor;
    o = pResult.updatedTarget;

    if (pResult.transformation) {
      await showTransition('player', pFromPath, p.namePath);
      setPlayer(p);
      setLog(prev => [...prev,
        makeLog(`✨ ${pResult.transformation!.message}`, 'system'),
        makeLog(pResult.message, 'player'),
      ].slice(-60));
    } else {
      // Blast plays first, then health bar drops and message appears together
      await showBlast(p, 'player');
      setPlayer(p);
      setOpponent(o);
      setLog(prev => [...prev, makeLog(pResult.message, 'player')].slice(-60));
    }

    // Pause so the player can read what just happened before opponent fires
    await delay(900);

    if (o.life <= 0) {
      onGameOver('player', p, o);
      return;
    }

    // ── Opponent's turn ────────────────────────────────────────────────
    const oppActionKey = pickOpponentAction(o);
    const oResult = await executeAction(oppActionKey, o, p);
    const oFromPath = o.namePath;
    o = oResult.updatedActor;
    p = oResult.updatedTarget;

    if (oResult.transformation) {
      await showTransition('opponent', oFromPath, o.namePath);
      setOpponent(o);
      setLog(prev => [...prev,
        makeLog(`✨ ${oResult.transformation!.message}`, 'system'),
        makeLog(oResult.message, 'opponent'),
      ].slice(-60));
    } else {
      await showBlast(o, 'opponent');
      setPlayer(p);
      setOpponent(o);

      const oppEntries: LogEntry[] = [makeLog(oResult.message, 'opponent')];
      if (oResult.damage > 0) {
        const reaction = pickReaction(p);
        if (reaction) oppEntries.push(makeLog(`${p.displayName}: "${reaction}"`, 'taunt'));
      }
      const newTaunt = pickTaunt(o);
      if (newTaunt) oppEntries.push(makeLog(`${o.displayName}: "${newTaunt}"`, 'taunt'));
      setTaunt(newTaunt);
      setLog(prev => [...prev, ...oppEntries].slice(-60));
    }

    // Brief pause after opponent result, then re-enable choices
    await delay(600);

    // Wear down any active debuffs
    p = wearDownEffects(p);
    o = wearDownEffects(o);
    setPlayer(p);
    setOpponent(o);

    if (p.life <= 0) {
      onGameOver('opponent', p, o);
      return;
    }

    setChoices(getActionChoices(p));
    setPhase('choosing');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col">
      {/* Projectile orb — fixed-position, opacity:0 keeps it invisible when idle */}
      <div
        ref={projectileRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{ width: 36, height: 36, zIndex: 100, opacity: 0 }}
      />
      {/* Header */}
      <div className="text-center py-3 border-b border-purple-800">
        <span className="text-purple-400 text-sm tracking-widest uppercase">Magic Fight</span>
      </div>

      {/* Arena */}
      <div className="flex flex-col md:flex-row flex-1 gap-0">
        {/* Player */}
        <div className="flex flex-col items-center justify-center p-4 md:w-48 shrink-0">
          <CharacterPanel character={player} side="player" blast={blast} transitionAnim={transitionAnim} taunt={null} portraitRef={playerPortraitRef} />
        </div>

        {/* Center: log */}
        <div className="flex-1 flex flex-col px-2 py-4 min-h-48 md:min-h-0">
          <div className="flex-1 overflow-y-auto rounded-xl bg-black/30 border border-purple-900 p-3 mb-4 text-sm space-y-1.5" style={{ maxHeight: '260px' }}>
            {log.map(entry => (
              <p key={entry.id} className={logClass(entry.type)}>
                {entry.text}
              </p>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Action buttons — stay visible, just dimmed while animating */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {choices.map(choice => (
              <button
                key={choice.key}
                onClick={() => executeTurn(choice.key)}
                disabled={phase !== 'choosing'}
                title={choice.description}
                className={[
                  'px-3 py-2 rounded-lg border text-xs font-semibold text-left leading-snug',
                  'transition-opacity disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
                  choice.isSpecial
                    ? 'bg-indigo-800 hover:bg-indigo-700 border-indigo-500 text-indigo-100'
                    : MAGIC_COLORS[choice.magicType!],
                ].join(' ')}
              >
                <span className="block text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                  {choice.isSpecial ? '★ special' : choice.magicType}
                </span>
                {choice.label}
              </button>
            ))}
          </div>
          {/* Casting indicator — fixed height so layout never jumps */}
          <div className="h-6 flex items-center justify-center mt-1">
            {phase === 'animating' && (
              <span className="flex items-center gap-1.5 text-xs text-purple-400">
                <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block" />
                Casting…
              </span>
            )}
          </div>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center justify-center p-4 md:w-48 shrink-0">
          <CharacterPanel character={opponent} side="opponent" blast={blast} transitionAnim={transitionAnim} taunt={taunt} portraitRef={opponentPortraitRef} />
        </div>
      </div>
    </div>
  );
}

function CharacterPanel({
  character,
  side,
  blast,
  transitionAnim,
  taunt,
  portraitRef,
}: {
  character: Character;
  side: 'player' | 'opponent';
  blast: BlastAnim | null;
  transitionAnim: BlastAnim | null;
  taunt: string | null;
  portraitRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const isMyBlast = blast?.side === side;
  const isMyTransition = transitionAnim?.side === side;
  const img = side === 'player' ? character.imageRight : character.imageLeft;
  const pct = Math.max(0, (character.life / GAME_LIFE) * 100);
  const barColor = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex flex-col items-center w-36">
      {/* Fixed-height taunt bubble area — always reserved so both panels stay the same height */}
      <div className="h-20 w-full flex items-center justify-center mb-2">
        {side === 'opponent' && taunt && (
          <div className="text-xs bg-white/10 border border-purple-600 text-purple-200 rounded-xl px-3 py-1.5 text-center max-w-full animate-fade-in overflow-hidden line-clamp-4">
            &ldquo;{taunt}&rdquo;
          </div>
        )}
      </div>

      {/* Character image */}
      <div ref={portraitRef} className="relative w-32 h-32">
        <img src={img} alt={character.displayName} className="w-full h-full object-contain" />
        {isMyBlast && blast && (
          <img
            key={blast.key}
            src={blast.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain blast-animate"
          />
        )}
        {isMyTransition && transitionAnim && (
          <img
            key={transitionAnim.key}
            src={transitionAnim.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain blast-animate"
          />
        )}
      </div>

      {/* Name */}
      <span className="text-purple-200 text-sm font-semibold mt-2">{character.displayName}</span>

      {/* Fixed-height drunk badge area */}
      <div className="h-5 flex items-center">
        {character.isDrunk && <span className="text-xs text-amber-400">🍺 dizzy</span>}
      </div>

      {/* Health bar */}
      <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-purple-400 tabular-nums mt-1">{character.life} / {GAME_LIFE} HP</span>
    </div>
  );
}

function logClass(type: LogEntry['type']): string {
  switch (type) {
    case 'player':   return 'text-blue-300';
    case 'opponent': return 'text-rose-300';
    case 'taunt':    return 'text-amber-300 italic';
    case 'system':   return 'text-purple-400';
  }
}
