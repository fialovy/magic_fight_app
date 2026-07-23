import { useEffect, useRef, useState } from 'react';
import type { Character, TurnRecord } from '../types/game';
import { GAME_LIFE } from '../types/game';
import confetti from 'canvas-confetti';

async function downloadImage(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

interface Props {
  winner: 'player' | 'opponent';
  player: Character;
  opponent: Character;
  turnHistory: TurnRecord[];
  onNewGame: () => void;
}

export default function GameOverScreen({ winner, player, opponent, turnHistory, onNewGame }: Props) {
  const playerWon = winner === 'player';
  const [carouselIdx, setCarouselIdx] = useState<number | null>(null);
  const trophies = player.blastImagesRight;

  useEffect(() => {
    if (!playerWon) return;
    const colors = ['#fbbf24', '#f59e0b', '#a855f7', '#ec4899', '#38bdf8', '#4ade80', '#f87171', '#fb923c'];
    confetti({
      particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.15 },
      colors, shapes: ['star', 'circle', 'square'],
      startVelocity: 35, gravity: 0.8, decay: 0.92, scalar: 1.1, zIndex: 50,
    });
  }, [playerWon]);

  return (
    <div className="min-h-screen app-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="text-center mb-8">
        <h1 className={`text-5xl font-extrabold mb-2 ${playerWon ? 'text-amber-300' : 'text-rose-400'}`}>
          {playerWon ? 'Victory!' : 'Defeat.'}
        </h1>
        <p className="text-purple-300 text-lg">
          {playerWon
            ? `${player.displayName} has vanquished ${opponent.displayName}!`
            : `${opponent.displayName} has defeated ${player.displayName}.`}
        </p>
      </div>

      <div className="flex items-center gap-12 mb-10">
        <CharacterDisplay character={player}   side="player"   won={playerWon}  />
        <span className="text-4xl font-bold text-purple-500">vs</span>
        <CharacterDisplay character={opponent} side="opponent" won={!playerWon} />
      </div>

      <div className="flex gap-4 mb-10">
        <button
          onClick={onNewGame}
          className="w-40 px-8 py-3 text-lg font-bold rounded-xl bg-purple-700 hover:bg-purple-600 text-white border border-purple-500 transition-all hover:scale-105 shadow-lg shadow-purple-900/50"
        >
          New Game
        </button>
        {playerWon && trophies.length > 0 && (
          <TrophyButton onClick={() => setCarouselIdx(0)} />
        )}
      </div>

      {turnHistory.length > 0 && <BattleStats history={turnHistory} playerWon={playerWon} />}

      {/* Carousel modal */}
      {carouselIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setCarouselIdx(null)}
        >
          <div
            className="relative bg-indigo-950 border border-purple-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-5 max-w-lg w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setCarouselIdx(null)}
              className="absolute top-3 right-4 text-purple-400 hover:text-purple-200 text-2xl leading-none"
              aria-label="Close"
            >✕</button>

            <p className="text-amber-300 text-sm font-semibold tracking-wide">
              {player.displayName} — portrait {carouselIdx + 1} of {trophies.length}
            </p>

            <img
              src={trophies[carouselIdx]}
              alt={`${player.displayName} combat ${carouselIdx}`}
              className="max-h-[60vh] max-w-full object-contain rounded-lg"
            />

            <div className="flex gap-3 items-center">
              <button
                onClick={() => setCarouselIdx(i => i! - 1)}
                className={`px-4 py-2 rounded-lg border border-purple-600 text-purple-300 hover:bg-purple-800 text-sm transition-colors ${carouselIdx > 0 ? '' : 'invisible'}`}
              >← Prev</button>
              <button
                onClick={() => downloadImage(
                  trophies[carouselIdx],
                  `${player.displayName.toLowerCase().replace(/\s+/g, '_')}_combat_${carouselIdx}.png`
                )}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm border border-amber-400 transition-colors"
              >⬇ Download</button>
              <button
                onClick={() => setCarouselIdx(i => i! + 1)}
                className={`px-4 py-2 rounded-lg border border-purple-600 text-purple-300 hover:bg-purple-800 text-sm transition-colors ${carouselIdx < trophies.length - 1 ? '' : 'invisible'}`}
              >Next →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterDisplay({ character, side, won }: { character: Character; side: 'player' | 'opponent'; won: boolean }) {
  const pct = Math.max(0, (character.life / GAME_LIFE) * 100);
  const barColor = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex flex-col items-center gap-2 w-40">
      <div className={`w-36 h-36 rounded-xl border-2 p-1 ${won ? 'border-amber-400 shadow-lg shadow-amber-500/30' : 'border-rose-800 opacity-60'}`}>
        <img
          src={side === 'player' ? character.imageRight : character.imageLeft}
          alt={character.displayName}
          className="w-full h-full object-contain"
        />
      </div>
      <span className={`font-semibold text-sm ${won ? 'text-amber-300' : 'text-rose-400'}`}>
        {character.displayName}
      </span>
      <span className={`text-xs ${won ? 'text-amber-400' : 'invisible'}`}>★ Winner</span>
      <div className="w-full bg-slate-800 rounded-full h-2.5 border border-slate-700">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-purple-400 tabular-nums">{character.life} / {GAME_LIFE} HP</span>
    </div>
  );
}

function TrophyButton({ onClick }: { onClick: () => void }) {
  const [shineKey, setShineKey] = useState(0);
  const hasShownInitial = useRef(false);

  useEffect(() => {
    if (hasShownInitial.current) return;
    hasShownInitial.current = true;
    const id = setTimeout(() => setShineKey(1), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    // Wrapper: flex so it stretches to match sibling height in parent; p-[2px] = border strip
    <div
      onMouseEnter={() => setShineKey(k => k + 1)}
      className="w-40 group relative flex overflow-hidden p-[2px] rounded-xl bg-purple-500 transition-all hover:scale-105 shadow-lg shadow-purple-900/50"
    >
      {/* Rotating beam — 300×300% centered; only the 2px gap is visible, center covered by the button */}
      {shineKey > 0 && (
        <span
          key={shineKey}
          className="border-beam pointer-events-none absolute"
          style={{
            width: '300%', aspectRatio: '1',
            top: '50%', left: '50%', marginTop: '-150%', marginLeft: '-150%',
            background: 'conic-gradient(from 0deg, transparent 70%, rgba(255,255,255,0.95) 80%, rgba(255,255,255,0.5) 85%, transparent 92%)',
            transformOrigin: 'center',
          }}
        />
      )}
      {/* flex-1 fills the wrapper height; items-center/justify-center centers the text */}
      <button
        onClick={onClick}
        className="relative z-10 flex-1 flex items-center justify-center px-8 text-lg font-bold rounded-[10px] bg-purple-700 group-hover:bg-purple-600 text-white transition-colors"
      >
        Prize
      </button>
    </div>
  );
}

type Dim = 'color' | 'shape' | 'fill' | 'rotation';
const DIMS: Dim[] = ['color', 'shape', 'fill', 'rotation'];

function computeStats(history: TurnRecord[]) {
  let correct = 0, wrong = 0, timeout = 0;
  let matchCorrect = 0, matchTotal = 0;
  let avoidCorrect = 0, avoidTotal = 0;
  const dims: Record<Dim, [number, number]> = { color: [0,0], shape: [0,0], fill: [0,0], rotation: [0,0] };

  for (const { rule, timerResult } of history) {
    const hit = timerResult === 'correct';
    if (hit) correct++; else if (timerResult === 'timeout') timeout++; else wrong++;

    if (rule.startsWith('match')) { matchTotal++; if (hit) matchCorrect++; }
    else                          { avoidTotal++; if (hit) avoidCorrect++; }

    for (const dim of DIMS) {
      if (rule.includes(dim)) { dims[dim][1]++; if (hit) dims[dim][0]++; }
    }
  }

  return { correct, wrong, timeout, matchCorrect, matchTotal, avoidCorrect, avoidTotal, dims };
}

function AccBar({ correct, total, color }: { correct: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : (correct / total) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-2 border border-slate-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-purple-300 tabular-nums w-10 text-right">{correct}/{total}</span>
    </div>
  );
}

function ruleDisplay(rule: string): { mode: 'match' | 'avoid'; dims: string } {
  const dash = rule.indexOf('-');
  return {
    mode: rule.slice(0, dash) as 'match' | 'avoid',
    dims: rule.slice(dash + 1).replace(/\+/g, ' + '),
  };
}

function BattleStats({ history, playerWon }: { history: TurnRecord[]; playerWon: boolean }) {
  const { correct, wrong, timeout, matchCorrect, matchTotal, avoidCorrect, avoidTotal, dims } = computeStats(history);
  const total = history.length;

  return (
    <div className="w-full max-w-lg bg-purple-950/60 border border-purple-800/60 rounded-2xl p-6 space-y-5">
      <p className={`text-sm font-semibold tracking-wide uppercase ${playerWon ? 'text-amber-300' : 'text-rose-400'}`}>
        ✦ Battle Stats
      </p>

      {/* Summary */}
      <div className="flex justify-around text-center">
        <div>
          <p className="text-2xl font-bold text-emerald-400">{correct}</p>
          <p className="text-xs text-purple-400 mt-0.5">Correct</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-rose-400">{wrong}</p>
          <p className="text-xs text-purple-400 mt-0.5">Wrong</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-400">{timeout}</p>
          <p className="text-xs text-purple-400 mt-0.5">Timeout</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-purple-300">{total}</p>
          <p className="text-xs text-purple-400 mt-0.5">Turns</p>
        </div>
      </div>

      <div className="border-t border-purple-800/40" />

      {/* Dimension accuracy */}
      <div className="space-y-2">
        <p className="text-xs text-purple-500 uppercase tracking-widest mb-3">Accuracy by dimension</p>
        {DIMS.map(dim => (
          <div key={dim} className="flex items-center gap-3">
            <span className="w-16 text-xs text-purple-300 capitalize">{dim}</span>
            <div className="flex-1">
              <AccBar correct={dims[dim][0]} total={dims[dim][1]} color="bg-blue-500" />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-purple-800/40" />

      {/* Match vs Avoid */}
      <div className="space-y-2">
        <p className="text-xs text-purple-500 uppercase tracking-widest mb-3">Match vs Avoid</p>
        <div className="flex items-center gap-3">
          <span className="w-16 text-xs text-emerald-400">Match</span>
          <div className="flex-1">
            <AccBar correct={matchCorrect} total={matchTotal} color="bg-emerald-500" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 text-xs text-rose-400">Avoid</span>
          <div className="flex-1">
            <AccBar correct={avoidCorrect} total={avoidTotal} color="bg-rose-500" />
          </div>
        </div>
      </div>

      <div className="border-t border-purple-800/40" />

      {/* Turn log */}
      <div>
        <p className="text-xs text-purple-500 uppercase tracking-widest mb-3">Turn log</p>
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
          {history.map(({ rule, timerResult }, i) => {
            const { mode, dims: dimLabel } = ruleDisplay(rule);
            const resultColor = timerResult === 'correct' ? 'text-emerald-400' : timerResult === 'wrong' ? 'text-rose-400' : 'text-slate-500';
            const resultIcon  = timerResult === 'correct' ? '✓' : timerResult === 'wrong' ? '✗' : '⏱';
            return (
              <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                <span className="text-purple-700 tabular-nums w-5 text-right shrink-0">{i + 1}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold ${mode === 'match' ? 'bg-blue-900/60 text-blue-300' : 'bg-rose-900/60 text-rose-300'}`}>
                  {mode}
                </span>
                <span className="text-purple-300 flex-1">{dimLabel}</span>
                <span className={`shrink-0 font-bold ${resultColor}`}>{resultIcon}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
