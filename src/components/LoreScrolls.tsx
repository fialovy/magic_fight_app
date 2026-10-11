import { type TouchEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CharacterMeta } from '../data/characters';

const ROMAN: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

// Lore indices are 0-based, numerals start at I
function numeral(i: number): string {
  let n = i + 1;
  let out = '';
  for (const [value, symbol] of ROMAN) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

// Horizontal swipe distance (px) that counts as paging, rather than a tap
const SWIPE_MIN = 50;
// Movement (px) before a touch is committed to paging (x) or scrolling (y)
const AXIS_LOCK = 10;
const SLIDE_MS = 160;

// Shape based on Lucide's "scroll-text" icon (ISC license)
function ScrollIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15 12h-5" />
      <path d="M15 8h-5" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </svg>
  );
}

// One row of scrolls for a character (or one shapeshift form). Lit scrolls open
// the reader; locked ones show how to unlock them.
export default function LoreScrolls({
  form,
  lore,
  unlocked,
}: {
  form: CharacterMeta;
  lore: string[];
  unlocked: number[];
}) {
  const [reading, setReading] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const unlockedSorted = lore
    .map((_, i) => i)
    .filter((i) => unlocked.includes(i));

  return (
    <>
      <div className="flex justify-center gap-3">
        {lore.map((_, i) => {
          const isUnlocked = unlocked.includes(i);
          return (
            <button
              key={i}
              onClick={() => (isUnlocked ? setReading(i) : setHint(true))}
              aria-label={`Lore ${numeral(i)}${isUnlocked ? '' : ' (locked)'}`}
              className={[
                'flex flex-col items-center gap-1 w-14 py-2 rounded-xl border-2 transition-colors',
                isUnlocked
                  ? 'border-amber-500/60 bg-amber-900/20 text-amber-300 hover:bg-amber-800/30'
                  : 'border-purple-800 bg-purple-900/40 text-purple-700',
              ].join(' ')}
            >
              <ScrollIcon
                className={[
                  'w-7 h-7',
                  isUnlocked
                    ? 'drop-shadow-[0_0_6px_rgba(252,211,77,0.8)]'
                    : '',
                ].join(' ')}
              />
              <span className="text-[10px] font-semibold">{numeral(i)}</span>
            </button>
          );
        })}
      </div>

      {/* Reserved line, so showing the hint doesn't resize the popup */}
      <p className="h-4 mt-2 text-center text-xs italic text-purple-400">
        {hint && `Win as ${form.displayName} to unlock`}
      </p>

      {reading !== null && (
        <LoreReader
          form={form}
          lore={lore}
          index={reading}
          unlockedSorted={unlockedSorted}
          onNavigate={setReading}
          onClose={() => setReading(null)}
        />
      )}
    </>
  );
}

// Rendered into <body> so it covers the whole screen; the character popup it
// opens from keeps a transform after animating in, which would trap it otherwise.
function LoreReader({
  form,
  lore,
  index,
  unlockedSorted,
  onNavigate,
  onClose,
}: {
  form: CharacterMeta;
  lore: string[];
  index: number;
  unlockedSorted: number[];
  onNavigate: (i: number) => void;
  onClose: () => void;
}) {
  const pos = unlockedSorted.indexOf(index);
  const prev = pos > 0 ? unlockedSorted[pos - 1] : null;
  const next = pos < unlockedSorted.length - 1 ? unlockedSorted[pos + 1] : null;

  const contentRef = useRef<HTMLDivElement>(null);
  // x: horizontal offset of the lore text in px; animate: ease to it vs. jump
  const [slide, setSlide] = useState({ x: 0, animate: false });
  // True while a page-change slide runs, so overlapping input can't stack up
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  // Gesture axis is locked once movement passes AXIS_LOCK px: 'x' pages, 'y' scrolls
  const gesture = useRef<{
    x: number;
    y: number;
    axis: 'x' | 'y' | null;
  } | null>(null);

  // Closing mid-slide must not let a pending page change reopen the reader
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const width = () => contentRef.current?.clientWidth ?? 320;

  // dir 1 = forward (text exits left, next enters from the right)
  function goTo(target: number | null, dir: 1 | -1) {
    if (target === null || busy.current) return;
    const resetScroll = () => contentRef.current?.scrollTo({ top: 0 });
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onNavigate(target);
      resetScroll();
      return;
    }
    busy.current = true;
    setSlide({ x: -dir * width(), animate: true });
    later(() => {
      onNavigate(target);
      resetScroll();
      setSlide({ x: dir * width() * 0.4, animate: false });
      // Two frames so the jump to the entry side paints before easing in
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setSlide({ x: 0, animate: true });
          later(() => {
            busy.current = false;
          }, SLIDE_MS);
        }),
      );
    }, SLIDE_MS);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goTo(prev, -1);
      if (e.key === 'ArrowRight') goTo(next, 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    gesture.current =
      busy.current || e.touches.length !== 1 || !t
        ? null
        : { x: t.clientX, y: t.clientY, axis: null };
  }

  function handleTouchMove(e: TouchEvent) {
    const g = gesture.current;
    const t = e.touches[0];
    if (!g || !t) return;
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (g.axis === null) {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (g.axis !== 'x') return;
    // Resist at the ends so it's clear there's nothing further that way
    const blocked = (dx < 0 && next === null) || (dx > 0 && prev === null);
    setSlide({ x: blocked ? dx * 0.25 : dx, animate: false });
  }

  function handleTouchEnd(e: TouchEvent) {
    const g = gesture.current;
    gesture.current = null;
    const t = e.changedTouches[0];
    if (!g || g.axis !== 'x' || !t) return;
    const dx = t.clientX - g.x;
    if (dx <= -SWIPE_MIN && next !== null) goTo(next, 1);
    else if (dx >= SWIPE_MIN && prev !== null) goTo(prev, -1);
    else setSlide({ x: 0, animate: true });
  }

  function handleTouchCancel() {
    gesture.current = null;
    if (!busy.current) setSlide({ x: 0, animate: true });
  }

  const arrowClass =
    'w-11 h-11 flex items-center justify-center rounded-xl text-2xl text-amber-300 hover:bg-amber-900/30 transition-colors disabled:text-purple-800 disabled:hover:bg-transparent';

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`${form.displayName} lore ${numeral(index)}`}
        className="animate-modal-in relative w-full max-w-md max-h-full overflow-hidden flex flex-col rounded-2xl border border-amber-500/50 bg-purple-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center text-purple-400 hover:text-purple-200 text-2xl leading-none rounded-lg hover:bg-purple-800/60 transition-colors"
        >
          ×
        </button>

        {/* touch-pan-y: the browser handles vertical scrolling; horizontal
            drags come to the handlers below for paging */}
        <div
          ref={contentRef}
          className="overflow-y-auto touch-pan-y px-7 pt-7 pb-4"
          style={{
            transform: `translateX(${slide.x}px)`,
            opacity: 1 - Math.min(Math.abs(slide.x) / width(), 1) * 0.7,
            transition: slide.animate
              ? `transform ${SLIDE_MS}ms ease-out, opacity ${SLIDE_MS}ms ease-out`
              : 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <p className="text-amber-500 text-xs font-semibold tracking-widest uppercase mb-1">
            ✦ {form.formEmoji ? `${form.formEmoji} ` : ''}
            {form.displayName}
          </p>
          <h2 className="text-amber-300 text-2xl font-bold mb-4">
            Lore {numeral(index)}
          </h2>
          {/* Every unlocked entry is stacked in one grid cell, with only the
              current one visible, so the reader is as tall as the longest and
              keeps the same size while paging */}
          <div className="grid">
            {unlockedSorted.map((i) => (
              <p
                key={i}
                aria-hidden={i !== index}
                className={[
                  '[grid-area:1/1] text-amber-50/90 text-base leading-relaxed',
                  i === index ? '' : 'invisible',
                ].join(' ')}
              >
                {lore[i]}
              </p>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-purple-800/60">
          <button
            onClick={() => goTo(prev, -1)}
            disabled={prev === null}
            aria-label="Previous lore"
            className={arrowClass}
          >
            ‹
          </button>
          <button
            onClick={() => goTo(next, 1)}
            disabled={next === null}
            aria-label="Next lore"
            className={arrowClass}
          >
            ›
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
