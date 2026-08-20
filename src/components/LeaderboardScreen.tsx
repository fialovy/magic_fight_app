import { useEffect, useMemo, useState } from 'react';
import { fetchScores } from '../engine/leaderboard';
import type { LeaderboardRow } from '../engine/leaderboard';
import { CHARACTER_REGISTRY } from '../data/characters';

interface Props {
  onBack: () => void;
}

const DISPLAY_NAME: Record<string, string> = Object.fromEntries(
  Object.values(CHARACTER_REGISTRY).map((m) => [m.namePath, m.displayName]),
);

function toName(namePath: string): string {
  return DISPLAY_NAME[namePath] ?? namePath;
}

interface SessionGroup {
  name: string;
  wins: number;
  totalGames: number;
  bestStreak: number;
  loreUnlocked: string[];
  characters: string[];
  modes: string[];
  speeds: string[];
  date: string;
  rows: LeaderboardRow[];
}

function groupIntoSessions(rows: LeaderboardRow[]): SessionGroup[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime(),
  );

  const sessions: SessionGroup[] = [];
  let cur: (SessionGroup & { lastMs: number }) | null = null;
  const TWO_HOURS = 2 * 60 * 60 * 1000;

  for (const row of sorted) {
    const ms = new Date(row.played_at).getTime();
    if (!cur || cur.name !== row.name || ms - cur.lastMs > TWO_HOURS) {
      cur = {
        name: row.name,
        wins: 0,
        totalGames: 0,
        bestStreak: 0,
        loreUnlocked: [],
        characters: [],
        modes: [],
        speeds: [],
        date: row.played_at,
        rows: [],
        lastMs: ms,
      };
      sessions.push(cur);
    }
    cur.lastMs = ms;
    cur.date = row.played_at;
    cur.rows.push(row);
    cur.totalGames += 1;
    if (row.won) cur.wins += 1;
    cur.bestStreak = Math.max(cur.bestStreak, row.best_streak);
    for (const l of row.lore_unlocked) {
      if (!cur.loreUnlocked.includes(l)) cur.loreUnlocked.push(l);
    }
    if (!cur.characters.includes(row.character)) cur.characters.push(row.character);
    if (!cur.modes.includes(row.mode)) cur.modes.push(row.mode);
    if (!cur.speeds.includes(row.speed)) cur.speeds.push(row.speed);
  }

  return sessions;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type SortKey = 'wins' | 'streak' | 'lore' | 'date';

export default function LeaderboardScreen({ onBack }: Props) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('wins');
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchScores()
      .then(setRows)
      .catch(() => setError(true));
  }, []);

  const sessions = useMemo(() => (rows ? groupIntoSessions(rows) : null), [rows]);

  const sorted = useMemo(() => {
    if (!sessions) return null;
    return [...sessions].sort((a, b) => {
      if (sortKey === 'wins') return b.wins - a.wins || b.totalGames - a.totalGames;
      if (sortKey === 'streak') return b.bestStreak - a.bestStreak;
      if (sortKey === 'lore') return b.loreUnlocked.length - a.loreUnlocked.length;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [sessions, sortKey]);

  return (
    <div className="min-h-screen app-bg px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-purple-200 tracking-widest uppercase">
              Leaderboard
            </h1>
            {sorted && (
              <p className="text-purple-500 text-sm mt-0.5">
                {sorted.length} session{sorted.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg border border-purple-700 text-purple-300 hover:bg-purple-900/60 transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-purple-500 uppercase tracking-widest mr-1">Sort</span>
          {(['wins', 'streak', 'lore', 'date'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={[
                'px-3 py-1 text-sm rounded-lg border transition-colors capitalize',
                key === sortKey
                  ? 'bg-amber-500 text-amber-900 border-amber-400 font-semibold'
                  : 'border-purple-700 text-purple-300 hover:bg-purple-900/60',
              ].join(' ')}
            >
              {key === 'lore' ? 'Lore' : key === 'streak' ? 'Streak' : key === 'wins' ? 'Wins' : 'Date'}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-rose-400 text-sm">Could not load scores. Check your connection.</p>
        )}

        {!rows && !error && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {sorted && sorted.length === 0 && (
          <p className="text-purple-500 text-center py-16">No scores yet — play a game!</p>
        )}

        {sorted && sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map((s, i) => (
              <SessionRow key={`${s.name}-${s.date}`} session={s} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session: s, rank }: { session: SessionGroup; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const isTop3 = rank <= 3;
  const rankColor =
    rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-purple-600';

  return (
    <div className="bg-purple-950/50 border border-purple-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-4 flex-wrap hover:bg-purple-900/30 transition-colors text-left"
      >
        <span className={`text-lg font-bold w-7 shrink-0 tabular-nums ${rankColor}`}>
          {rank}
        </span>

        <div className="flex-1 min-w-0">
          <span className={`font-bold text-sm truncate block ${isTop3 ? 'text-amber-200' : 'text-purple-100'}`}>
            {s.name}
          </span>
          <span className="text-xs text-purple-500 truncate block">
            {s.characters.map(toName).join(', ')}
            {' · '}
            {[...new Set(s.modes)].join('/')}
            {' · '}
            {[...new Set(s.speeds)].join('/')}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-center">
          <div>
            <p className="text-base font-bold text-emerald-400 tabular-nums">
              {s.wins}<span className="text-purple-600 text-xs font-normal">/{s.totalGames}</span>
            </p>
            <p className="text-xs text-purple-500">wins</p>
          </div>
          <div>
            <p className="text-base font-bold text-amber-400 tabular-nums">
              {s.bestStreak > 0 ? `🔥 ${s.bestStreak}` : '—'}
            </p>
            <p className="text-xs text-purple-500">streak</p>
          </div>
          <div>
            <p className="text-base font-bold text-purple-300 tabular-nums">
              {s.loreUnlocked.length > 0 ? `✦ ${s.loreUnlocked.length}` : '—'}
            </p>
            <p className="text-xs text-purple-500">lore</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-purple-400">{formatDate(s.date)}</p>
          </div>
          <span className={`text-purple-500 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-purple-800/40 divide-y divide-purple-800/30">
          {[...s.rows].reverse().map((row) => (
            <FightRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function FightRow({ row }: { row: LeaderboardRow }) {
  return (
    <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap pl-11">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-purple-200">
          {toName(row.character)}
          <span className="text-purple-600"> vs </span>
          {toName(row.opponent)}
        </span>
        <span className="text-xs text-purple-600 ml-2">
          {row.mode} · {row.speed}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0 text-xs">
        <span className={row.won ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
          {row.won ? 'Win' : 'Loss'}
        </span>
        {row.best_streak >= 2 && (
          <span className="text-amber-400">🔥 {row.best_streak}</span>
        )}
        {row.lore_unlocked.length > 0 && (
          <span className="text-purple-400">✦ lore</span>
        )}
        <span className="text-purple-600">{formatDate(row.played_at)}</span>
      </div>
    </div>
  );
}
