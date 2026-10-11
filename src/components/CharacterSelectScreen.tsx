import { useEffect, useState } from 'react';
import FadeImage from './FadeImage';
import LoreScrolls from './LoreScrolls';
import type { Character, GameConfig, GameMode, GameSpeed } from '../types/game';
import {
  CHARACTER_REGISTRY,
  type CharacterMeta,
  SELECTABLE_CHARACTERS,
} from '../data/characters';
import { loadLore } from '../engine/loader';
import {
  type CharacterProgress,
  type ProgressStore,
  getCharacterProgress,
  loadProgress,
} from '../engine/progress';

interface Props {
  mode: 'player' | 'opponent';
  disabledPath?: string;
  onSelect: (character: Character) => void;
  loadCharacter: (namePath: string) => Promise<Character>;
  config: GameConfig;
  onConfigChange: (c: GameConfig) => void;
  onBack: () => void;
  backLabel: string;
}

const bioCache = new Map<string, string>();

export default function CharacterSelectScreen({
  mode,
  disabledPath,
  onSelect,
  loadCharacter,
  config,
  onConfigChange,
  onBack,
  backLabel,
}: Props) {
  const [preview, setPreview] = useState<CharacterMeta | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [progress] = useState(loadProgress);
  const [loreByPath, setLoreByPath] = useState<Record<string, string[]>>({});
  const showProgress = mode === 'player';

  // Prefetch all bios so the modal opens with text already ready
  useEffect(() => {
    SELECTABLE_CHARACTERS.forEach(({ namePath }) => {
      if (bioCache.has(namePath)) return;
      fetch(`${import.meta.env.BASE_URL}characters/${namePath}/bio.txt`)
        .then((r) => r.text())
        .then((t) => bioCache.set(namePath, t.trim()))
        .catch(() => bioCache.set(namePath, ''));
    });
  }, []);

  // Lore counts drive the progress dots, so the number of lore entries per
  // character can change without touching the code
  useEffect(() => {
    if (!showProgress) return;
    // All registry entries, so shapeshift forms' lore is ready for their tabs
    Object.values(CHARACTER_REGISTRY).forEach(({ namePath }) => {
      loadLore(namePath).then((lore) =>
        setLoreByPath((prev) => ({ ...prev, [namePath]: lore })),
      );
    });
  }, [showProgress]);

  const faceUrl = (meta: CharacterMeta) =>
    `${import.meta.env.BASE_URL}images/characters/${meta.imagePrefix}_mf_face_${mode === 'player' ? 'right' : 'left'}.png`;

  async function handleSelect(namePath: string) {
    setLoading(namePath);
    const char = await loadCharacter(namePath);
    setLoading(null);
    setPreview(null);
    onSelect(char);
  }

  return (
    <div className="relative min-h-screen app-bg flex flex-col items-center px-4 pt-10 pb-2 md:py-8">
      <button
        onClick={onBack}
        disabled={loading !== null}
        className="absolute top-2 left-3 px-2 py-1 text-sm text-purple-400 hover:text-purple-200 rounded-lg hover:bg-purple-800/40 transition-colors disabled:opacity-50"
      >
        ← {backLabel}
      </button>
      <h1 className="text-4xl font-bold text-purple-200 mb-2 tracking-widest uppercase">
        Magic Fight
      </h1>
      <p className="text-purple-400 mb-3 md:mb-8 text-lg">
        {mode === 'player' ? 'Choose your sorcerer' : 'Choose your opponent'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-4 md:mb-6">
        <SegmentedControl
          label="Rule"
          options={[
            { value: 'follow', label: 'Follow' },
            { value: 'guess',  label: 'Guess'  },
          ] as { value: GameMode; label: string }[]}
          value={config.mode}
          onChange={(v) => onConfigChange({ ...config, mode: v })}
        />
        <SegmentedControl
          label="Speed"
          options={[
            { value: 'relaxed',   label: 'Relaxed'   },
            { value: 'standard',  label: 'Standard'  },
            { value: 'challenge', label: 'Challenge' },
            { value: 'none',      label: 'No Timer'  },
          ] as { value: GameSpeed; label: string }[]}
          value={config.speed}
          onChange={(v) => onConfigChange({ ...config, speed: v })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg w-full">
        {SELECTABLE_CHARACTERS.map((meta) => {
          const isDisabled = meta.namePath === disabledPath;
          const isLoading = meta.namePath === loading;

          return (
            <button
              key={meta.namePath}
              disabled={isDisabled || loading !== null}
              onClick={() => setPreview(meta)}
              className={[
                'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200',
                isDisabled
                  ? 'opacity-30 cursor-not-allowed border-slate-700 bg-slate-900/50'
                  : 'border-purple-700 bg-purple-950/60 hover:border-purple-400 hover:bg-purple-900/60 cursor-pointer',
              ].join(' ')}
            >
              <div className="relative w-full max-w-28 aspect-square mb-2">
                <FadeImage
                  src={faceUrl(meta)}
                  alt={meta.displayName}
                  className="w-full h-full object-contain"
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold text-purple-200">
                {meta.displayName}
              </span>
              {showProgress && (
                <TileProgress
                  loreTotal={loreByPath[meta.namePath]?.length ?? 0}
                  progress={getCharacterProgress(progress, meta.namePath)}
                  opponents={opponentsOf(meta)}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70"
          onClick={() => setPreview(null)}
        >
          {/* Outer box clips to the rounded corners; the inner one scrolls, so
              the scrollbar can't square off the corners */}
          <div
            className="animate-modal-in relative bg-purple-950 border border-purple-600 rounded-2xl max-w-sm w-full max-h-full overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center text-purple-400 hover:text-purple-200 text-2xl leading-none rounded-lg hover:bg-purple-800/60 transition-colors"
            >
              ×
            </button>

            <div className="overflow-y-auto p-6 flex flex-col items-center gap-4">
              <FadeImage
                src={faceUrl(preview)}
                alt={preview.displayName}
                className="w-40 h-40 object-contain"
              />

              <h2 className="text-2xl font-bold text-amber-300">
                {preview.displayName}
              </h2>

              <div className="text-purple-200 text-sm leading-relaxed text-center">
                <BioPreview namePath={preview.namePath} />
              </div>

              <button
                onClick={() => handleSelect(preview.namePath)}
                disabled={loading !== null}
                className="mt-1 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-base transition-colors disabled:opacity-50"
              >
                {loading === preview.namePath
                  ? 'Loading…'
                  : (preview.chooseLabel ?? `Choose ${preview.displayName}`)}
              </button>

              {showProgress && (
                <ProgressDetails
                  key={preview.namePath}
                  meta={preview}
                  loreByPath={loreByPath}
                  store={progress}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-purple-500 uppercase tracking-widest">{label}</span>
      <div className="flex rounded-lg border border-purple-700 overflow-hidden">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              'px-3 py-1.5 text-sm font-semibold transition-colors',
              opt.value === value
                ? 'bg-amber-500 text-amber-900'
                : 'bg-purple-900/60 text-purple-300 hover:bg-purple-800',
              i > 0 ? 'border-l border-purple-700' : '',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BioPreview({ namePath }: { namePath: string }) {
  const [bio, setBio] = useState<string | null>(bioCache.get(namePath) ?? null);

  useEffect(() => {
    if (bioCache.has(namePath)) return;
    fetch(`${import.meta.env.BASE_URL}characters/${namePath}/bio.txt`)
      .then((r) => r.text())
      .then((t) => {
        bioCache.set(namePath, t.trim());
        setBio(t.trim());
      })
      .catch(() => {
        bioCache.set(namePath, '');
        setBio('');
      });
  }, [namePath]);

  if (bio === null)
    return <span className="text-purple-500 italic">Loading...</span>;
  return (
    <>
      {bio || (
        <span className="text-purple-500 italic">
          Strange...there doesn't seem to be a bio for this character. 🌚
        </span>
      )}
    </>
  );
}

function opponentsOf(meta: CharacterMeta): CharacterMeta[] {
  return SELECTABLE_CHARACTERS.filter((m) => m.namePath !== meta.namePath);
}

function TileProgress({
  loreTotal,
  progress,
  opponents,
}: {
  loreTotal: number;
  progress: CharacterProgress;
  opponents: CharacterMeta[];
}) {
  const loreCount = progress.lore.filter((i) => i < loreTotal).length;
  const beatenCount = opponents.filter((o) =>
    progress.beaten.includes(o.namePath),
  ).length;
  const summary = `${loreCount} of ${loreTotal} lore unlocked, ${beatenCount} of ${opponents.length} opponents beaten`;

  return (
    <div
      role="img"
      aria-label={summary}
      title={summary}
      className="flex flex-col items-center gap-1.5 mt-1.5 w-full"
    >
      <div className="flex gap-1 h-1.5">
        {Array.from({ length: loreTotal }, (_, i) => (
          <span
            key={i}
            className={[
              'w-1.5 h-1.5 rounded-full',
              i < loreCount
                ? 'bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.9)]'
                : 'bg-purple-800',
            ].join(' ')}
          />
        ))}
      </div>
      <div className="flex gap-0.5 w-full max-w-20 h-1">
        {opponents.map((o, i) => (
          <span
            key={o.namePath}
            className={[
              'flex-1 rounded-full',
              i < beatenCount
                ? 'bg-teal-300 shadow-[0_0_4px_rgba(94,234,212,0.8)]'
                : 'bg-purple-800',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

// A character plus any shapeshift forms nested under it (e.g. nora, nora/norm)
function formsOf(meta: CharacterMeta): CharacterMeta[] {
  return [
    meta,
    ...Object.values(CHARACTER_REGISTRY).filter((m) =>
      m.namePath.startsWith(`${meta.namePath}/`),
    ),
  ];
}

function ProgressDetails({
  meta,
  loreByPath,
  store,
}: {
  meta: CharacterMeta;
  loreByPath: Record<string, string[]>;
  store: ProgressStore;
}) {
  const forms = formsOf(meta);
  const [formIdx, setFormIdx] = useState(0);
  const form = forms[formIdx] ?? meta;
  const lore = loreByPath[form.namePath] ?? [];
  const formProgress = getCharacterProgress(store, form.namePath);
  const progress = getCharacterProgress(store, meta.namePath);

  const opponents = opponentsOf(meta);
  const unlockedOf = (f: CharacterMeta) => {
    const count = loreByPath[f.namePath]?.length ?? 0;
    return getCharacterProgress(store, f.namePath).lore.filter((i) => i < count)
      .length;
  };
  const beatenCount = opponents.filter((o) =>
    progress.beaten.includes(o.namePath),
  ).length;

  return (
    <div className="w-full mt-2 border-t border-purple-800 pt-4 flex flex-col gap-5">
      <section>
        <h3 className="text-amber-500 text-xs font-semibold tracking-widest uppercase mb-3">
          ✦ Lore · {unlockedOf(form)}/{lore.length}
        </h3>
        {forms.length > 1 && (
          <div className="flex rounded-lg border border-purple-700 overflow-hidden mb-4">
            {forms.map((f, i) => (
              <button
                key={f.namePath}
                onClick={() => setFormIdx(i)}
                className={[
                  'flex-1 px-1 py-1.5 text-xs font-semibold transition-colors',
                  i === formIdx
                    ? 'bg-amber-500 text-amber-900'
                    : 'bg-purple-900/60 text-purple-300 hover:bg-purple-800',
                  i > 0 ? 'border-l border-purple-700' : '',
                ].join(' ')}
              >
                {f.formEmoji} {f.formLabel ?? f.displayName}
              </button>
            ))}
          </div>
        )}
        <LoreScrolls
          key={form.namePath}
          form={form}
          lore={lore}
          unlocked={formProgress.lore}
        />
      </section>

      <section>
        <h3 className="text-teal-300 text-xs font-semibold tracking-widest uppercase mb-2">
          Opponents beaten · {beatenCount}/{opponents.length}
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {opponents.map((o) => {
            const beaten = progress.beaten.includes(o.namePath);
            return (
              <div key={o.namePath} className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'w-full aspect-square overflow-hidden rounded-lg border-2 bg-purple-900',
                    beaten ? 'border-teal-300' : 'border-purple-800',
                  ].join(' ')}
                >
                  <FadeImage
                    src={`${import.meta.env.BASE_URL}images/characters/${o.imagePrefix}_mf_face_left.png`}
                    alt=""
                    className={[
                      'w-full h-full object-cover scale-150 origin-[50%_25%]',
                      beaten ? '' : 'grayscale opacity-40',
                    ].join(' ')}
                  />
                </div>
                <span
                  className={`text-[10px] ${beaten ? 'text-teal-200' : 'text-purple-500'}`}
                >
                  {o.displayName}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
