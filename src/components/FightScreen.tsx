import { useEffect, useRef, useState } from 'react';
import type { ActionChoice, Character, LogEntry, MagicType } from '../types/game';
import { GAME_LIFE } from '../types/game';
import { executeAction, getActionChoices, pickOpponentAction, pickReaction, wearDownEffects } from '../engine/combat';

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
  const [taunt, setTaunt] = useState<string | null>(null);

  const playerBlastIdx = useRef(0);
  const opponentBlastIdx = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  async function showBlast(character: Character, side: 'player' | 'opponent') {
    const images = side === 'player' ? character.blastImagesRight : character.blastImagesLeft;
    const idx = side === 'player' ? playerBlastIdx : opponentBlastIdx;
    const url = images[idx.current % images.length];
    idx.current++;
    setBlast({ url, key: Date.now(), side });
    await delay(2200);
    setBlast(null);
  }

  async function executeTurn(actionKey: string) {
    setPhase('animating');
    setTaunt(null);

    let p = player;
    let o = opponent;
    const newLog: LogEntry[] = [];

    // --- Player action ---
    const pResult = await executeAction(actionKey, p, o);
    p = pResult.updatedActor;
    o = pResult.updatedTarget;

    // Show blast before applying damage visually (blast plays, then bars update)
    if (!pResult.transformation) {
      await showBlast(p, 'player');
    } else {
      newLog.push(makeLog(`✨ ${pResult.transformation.message}`, 'system'));
    }

    newLog.push(makeLog(pResult.message, 'player'));
    setPlayer(p);
    setOpponent(o);
    setLog(prev => [...prev, ...newLog].slice(-60));
    newLog.length = 0;

    if (o.life <= 0) {
      setPhase('choosing');
      onGameOver('player', p, o);
      return;
    }

    // --- Opponent action ---
    await delay(400);
    const oppActionKey = pickOpponentAction(o);
    const oResult = await executeAction(oppActionKey, o, p);
    o = oResult.updatedActor;
    p = oResult.updatedTarget;

    if (!oResult.transformation) {
      await showBlast(o, 'opponent');
    } else {
      newLog.push(makeLog(`✨ ${oResult.transformation.message}`, 'system'));
    }

    // Reaction from player when hit
    if (!oResult.transformation && oResult.damage > 0) {
      const reaction = pickReaction(p);
      if (reaction) newLog.push(makeLog(`${p.displayName}: "${reaction}"`, 'taunt'));
    }

    newLog.push(makeLog(oResult.message, 'opponent'));

    // Opponent taunt
    let newTaunt: string | null = null;
    if (o.tauntsInfo && Math.random() < o.tauntsInfo.chance) {
      const taunts = o.tauntsInfo.taunts;
      newTaunt = taunts[Math.floor(Math.random() * taunts.length)];
      newLog.push(makeLog(`${o.displayName}: "${newTaunt}"`, 'taunt'));
    }

    // Wear down debuffs
    p = wearDownEffects(p);
    o = wearDownEffects(o);

    setPlayer(p);
    setOpponent(o);
    setTaunt(newTaunt);
    setLog(prev => [...prev, ...newLog].slice(-60));

    if (p.life <= 0) {
      setPhase('choosing');
      onGameOver('opponent', p, o);
      return;
    }

    setChoices(getActionChoices(p));
    setPhase('choosing');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="text-center py-3 border-b border-purple-800">
        <span className="text-purple-400 text-sm tracking-widest uppercase">Magic Fight</span>
      </div>

      {/* Arena */}
      <div className="flex flex-col md:flex-row flex-1 gap-0">
        {/* Player */}
        <div className="flex flex-col items-center justify-center p-4 md:w-48 shrink-0">
          <CharacterPanel character={player} side="player" blast={blast} taunt={null} />
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

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {phase === 'choosing' ? (
              choices.map(choice => (
                <button
                  key={choice.key}
                  onClick={() => executeTurn(choice.key)}
                  title={choice.description}
                  className={[
                    'px-3 py-2 rounded-lg border text-xs font-semibold text-left transition-all leading-snug',
                    choice.isSpecial
                      ? 'bg-indigo-800 hover:bg-indigo-700 border-indigo-500 text-indigo-100'
                      : MAGIC_COLORS[choice.magicType!],
                  ].join(' ')}
                >
                  <span className="block text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                    {choice.isSpecial ? '★ special' : choice.magicType}
                    {!choice.isSpecial && ` · ${choice.damage} dmg`}
                  </span>
                  {choice.label}
                </button>
              ))
            ) : (
              <div className="col-span-2 sm:col-span-3 flex items-center justify-center gap-2 py-4 text-purple-400 text-sm">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                Casting…
              </div>
            )}
          </div>
        </div>

        {/* Opponent */}
        <div className="flex flex-col items-center justify-center p-4 md:w-48 shrink-0">
          <CharacterPanel character={opponent} side="opponent" blast={blast} taunt={taunt} />
        </div>
      </div>
    </div>
  );
}

function CharacterPanel({
  character,
  side,
  blast,
  taunt,
}: {
  character: Character;
  side: 'player' | 'opponent';
  blast: BlastAnim | null;
  taunt: string | null;
}) {
  const isMyBlast = blast?.side === side;
  const img = side === 'player' ? character.imageRight : character.imageLeft;
  const pct = Math.max(0, (character.life / GAME_LIFE) * 100);
  const barColor = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex flex-col items-center gap-2 w-36">
      {/* Taunt bubble (opponent only) */}
      {side === 'opponent' && taunt && (
        <div className="text-xs bg-white/10 border border-purple-600 text-purple-200 rounded-xl px-3 py-1.5 text-center max-w-full animate-fade-in">
          &ldquo;{taunt}&rdquo;
        </div>
      )}

      {/* Character image */}
      <div className="relative w-32 h-32">
        <img src={img} alt={character.displayName} className="w-full h-full object-contain" />
        {isMyBlast && blast && (
          <img
            key={blast.key}
            src={blast.url}
            alt=""
            className="absolute inset-0 w-full h-full object-contain blast-animate"
          />
        )}
      </div>

      {/* Name */}
      <span className="text-purple-200 text-sm font-semibold">{character.displayName}</span>
      {character.isDrunk && <span className="text-xs text-amber-400">🍺 dizzy</span>}

      {/* Health bar */}
      <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-purple-400 tabular-nums">{character.life} / {GAME_LIFE} HP</span>
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
