import { useState } from 'react';
import SpellCard from './SpellCard';

const BASE = import.meta.env.BASE_URL;

const STEPS = [
  'rule',
  'timer',
  'affinity',
  'go',
] as const;
export default function TutorialModal({ onDone }: { onDone: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  function next() {
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
    else onDone();
  }

  function prev() {
    setStepIdx((i) => Math.max(0, i - 1));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80">
      <div className="animate-modal-in bg-indigo-950 border border-purple-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-5">

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
        <div className="flex flex-col items-center gap-4 min-h-[220px] justify-center">
          {step === 'rule' && <RuleStep />}
          {step === 'timer' && <TimerStep />}
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

function RuleStep() {
  return (
    <>
      <h2 className="text-xl font-bold text-purple-100 text-center">How to play</h2>
      <div className="flex items-center gap-4">
        <SpellCard
          spell={{ color: 'purple', shape: 'heart', fill: 'solid', rotation: 'clockwise' }}
          size={72}
          staticDisplay
        />
        <div className="flex flex-col items-center gap-1">
          <span className="text-amber-400 font-bold text-lg">✦</span>
          <span className="text-purple-400 text-xs text-center leading-tight">match<br/>color</span>
        </div>
        <SpellCard
          spell={{ color: 'purple', shape: 'star', fill: 'dots', rotation: 'counter-clockwise' }}
          size={72}
          staticDisplay
          selected
        />
      </div>
      <p className="text-purple-300 text-sm text-center leading-relaxed">
        Each turn, both players cast a spell. Your opponent's spell is revealed
        in the middle, and a rule appears telling you to{' '}
        <span className="text-amber-300 font-semibold">match</span>{' '}or{' '}
        <span className="text-rose-300 font-semibold">avoid</span>{' '}it.
      </p>
    </>
  );
}

function TimerStep() {
  return (
    <>
      <h2 className="text-xl font-bold text-purple-100 text-center">Beat the clock</h2>
      <div className="w-full flex flex-col gap-3">
        <TimerBar label="Early game" widthPct={85} color="bg-emerald-500" />
        <TimerBar label="Mid game" widthPct={55} color="bg-amber-400" />
        <TimerBar label="Late game" widthPct={28} color="bg-rose-500" />
      </div>
      <p className="text-purple-300 text-sm text-center leading-relaxed">
        You have limited time each turn, and it shrinks over time. Pick your spell fast — a timeout counts as a wrong answer!
      </p>
    </>
  );
}

function TimerBar({ label, widthPct, color }: { label: string; widthPct: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-purple-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-3 bg-purple-900/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function AffinityStep() {
  return (
    <>
      <h2 className="text-xl font-bold text-purple-100 text-center">Hidden affinities</h2>
      <div className="flex gap-6 justify-center">
        <CharacterAffinityCard
          headSrc={`${BASE}images/characters/norm_mf_head.png`}
          name="Norm"
          primarySpell={{ color: 'purple', shape: 'heart', fill: 'solid', rotation: 'clockwise' }}
          primaryLabel="heart"
        />
        <CharacterAffinityCard
          headSrc={`${BASE}images/characters/adrian_mf_head.png`}
          name="Adrian"
          primarySpell={{ color: 'purple', shape: 'triangle', fill: 'solid', rotation: 'clockwise' }}
          primaryLabel="triangle"
        />
      </div>
      <p className="text-purple-300 text-sm text-center leading-relaxed">
        Every character has a secret affinity. Spells that match their{' '}
        <span className="text-amber-300 font-semibold">primary dimension</span> hit harder. Learn them to gain an edge.
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
