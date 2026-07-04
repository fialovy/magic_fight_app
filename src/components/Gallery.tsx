import { useState } from 'react';
import { CHARACTER_REGISTRY } from '../data/characters';
import type { CharacterMeta } from '../data/characters';

interface Props {
  onBack: () => void;
}

const NORA_FORMS: { emoji: string; meta: CharacterMeta }[] = [
  { emoji: '♀️', meta: CHARACTER_REGISTRY.find(m => m.namePath === 'nora')! },
  { emoji: '♂️', meta: CHARACTER_REGISTRY.find(m => m.namePath === 'nora/norm')! },
  { emoji: '🌿', meta: CHARACTER_REGISTRY.find(m => m.namePath === 'nora/meadow_sprite')! },
];

const NORA_PATHS = new Set(NORA_FORMS.map(f => f.meta.namePath));

export default function Gallery({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-200 tracking-widest uppercase">Gallery</h1>
            <p className="text-purple-400 text-sm mt-1">Original art, handcrafted in Google Drawings by the human developer (2017-2025)</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg border border-purple-700 text-purple-300 hover:bg-purple-900/60 transition-colors"
          >
            ← Back
          </button>
        </div>

        {CHARACTER_REGISTRY
          .filter(m => !NORA_PATHS.has(m.namePath) || m.namePath === 'nora')
          .map(meta => meta.namePath === 'nora'
            ? <NoraGallerySection key="nora" />
            : <CharacterGallerySection key={meta.namePath} meta={meta} />
          )
        }
      </div>
    </div>
  );
}

function NoraGallerySection() {
  const [formIdx, setFormIdx] = useState(0);
  const [showLeft, setShowLeft] = useState(false);
  const { meta } = NORA_FORMS[formIdx];

  const blastImages = Array.from({ length: meta.blastCount }, (_, i) => ({
    left:  `/images/characters/${meta.imagePrefix}_mf_blast_${i}_face_left.png`,
    right: `/images/characters/${meta.imagePrefix}_mf_blast_${i}_face_right.png`,
  }));

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Fixed-width name so the segmented control never shifts position */}
        <h2 className="text-xl font-bold text-amber-300 w-44 shrink-0">{meta.displayName}</h2>

        {/* Segmented form picker — emoji only */}
        <div className="flex rounded-lg border border-purple-700 overflow-hidden shrink-0">
          {NORA_FORMS.map((form, i) => (
            <button
              key={i}
              onClick={() => setFormIdx(i)}
              title={form.meta.displayName}
              className={[
                'px-3 py-1.5 text-base transition-colors',
                i === formIdx
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-purple-900/60 text-purple-300 hover:bg-purple-800',
                i > 0 ? 'border-l border-purple-700' : '',
              ].join(' ')}
            >
              {form.emoji}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowLeft(v => !v)}
          className="ml-auto text-xs px-3 py-1 rounded-lg border border-purple-600 text-purple-300 hover:bg-purple-800 transition-colors"
        >
          {showLeft ? '◀ Facing left' : '▶ Facing right'}
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <div className="aspect-square bg-purple-950/60 border border-purple-800 rounded-xl p-2 flex items-center justify-center">
          <img
            src={`/images/characters/${meta.imagePrefix}_mf_face_${showLeft ? 'left' : 'right'}.png`}
            alt={`${meta.displayName} portrait`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
        {blastImages.map((imgs, i) => (
          <div
            key={i}
            className="aspect-square bg-purple-950/60 border border-purple-800 rounded-xl p-2 flex items-center justify-center relative group"
          >
            <img
              src={showLeft ? imgs.left : imgs.right}
              alt={`${meta.displayName} blast ${i}`}
              className="max-w-full max-h-full object-contain"
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
            />
            <span className="absolute bottom-1 right-2 text-xs text-purple-500 group-hover:text-purple-300">
              blast {i}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CharacterGallerySection({ meta }: { meta: CharacterMeta }) {
  const [showLeft, setShowLeft] = useState(false);

  const blastImages = Array.from({ length: meta.blastCount }, (_, i) => ({
    left:  `/images/characters/${meta.imagePrefix}_mf_blast_${i}_face_left.png`,
    right: `/images/characters/${meta.imagePrefix}_mf_blast_${i}_face_right.png`,
  }));

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <img
          src={`/images/characters/${meta.imagePrefix}_mf_face_right.png`}
          alt={meta.displayName}
          className="w-10 h-10 object-contain"
        />
        <h2 className="text-xl font-bold text-amber-300">{meta.displayName}</h2>
        <button
          onClick={() => setShowLeft(v => !v)}
          className="ml-auto text-xs px-3 py-1 rounded-lg border border-purple-600 text-purple-300 hover:bg-purple-800 transition-colors"
        >
          {showLeft ? '◀ Facing left' : '▶ Facing right'}
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <div className="aspect-square bg-purple-950/60 border border-purple-800 rounded-xl p-2 flex items-center justify-center">
          <img
            src={`/images/characters/${meta.imagePrefix}_mf_face_${showLeft ? 'left' : 'right'}.png`}
            alt={`${meta.displayName} portrait`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
        {blastImages.map((imgs, i) => (
          <div
            key={i}
            className="aspect-square bg-purple-950/60 border border-purple-800 rounded-xl p-2 flex items-center justify-center relative group"
          >
            <img
              src={showLeft ? imgs.left : imgs.right}
              alt={`${meta.displayName} blast ${i}`}
              className="max-w-full max-h-full object-contain"
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
            />
            <span className="absolute bottom-1 right-2 text-xs text-purple-500 group-hover:text-purple-300">
              blast {i}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
