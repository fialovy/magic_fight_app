import { useEffect, useState } from 'react';
import type { Character } from '../types/game';
import { tsParticles } from '@tsparticles/engine';
import type { Container } from '@tsparticles/engine';

interface Props {
  winner: 'player' | 'opponent';
  player: Character;
  opponent: Character;
  onNewGame: () => void;
}

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

export default function GameOverScreen({ winner, player, opponent, onNewGame }: Props) {
  const playerWon = winner === 'player';
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!playerWon) return;
    let c: Container | undefined;
    tsParticles.load({
      id: 'gameover-confetti',
      options: {
        fullScreen:    { enable: true, zIndex: 50 },
        fpsLimit:      120,
        detectRetina:  true,
        background:    { color: { value: 'transparent' } },
        particles:     { number: { value: 0, limit: { value: 0 } } },
        interactivity: { events: { onClick: { enable: false }, onHover: { enable: false } } },
      },
    }).then(container => {
      if (!container || container.destroyed) return;
      c = container;
      container.particles.push(70,
        { x: window.innerWidth / 2, y: window.innerHeight * 0.2 },
        {
          paint:  { color: { value: ['#fbbf24', '#f59e0b', '#a855f7', '#ec4899', '#38bdf8', '#4ade80', '#f87171', '#fb923c'] }, fill: { enable: true, opacity: 1 } },
          shape:  { type: ['star', 'circle', 'square'] },
          size:   { value: { min: 5, max: 12 } },
          life:    { count: 1, duration: { value: { min: 1.5, max: 3 } } },
          move: {
            enable:    true,
            speed:     { min: 5, max: 15 },
            direction: 'none',
            outModes:  { default: 'destroy' },
            gravity:   { enable: true, acceleration: 2.5 },
          },
          rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 10 } },
        },
      );
    });
    return () => c?.destroy();
  }, [playerWon]);

  const previewUrl  = previewIdx !== null ? player.blastImagesRight[previewIdx] : null;
  const previewName = `${player.displayName.toLowerCase().replace(/\s+/g, '_')}_combat_${previewIdx}.png`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col items-center justify-center px-4 py-8">
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
        <CharacterDisplay character={player} side="player" won={playerWon} />
        <span className="text-4xl font-bold text-purple-500">vs</span>
        <CharacterDisplay character={opponent} side="opponent" won={!playerWon} />
      </div>

      <button
        onClick={onNewGame}
        className="px-8 py-3 text-lg font-bold rounded-xl bg-purple-700 hover:bg-purple-600 text-white border border-purple-500 transition-all hover:scale-105 shadow-lg shadow-purple-900/50"
      >
        New Game
      </button>

      {playerWon && player.blastImagesRight.length > 0 && (
        <div className="mt-10 text-center max-w-xl">
          <p className="text-amber-300 text-sm font-semibold tracking-wide uppercase mb-1">✦ Trophy cabinet</p>
          <p className="text-purple-400 text-xs mb-4">Click any combat portrait for a closer look.</p>
          <div className="flex flex-nowrap justify-center gap-3 overflow-x-auto pb-1">
            {player.blastImagesRight.map((url, i) => (
              <button
                key={i}
                onClick={() => setPreviewIdx(i)}
                title="View full size"
                className="w-24 h-24 bg-purple-950/60 border border-purple-700 rounded-xl p-1.5 hover:border-amber-400 hover:bg-purple-900/60 transition-all group relative overflow-hidden"
              >
                <img src={url} alt={`${player.displayName} combat ${i}`} className="w-full h-full object-contain" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                  <span className="text-white text-xl">🔍</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewUrl !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewIdx(null)}
        >
          <div
            className="relative bg-indigo-950 border border-purple-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-5 max-w-lg w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewIdx(null)}
              className="absolute top-3 right-4 text-purple-400 hover:text-purple-200 text-2xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            <p className="text-amber-300 text-sm font-semibold tracking-wide">
              {player.displayName} — combat portrait {previewIdx! + 1} of {player.blastImagesRight.length}
            </p>

            <img
              src={previewUrl}
              alt={`${player.displayName} combat ${previewIdx}`}
              className="max-h-[60vh] max-w-full object-contain rounded-lg"
            />

            <div className="flex gap-3 items-center">
              <button
                onClick={() => setPreviewIdx(i => i! - 1)}
                className={`px-4 py-2 rounded-lg border border-purple-600 text-purple-300 hover:bg-purple-800 text-sm transition-colors ${previewIdx! > 0 ? '' : 'invisible'}`}
              >
                ← Prev
              </button>
              <button
                onClick={() => downloadImage(previewUrl, previewName)}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm border border-amber-400 transition-colors"
              >
                ⬇ Download
              </button>
              <button
                onClick={() => setPreviewIdx(i => i! + 1)}
                className={`px-4 py-2 rounded-lg border border-purple-600 text-purple-300 hover:bg-purple-800 text-sm transition-colors ${previewIdx! < player.blastImagesRight.length - 1 ? '' : 'invisible'}`}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterDisplay({ character, side, won }: { character: Character; side: 'player' | 'opponent'; won: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-52 h-52 rounded-xl border-2 p-1 ${won ? 'border-amber-400 shadow-lg shadow-amber-500/30' : 'border-rose-800 opacity-60'}`}>
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
    </div>
  );
}
