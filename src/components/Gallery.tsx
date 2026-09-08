import { useMemo, useState } from 'react';
import FadeImage from './FadeImage';
import { CHARACTER_REGISTRY } from '../data/characters';
import type { CharacterMeta } from '../data/characters';
import { BLAST_COUNTS } from 'virtual:blast-counts';
import {
  SPELL_COLORS,
  SPELL_FILLS,
  SPELL_ROTATIONS,
  SPELL_SHAPES,
} from '../data/spells';
import SpellCard from './SpellCard';

interface Props {
  onBack: () => void;
}

const SUBSTRATE_FORMS: { emoji: string; meta: CharacterMeta }[] = [
  { emoji: '♀️', meta: CHARACTER_REGISTRY['nora']! },
  { emoji: '♂️', meta: CHARACTER_REGISTRY['nora/norm']! },
  { emoji: '🌿', meta: CHARACTER_REGISTRY['nora/meadow_sprite']! },
];

const SUBSTRATE_PATHS = new Set(SUBSTRATE_FORMS.map((f) => f.meta.namePath));
const SECRET_FORM_IDX = SUBSTRATE_FORMS.length;

// Shared-index sequence for the secret gallery, which has both of the primary forms
// depending on when it was drawn and/or in what mood
const SECRET_IMAGES: { num: number; prefix: 'norm' | 'nora' }[] = [
  { num: 0, prefix: 'norm' },
  { num: 1, prefix: 'norm' },
  { num: 2, prefix: 'norm' },
  { num: 3, prefix: 'norm' },
  { num: 4, prefix: 'norm' },
  { num: 5, prefix: 'nora' },
  { num: 6, prefix: 'nora' },
  { num: 7, prefix: 'norm' },
  { num: 8, prefix: 'nora' },
  { num: 9, prefix: 'nora' },
  { num: 10, prefix: 'norm' },
  { num: 11, prefix: 'norm' },
  { num: 12, prefix: 'norm' },
];

export default function Gallery({ onBack }: Props) {
  return (
    <div className="min-h-screen app-bg px-4 pt-16 pb-8">
      <button
        onClick={onBack}
        className="fixed top-4 right-4 z-10 px-4 py-2 rounded-lg border border-purple-700 bg-purple-950/90 text-purple-300 hover:bg-purple-900 transition-colors backdrop-blur-sm"
      >
        ← Back
      </button>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-200 tracking-widest uppercase">
            Gallery
          </h1>
          <p className="text-purple-400 text-sm mt-3 max-w-lg">
            All game art was created by the developer in Google Drawings over the years, without the use of AI. If you found this, I'm happy to share my silly little world with you!
          </p>
        </div>

        {Object.values(CHARACTER_REGISTRY)
          .filter(
            (m) => !SUBSTRATE_PATHS.has(m.namePath) || m.namePath === 'nora',
          )
          .map((meta) =>
            meta.namePath === 'nora' ? (
              <SubstrateGallerySection key="nora" />
            ) : (
              <CharacterGallerySection key={meta.namePath} meta={meta} />
            ),
          )}

        <SpellPreviewSection />
      </div>
    </div>
  );
}

function useBlastImages(imagePrefix: string, showLeft: boolean): string[] {
  return useMemo(() => {
    const blastCount = BLAST_COUNTS[imagePrefix] ?? 0;
    return Array.from(
      { length: blastCount },
      (_, i) =>
        `${import.meta.env.BASE_URL}images/characters/on_cast/${imagePrefix}_mf_blast_${i}_face_${showLeft ? 'left' : 'right'}.png`,
    );
  }, [imagePrefix, showLeft]);
}

function SubstrateGallerySection() {
  const [formIdx, setFormIdx] = useState(0);
  const [showLeft, setShowLeft] = useState(false);
  const [secretFound, setSecretFound] = useState(false);

  const isSecret = formIdx === SECRET_FORM_IDX;
  const { meta } = SUBSTRATE_FORMS[isSecret ? 0 : formIdx];
  const blastImages = useBlastImages(meta.imagePrefix, showLeft);

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <FadeImage
          src={`${import.meta.env.BASE_URL}images/characters/${meta.imagePrefix}_mf_face_right.png`}
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
            {SUBSTRATE_FORMS.map((form, i) => (
              <button
                key={i}
                onClick={() => setFormIdx(i)}
                title={form.meta.displayName}
                className={[
                  'px-3 py-1.5 text-base transition-colors',
                  i === formIdx
                    ? 'bg-amber-500 text-amber-900'
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
            onClick={() => {
              setSecretFound(true);
              setFormIdx(SECRET_FORM_IDX);
            }}
            className={[
              'px-3 py-1.5 text-base rounded-lg border transition-all duration-300',
              formIdx === SECRET_FORM_IDX
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
            onClick={() => setShowLeft((v) => !v)}
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
              className="aspect-square bg-purple-950/60 border border-rose-900/40 rounded-xl p-2 flex items-center justify-center"
            >
              <FadeImage
                src={`${import.meta.env.BASE_URL}images/characters/secret/${prefix}_secret_${num}.png`}
                alt={`${prefix} secret ${num}`}
                loading="lazy"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.2';
                }}
              />
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
        <FadeImage
          src={`${import.meta.env.BASE_URL}images/characters/${meta.imagePrefix}_mf_face_right.png`}
          alt={meta.displayName}
          className="w-10 h-10 object-contain"
        />
        <h2 className="text-xl font-bold text-amber-300">{meta.displayName}</h2>
        <button
          onClick={() => setShowLeft((v) => !v)}
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
  blastImages: string[];
  showLeft: boolean;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      <div className="aspect-square bg-purple-950/60 border border-purple-800 rounded-xl p-2 flex items-center justify-center">
        <FadeImage
          src={`${import.meta.env.BASE_URL}images/characters/${meta.imagePrefix}_mf_face_${showLeft ? 'left' : 'right'}.png`}
          alt={`${meta.displayName} portrait`}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      {blastImages.map((url, i) => (
        <div
          key={i}
          className="aspect-square bg-purple-950/60 border border-purple-800 rounded-xl p-2 flex items-center justify-center relative group"
        >
          <FadeImage
            src={url}
            alt={`${meta.displayName} blast ${i}`}
            loading="lazy"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.2';
            }}
          />
        </div>
      ))}
    </div>
  );
}

function SpellPreviewSection() {
  const [selColor, setSelColor] = useState(SPELL_COLORS[0]);
  const [selShape, setSelShape] = useState(SPELL_SHAPES[0]);
  const [selFill, setSelFill] = useState(SPELL_FILLS[0]);
  const [selRotation, setSelRotation] = useState(SPELL_ROTATIONS[0]);
  const [spinKey, setSpinKey] = useState(0);

  const spinCls = selRotation === 'clockwise' ? 'card-spin-once-cw' : 'card-spin-once-ccw';

  const categories = [
    {
      label: `${SPELL_COLORS.length} colors`,
      keyPrefix: 'color',
      isRotation: false,
      selectedIndex: SPELL_COLORS.indexOf(selColor),
      spells: SPELL_COLORS.map((c) => ({ color: c, shape: selShape, fill: selFill, rotation: selRotation })),
      onCardClick: (i: number) => setSelColor(SPELL_COLORS[i]),
    },
    {
      label: `${SPELL_SHAPES.length} shapes`,
      keyPrefix: 'shape',
      isRotation: false,
      selectedIndex: SPELL_SHAPES.indexOf(selShape),
      spells: SPELL_SHAPES.map((s) => ({ color: selColor, shape: s, fill: selFill, rotation: selRotation })),
      onCardClick: (i: number) => setSelShape(SPELL_SHAPES[i]),
    },
    {
      label: `${SPELL_FILLS.length} fills`,
      keyPrefix: 'fill',
      isRotation: false,
      selectedIndex: SPELL_FILLS.indexOf(selFill),
      spells: SPELL_FILLS.map((f) => ({ color: selColor, shape: selShape, fill: f, rotation: selRotation })),
      onCardClick: (i: number) => setSelFill(SPELL_FILLS[i]),
    },
    {
      label: `${SPELL_ROTATIONS.length} rotations`,
      keyPrefix: 'rot',
      isRotation: true,
      selectedIndex: SPELL_ROTATIONS.indexOf(selRotation),
      spells: SPELL_ROTATIONS.map((r) => ({ color: selColor, shape: selShape, fill: selFill, rotation: r })),
      onCardClick: (i: number) => { setSelRotation(SPELL_ROTATIONS[i]); setSpinKey((k) => k + 1); },
    },
  ];

  return (
    <div className="mb-10 pt-6 border-t border-purple-800/40">
      <p className="text-purple-400 text-sm font-semibold tracking-wide uppercase mb-4">
        ✦ Spell system preview
      </p>
      <div className="flex flex-col gap-6">
        {categories.map(({ label, spells, keyPrefix, isRotation, selectedIndex, onCardClick }) => (
          <div key={keyPrefix}>
            <p className="text-purple-600 text-xs uppercase tracking-widest mb-2">{label}</p>
            <div className="flex flex-wrap gap-3">
              {spells.map((spell, i) => (
                <SpellCard
                  key={isRotation ? `${keyPrefix}-${i}` : `${keyPrefix}-${i}-${spinKey}`}
                  spell={spell}
                  size={80}
                  selected={i === selectedIndex}
                  onClick={() => onCardClick(i)}
                  staticDisplay={!isRotation}
                  className={!isRotation && spinKey > 0 ? spinCls : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
