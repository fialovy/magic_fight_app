import { useEffect, useState } from 'react';
import type { Character } from '../types/game';
import { SELECTABLE_CHARACTERS } from '../data/characters';

interface Props {
  mode: 'player' | 'opponent';
  disabledPath?: string;
  onSelect: (character: Character) => void;
  loadCharacter: (namePath: string) => Promise<Character>;
}

export default function CharacterSelectScreen({ mode, disabledPath, onSelect, loadCharacter }: Props) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const highlightedMeta = SELECTABLE_CHARACTERS.find(m => m.namePath === highlighted);

  async function handleSelect(namePath: string) {
    setLoading(namePath);
    const char = await loadCharacter(namePath);
    setLoading(null);
    onSelect(char);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col items-center px-4 py-8">
      <h1 className="text-4xl font-bold text-purple-200 mb-2 tracking-widest uppercase">
        Magic Fight
      </h1>
      <p className="text-purple-400 mb-8 text-lg">
        {mode === 'player' ? 'Choose your sorcerer' : 'Choose your opponent'}
      </p>

      <div className="grid grid-cols-3 gap-4 max-w-2xl w-full mb-6">
        {SELECTABLE_CHARACTERS.map(meta => {
          const isDisabled = meta.namePath === disabledPath;
          const isHighlighted = meta.namePath === highlighted;
          const isLoading = meta.namePath === loading;

          return (
            <button
              key={meta.namePath}
              disabled={isDisabled || loading !== null}
              onClick={() => isHighlighted ? handleSelect(meta.namePath) : setHighlighted(meta.namePath)}
              className={[
                'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200',
                isDisabled
                  ? 'opacity-30 cursor-not-allowed border-slate-700 bg-slate-900/50'
                  : isHighlighted
                    ? 'border-amber-400 bg-purple-900/80 shadow-lg shadow-amber-500/30 scale-105'
                    : 'border-purple-700 bg-purple-950/60 hover:border-purple-400 hover:bg-purple-900/60 cursor-pointer',
              ].join(' ')}
            >
              <div className="relative w-24 h-24 mb-2">
                <img
                  src={`${import.meta.env.BASE_URL}images/characters/${meta.imagePrefix}_mf_face_${mode === 'player' ? 'right' : 'left'}.png`}
                  alt={meta.displayName}
                  className="w-full h-full object-contain"
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <span className={`text-sm font-semibold ${isHighlighted ? 'text-amber-300' : 'text-purple-200'}`}>
                {meta.displayName}
              </span>
              {isHighlighted && !isDisabled && (
                <span className="text-xs text-amber-400 mt-1">Click to confirm</span>
              )}
            </button>
          );
        })}
      </div>

      {highlightedMeta && (
        <div className="max-w-2xl w-full bg-purple-950/80 border border-purple-700 rounded-xl p-4 text-purple-200 text-sm leading-relaxed">
          <p className="font-semibold text-amber-300 mb-1">{highlightedMeta.displayName}</p>
          <BioPreview namePath={highlightedMeta.namePath} />
        </div>
      )}
    </div>
  );
}

function BioPreview({ namePath }: { namePath: string }) {
  const [bio, setBio] = useState<string | null>(null);

  useEffect(() => {
    setBio(null);
    fetch(`${import.meta.env.BASE_URL}characters/${namePath}/bio.txt`)
      .then(r => r.text())
      .then(t => setBio(t.trim()))
      .catch(() => setBio(''));
  }, [namePath]);

  if (bio === null) return <span className="text-purple-500 italic">Loading...</span>;
  return <>{bio || <span className="text-purple-500 italic">No description available.</span>}</>;
}
