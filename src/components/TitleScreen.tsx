import { useRef } from 'react';

interface Props {
  onStart: () => void;
  onGallery: () => void;
  onLeaderboard: () => void;
}

export default function TitleScreen({ onStart, onGallery, onLeaderboard }: Props) {
  const clickCount = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTitleClick() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    clickCount.current += 1;
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      onGallery();
      return;
    }
    resetTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 1500);
  }

  return (
    <div className="min-h-screen app-bg flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1
          onClick={handleTitleClick}
          className="cursor-pointer text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-amber-300 to-purple-300 tracking-widest uppercase mb-2 select-none"
        >
          Magic Fight
        </h1>
        <p className="text-purple-400 text-lg">
          See the pattern; cast a spell!
        </p>
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={onStart}
          className="px-8 py-3 text-lg font-bold rounded-xl bg-purple-700 hover:bg-purple-600 text-white border border-purple-500 transition-all hover:scale-105 shadow-lg shadow-purple-900/50"
        >
          Start Game
        </button>
        <button
          onClick={onLeaderboard}
          className="px-6 py-3 text-lg rounded-xl border border-purple-700 text-purple-300 hover:bg-purple-900/60 transition-colors"
        >
          Leaderboard
        </button>
      </div>
    </div>
  );
}
