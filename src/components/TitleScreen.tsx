interface Props {
  onStart: () => void;
  onGallery: () => void;
}

export default function TitleScreen({ onStart, onGallery }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-amber-300 to-purple-300 tracking-widest uppercase mb-2">
          Magic Fight
        </h1>
        <p className="text-purple-400 text-lg">Cast a spell!</p>
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={onStart}
          className="px-8 py-3 text-lg font-bold rounded-xl bg-purple-700 hover:bg-purple-600 text-white border border-purple-500 transition-all hover:scale-105 shadow-lg shadow-purple-900/50"
        >
          Start Game
        </button>
        <button
          onClick={onGallery}
          className="px-6 py-3 text-lg rounded-xl border border-purple-700 text-purple-300 hover:bg-purple-900/60 transition-colors"
        >
          🎨 Gallery
        </button>
      </div>

      <p className="text-purple-600 text-xs mt-8 max-w-sm text-center">
        A simple, turn-based magic duel. Six dimensions of power — dark, light, chaotic, ordered, hot, and cold. Choose wisely.
      </p>
    </div>
  );
}
