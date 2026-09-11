import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { Spell } from '../types/game';
import SpellCard from './SpellCard';

const BASE = import.meta.env.BASE_URL;

const STEPS = [
  'rule',
  'affinity',
  'go',
] as const;
export default function TutorialModal({ onDone }: { onDone: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const [visible, setVisible] = useState(true);
  const swipeStartX = useRef<number | null>(null);

  function navigate(action: () => void) {
    setVisible(false);
    setTimeout(() => {
      action();
      setVisible(true);
    }, 150);
  }

  function next() {
    if (stepIdx < STEPS.length - 1) navigate(() => setStepIdx((i) => i + 1));
    else onDone();
  }

  function prev() {
    navigate(() => setStepIdx((i) => Math.max(0, i - 1)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    swipeStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (swipeStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0) next();
    else prev();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80">
      <div
        className="animate-modal-in bg-indigo-950 border border-purple-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* Dot indicators */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={[
                'w-2 h-2 rounded-full transition-colors duration-200',
                i === stepIdx ? 'bg-amber-400' : 'bg-purple-700',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Step content */}
        <div className={`flex flex-col items-center gap-4 min-h-[220px] justify-center transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {step === 'rule' && <RuleStep />}
          {step === 'affinity' && <AffinityStep />}
          {step === 'go' && <GoStep />}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {stepIdx > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-2.5 rounded-xl border border-purple-600 text-purple-300 hover:bg-purple-900 text-sm font-semibold transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm transition-colors"
          >
            {stepIdx === STEPS.length - 1 ? "Let's fight!" : 'Next →'}
          </button>
        </div>

        {/* Skip link */}
        {stepIdx < STEPS.length - 1 && (
          <button
            onClick={onDone}
            className="text-xs text-purple-600 hover:text-purple-400 text-center transition-colors"
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}

function RuleBadge({ avoid, active, children }: { avoid: boolean; active?: boolean; children: ReactNode }) {
  return (
    <span className={[
      'inline-flex gap-1.5 text-[11px] font-bold tracking-widest px-2.5 py-0.5 rounded-full border-2 transition-all duration-300',
      avoid
        ? active
          ? 'text-rose-200 border-rose-400 bg-rose-900/80'
          : 'text-rose-300 border-rose-600 bg-rose-950/60'
        : active
          ? 'text-blue-100 border-blue-400 bg-blue-900/80'
          : 'text-blue-300 border-blue-600 bg-blue-950/60',
    ].join(' ')}>
      {children}
    </span>
  );
}

const OPPONENT_SPELL: Spell = { color: 'purple', shape: 'heart', fill: 'solid', rotation: 'clockwise' };
const PLAYER_CHOICES: Spell[] = [
  { color: 'purple', shape: 'star',     fill: 'dots',            rotation: 'counter-clockwise' }, // 0: purple → correct for COLOR / MATCH
  { color: 'red',    shape: 'square',   fill: 'crosshatch',      rotation: 'clockwise' },
  { color: 'green',  shape: 'triangle', fill: 'vertical-stripe', rotation: 'clockwise' },          // 2: not heart+solid → correct for ~~SHAPE FILL~~ / AVOID
  { color: 'orange', shape: 'heart',    fill: 'crosshatch',      rotation: 'counter-clockwise' },
];

const ANIM_CYCLES = [
  { group: 0, inGroup: 0, cardIdx: 0, why: "matches purple" },
  { group: 0, inGroup: 1, cardIdx: 2, why: 'different shape, different fill' },
  { group: 1, inGroup: 0, cardIdx: 0, why: 'matches the rule' },
  { group: 1, inGroup: 1, cardIdx: 2, why: 'avoids the rule' },
] as const;

const RULE_REVEAL_MS = 900;
const CYCLE_MS = 2600;

function RuleStep() {
  const [cycleIdx, setCycleIdx] = useState(0);
  const [showCard, setShowCard] = useState(false);
  const [shownWhy, setShownWhy] = useState('');

  useEffect(() => {
    setShowCard(false);
    const { why } = ANIM_CYCLES[cycleIdx];
    const cardTimer = setTimeout(() => {
      setShownWhy(why);
      setShowCard(true);
    }, RULE_REVEAL_MS);
    const nextTimer = setTimeout(
      () => setCycleIdx((i) => (i + 1) % ANIM_CYCLES.length),
      CYCLE_MS,
    );
    return () => { clearTimeout(cardTimer); clearTimeout(nextTimer); };
  }, [cycleIdx]);

  const { group: activeGroup, inGroup: activeInGroup, cardIdx: activeCard } = ANIM_CYCLES[cycleIdx];

  function badgeActive(group: number, inGroup: number) {
    return group === activeGroup && inGroup === activeInGroup;
  }

  return (
    <>
      <h2 className="text-xl font-bold text-purple-100 text-center">How to play</h2>
      <div className="flex gap-2 w-full items-center">

        {/* Opponent */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className="text-purple-500 text-xs uppercase tracking-wider">opponent</span>
          <SpellCard spell={OPPONENT_SPELL} size={58} staticDisplay />
        </div>

        {/* Rule badges */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          {([
            { label: 'follow mode', badges: [
              { avoid: false, content: <>COLOR</> },
              { avoid: true,  content: <><span className="line-through">SHAPE</span><span className="line-through">FILL</span></> },
            ]},
            { label: 'guess mode', badges: [
              { avoid: false, content: <>MATCH</> },
              { avoid: true,  content: <>AVOID</> },
            ]},
          ] as const).map((group, gi) => (
            <div key={gi} className="flex flex-col items-center gap-1.5">
              <span className={[
                'text-xs uppercase tracking-wider transition-colors duration-300',
                activeGroup === gi ? 'text-purple-400' : 'text-purple-700',
              ].join(' ')}>
                {group.label}
              </span>
              {group.badges.map((badge, bi) => (
                <div key={bi} className={[
                  'transition-all duration-300',
                  badgeActive(gi, bi) ? 'scale-110' : 'opacity-30',
                ].join(' ')}>
                  <RuleBadge avoid={badge.avoid} active={badgeActive(gi, bi)}>{badge.content}</RuleBadge>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Player choices */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <span className="text-purple-500 text-xs uppercase tracking-wider">you</span>
          {PLAYER_CHOICES.map((spell, i) => (
            <div
              key={i}
              className={[
                'rounded-xl transition-all duration-300',
                showCard && i === activeCard
                  ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/50'
                  : '',
              ].join(' ')}
            >
              <SpellCard spell={spell} size={44} staticDisplay glowing={showCard && i === activeCard} />
            </div>
          ))}
        </div>

      </div>
      <p className={[
        'text-xs font-semibold text-amber-300 text-center transition-opacity duration-300 h-4',
        showCard ? 'opacity-100' : 'opacity-0',
      ].join(' ')}>
        ✦ {shownWhy}
      </p>
      <p className="text-purple-300 text-sm text-center leading-relaxed">
        Each turn, your opponent's spell is revealed and a rule tells you to{' '}
        <span className="text-amber-300 font-semibold">match</span> or{' '}
        <span className="text-rose-300 font-semibold">avoid</span> something about it.
        Pick the right spell from your hand!
      </p>
    </>
  );
}

function AffinityStep() {
  return (
    <>
      <h2 className="text-xl font-bold text-purple-100 text-center">Hidden affinities</h2>
      <div className="flex gap-6 justify-center mb-3">
        <CharacterAffinityCard
          headSrc={`${BASE}images/characters/norm_mf_head.png`}
          name="Norm"
          primarySpell={{ color: 'purple', shape: 'heart', fill: 'solid', rotation: 'clockwise' }}
          primaryLabel="heart"
        />
        <CharacterAffinityCard
          headSrc={`${BASE}images/characters/adrian_mf_head.png`}
          name="Adrian"
          primarySpell={{ color: 'orange', shape: 'triangle', fill: 'vertical-stripe', rotation: 'clockwise' }}
          primaryLabel="triangle"
        />
      </div>
      <p className="text-purple-300 text-sm text-center leading-relaxed">
        Every character has a secret affinity that makes their spells hit harder. Learn the affinities to gain an edge!
      </p>
    </>
  );
}

function CharacterAffinityCard({
  headSrc,
  name,
  primarySpell,
  primaryLabel,
}: {
  headSrc: string;
  name: string;
  primarySpell: Parameters<typeof SpellCard>[0]['spell'];
  primaryLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <img src={headSrc} alt={name} className="w-14 h-14 object-contain" />
      <span className="text-purple-300 text-xs font-semibold">{name}</span>
      <div className="relative">
        <SpellCard spell={primarySpell} size={60} staticDisplay selected />
        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-amber-400 whitespace-nowrap">
          ✦ {primaryLabel}
        </span>
      </div>
    </div>
  );
}

function GoStep() {
  return (
    <>
      <img
        src={`${BASE}images/characters/nora_mf_face_right.png`}
        alt="Nora"
        className="w-24 h-24 object-contain"
      />
      <h2 className="text-xl font-bold text-purple-100 text-center">You're ready!</h2>
      <p className="text-purple-300 text-sm text-center leading-relaxed">
        Pick your fighter, figure out the rule, and cast the right spell before time runs out. Good luck!
      </p>
    </>
  );
}
