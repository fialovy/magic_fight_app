import { useId } from 'react';
import type { Spell, SpellShape } from '../types/game';

export const SPELL_COLOR_HEX: Record<string, string> = {
  red:    '#f87171',
  blue:   '#60a5fa',
  green:  '#4ade80',
  purple: '#c084fc',
};

const HEART_PATH =
  'M 50,85 C 20,65 5,50 5,35 C 5,20 17,10 30,10 C 39,10 46,22 50,30 ' +
  'C 54,22 61,10 70,10 C 83,10 95,20 95,35 C 95,50 80,65 50,85 Z';

const STAR_PATH = (() => {
  const [cx, cy, outerR, innerR] = [50, 50, 42, 17];
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI / 5) - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
})();

interface Props {
  spell: Spell;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** Pulse glow — used for the opponent's revealed spell */
  glowing?: boolean;
  size?: number;
}

export default function SpellCard({ spell, onClick, selected, disabled, glowing, size = 80 }: Props) {
  const uid = useId();
  const color  = SPELL_COLOR_HEX[spell.color];
  const fillId = `sf-${uid}`;

  const borderCls = selected
    ? 'border-amber-400 shadow-lg shadow-amber-500/30 scale-105'
    : glowing
      ? 'border-purple-400 shadow-md shadow-purple-500/40 animate-pulse'
      : 'border-purple-700 hover:border-purple-400 hover:scale-105';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${spell.color} ${spell.shape} ${spell.fill} ${spell.rotation}`}
      className={[
        'rounded-xl border-2 bg-purple-950/60 flex items-center justify-center',
        'transition-all duration-150 select-none',
        borderCls,
        disabled ? 'opacity-40 cursor-default' : 'cursor-pointer',
      ].join(' ')}
      style={{ width: size, height: size, padding: Math.round(size * 0.1) }}
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <defs>
          {spell.fill === 'vertical-stripe' && (
            <pattern id={fillId} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="8"  height="16" fill={color} />
              <rect x="8" y="0" width="8"  height="16" fill={color} fillOpacity="0.2" />
            </pattern>
          )}
          {spell.fill === 'crosshatch' && (
            <pattern id={fillId} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="16" height="16" fill={color} fillOpacity="0.15" />
              <rect x="0" y="0" width="7"  height="7"  fill={color} />
              <rect x="9" y="0" width="7"  height="7"  fill={color} />
              <rect x="0" y="9" width="7"  height="7"  fill={color} />
              <rect x="9" y="9" width="7"  height="7"  fill={color} />
            </pattern>
          )}
          {spell.fill === 'dots' && (
            <pattern id={fillId} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="16" height="16" fill={color} fillOpacity="0.15" />
              <circle cx="8" cy="8" r="5.5" fill={color} />
            </pattern>
          )}
        </defs>
        <g className={spell.rotation === 'clockwise' ? 'spell-spin-cw' : 'spell-spin-ccw'}>
          <ShapePath
            shape={spell.shape}
            fill={spell.fill === 'solid' ? color : `url(#${fillId})`}
          />
        </g>
      </svg>
    </button>
  );
}

function ShapePath({ shape, fill }: { shape: SpellShape; fill: string }) {
  const p = { fill, stroke: 'rgba(255,255,255,0.25)', strokeWidth: 2 };
  switch (shape) {
    case 'heart':    return <path    d={HEART_PATH}           {...p} />;
    case 'square':   return <rect    x="10" y="10" width="80" height="80" rx="6" {...p} />;
    case 'star':     return <path    d={STAR_PATH}            {...p} />;
    case 'triangle': return <polygon points="50,8 92,86 8,86" {...p} />;
  }
}
