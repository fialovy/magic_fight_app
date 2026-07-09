import { useState } from 'react';
import { CHARACTER_REGISTRY } from '../data/characters';
import type { CharacterMeta } from '../data/characters';
import { BLAST_COUNTS } from 'virtual:blast-counts';
import type { Spell } from '../types/game';
import SpellCard from './SpellCard';

interface Props {
  onBack: () => void;
}

const NORA_FORMS: { emoji: string; meta: CharacterMeta }[] = [
  { emoji: '♀️', meta: CHARACTER_REGISTRY.find(m => m.namePath === 'nora')! },
  { emoji: '♂️', meta: CHARACTER_REGISTRY.find(m => m.namePath === 'nora/norm')! },
  { emoji: '🌿', meta: CHARACTER_REGISTRY.find(m => m.namePath === 'nora/meadow_sprite')! },
];

const NORA_PATHS = new Set(NORA_FORMS.map(f => f.meta.namePath));

// Shared-index sequence for the secret gallery, sorted by narrative order 0-11
const SECRET_IMAGES: { num: number; prefix: 'norm' | 'nora' }[] = [
  { num: 0,  prefix: 'norm' },
  { num: 1,  prefix: 'norm' },
  { num: 2,  prefix: 'norm' },
  { num: 3,  prefix: 'norm' },
  { num: 4,  prefix: 'norm' },
  { num: 5,  prefix: 'nora' },
  { num: 6,  prefix: 'nora' },
  { num: 7,  prefix: 'norm' },
  { num: 8,  prefix: 'nora' },
  { num: 9,  prefix: 'nora' },
  { num: 10, prefix: 'norm' },
  { num: 11, prefix: 'norm' },
];

export default function Gallery({ onBack }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-200 tracking-widest uppercase">Gallery</h1>
            <p className="text-purple-400 text-sm mt-1">Original art, handcrafted without AI in Google Drawings by the human developer (2017-2026)</p>
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

        <SpellPreviewSection />
      </div>
    </div>
  );
}

function useBlastImages(imagePrefix: string, showLeft: boolean) {
  const blastCount = BLAST_COUNTS[imagePrefix] ?? 0;
  return Array.from({ length: blastCount }, (_, i) => ({
    url: `/images/characters/on_cast/${imagePrefix}_mf_blast_${i}_face_${showLeft ? 'left' : 'right'}.png`,
  }));
}

function NoraGallerySection() {
  const [formIdx, setFormIdx] = useState(0);
  const [showLeft, setShowLeft] = useState(false);
  const [secretFound, setSecretFound] = useState(false);

  const isSecret = formIdx === 3;
  const { meta } = NORA_FORMS[isSecret ? 0 : formIdx];
  const blastImages = useBlastImages(meta.imagePrefix, showLeft);

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <img
          src={`/images/characters/${meta.imagePrefix}_mf_face_right.png`}
          alt={meta.displayName}
          className="w-10 h-10 object-contain shrink-0"
        />
        {/* Fixed-width name so the segmented control never shifts position */}
        <h2 className="text-xl font-bold text-amber-300 w-44 shrink-0">
          {isSecret ? 'N + W' : meta.displayName}
        </h2>

        {/* Segmented form picker — emoji only */}
        <div className="flex items-stretch shrink-0 gap-1">
          <div className="flex rounded-lg border border-purple-700 overflow-hidden">
            {NORA_FORMS.map((form, i) => (
              <button
                key={i}
                onClick={() => setFormIdx(i)}
                title={form.meta.displayName}
                className={[
                  'px-3 py-1.5 text-base transition-colors',
                  i === formIdx
                    ? 'bg-amber-500 text-amber-100'
                    : 'bg-purple-900/60 text-purple-300 hover:bg-purple-800',
                  i > 0 ? 'border-l border-purple-700' : '',
                ].join(' ')}
              >
                {form.emoji}
              </button>
            ))}
          </div>
          {/* Hidden heart button — lives outside overflow-hidden so no border bleeds through */}
          <button
            onClick={() => { setSecretFound(true); setFormIdx(3); }}
            className={[
              'px-3 py-1.5 text-base rounded-lg border transition-all duration-300',
              formIdx === 3
                ? 'bg-rose-800/80 text-rose-200 border-purple-700'
                : secretFound
                  ? 'bg-purple-900/60 text-rose-300/70 hover:bg-purple-800 border-purple-700'
                  : 'opacity-0 hover:opacity-100 hover:bg-purple-900/30 hover:text-purple-400/60 border-transparent hover:border-purple-600/30',
            ].join(' ')}
          >
            ❤️
          </button>
        </div>

        {!isSecret && (
          <button
            onClick={() => setShowLeft(v => !v)}
            className="ml-auto text-xs px-3 py-1 rounded-lg border border-purple-600 text-purple-300 hover:bg-purple-800 transition-colors"
          >
            {showLeft ? '◀ Facing left' : '▶ Facing right'}
          </button>
        )}
      </div>

      {isSecret ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {SECRET_IMAGES.map(({ num, prefix }) => (
            <div
              key={num}
              className="aspect-square bg-purple-950/60 border border-rose-900/40 rounded-xl p-2 flex items-center justify-center relative group"
            >
              <img
                src={`/images/characters/secret/${prefix}_secret_${num}.png`}
                alt={`${prefix} secret ${num}`}
                className="max-w-full max-h-full object-contain"
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
              />
              <span className="absolute bottom-1 right-2 text-xs text-rose-700/50 group-hover:text-rose-300 transition-colors">
                {num}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <BlastGrid meta={meta} blastImages={blastImages} showLeft={showLeft} />
      )}
    </div>
  );
}

function CharacterGallerySection({ meta }: { meta: CharacterMeta }) {
  const [showLeft, setShowLeft] = useState(false);
  const blastImages = useBlastImages(meta.imagePrefix, showLeft);

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
      <BlastGrid meta={meta} blastImages={blastImages} showLeft={showLeft} />
    </div>
  );
}

function BlastGrid({
  meta,
  blastImages,
  showLeft,
}: {
  meta: CharacterMeta;
  blastImages: { url: string }[];
  showLeft: boolean;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      <div className="aspect-square bg-purple-950/60 border border-purple-800 rounded-xl p-2 flex items-center justify-center">
        <img
          src={`/images/characters/${meta.imagePrefix}_mf_face_${showLeft ? 'left' : 'right'}.png`}
          alt={`${meta.displayName} portrait`}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      {blastImages.map((img, i) => (
        <div
          key={i}
          className="aspect-square bg-purple-950/60 border border-purple-800 rounded-xl p-2 flex items-center justify-center relative group"
        >
          <img
            src={img.url}
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
  );
}

const PREVIEW_SPELLS: Spell[] = [
  { color: 'red',    shape: 'heart',    fill: 'solid' },
  { color: 'blue',   shape: 'square',   fill: 'solid' },
  { color: 'green',  shape: 'star',     fill: 'solid' },
  { color: 'purple', shape: 'triangle', fill: 'solid' },
  { color: 'red',    shape: 'star',     fill: 'vertical-stripe' },
  { color: 'blue',   shape: 'triangle', fill: 'horizontal-stripe' },
  { color: 'green',  shape: 'square',   fill: 'vertical-stripe' },
  { color: 'purple', shape: 'heart',    fill: 'horizontal-stripe' },
];

function SpellPreviewSection() {
  return (
    <div className="mb-10 pt-6 border-t border-purple-800/40">
      <p className="text-purple-400 text-sm font-semibold tracking-wide uppercase mb-1">✦ Spell system preview</p>
      <p className="text-purple-600 text-xs mb-4">All 4 shapes · all 4 colors · both stripe fills</p>
      <div className="flex flex-wrap gap-3">
        {PREVIEW_SPELLS.map((spell, i) => (
          <SpellCard key={i} spell={spell} size={80} />
        ))}
      </div>
    </div>
  );
}
