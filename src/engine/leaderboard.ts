// In dev, VITE_ vars are present in .env.local → call Supabase directly.
// In production on Vercel, those vars are absent → call the serverless proxy instead.
const DEV_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const DEV_KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

const DEV_HEADERS = DEV_URL
  ? {
      'Content-Type': 'application/json',
      apikey: DEV_KEY!,
      Authorization: `Bearer ${DEV_KEY!}`,
    }
  : null;

export interface LeaderboardRow {
  id: string;
  name: string;
  character: string;
  opponent: string;
  mode: string;
  speed: string;
  won: boolean;
  best_streak: number;
  lore_unlocked: string[];
  played_at: string;
}

export interface LeaderboardEntry {
  name: string;
  character: string;
  opponent: string;
  mode: string;
  speed: string;
  won: boolean;
  best_streak: number;
  lore_unlocked: string[];
}

export async function submitScore(entry: LeaderboardEntry): Promise<void> {
  if (DEV_URL && DEV_HEADERS) {
    const res = await fetch(`${DEV_URL}/rest/v1/leaderboard`, {
      method: 'POST',
      headers: { ...DEV_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
    return;
  }
  const res = await fetch('/api/leaderboard-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
}

export async function fetchScores(): Promise<LeaderboardRow[]> {
  if (DEV_URL && DEV_HEADERS) {
    const res = await fetch(
      `${DEV_URL}/rest/v1/leaderboard?select=*&order=played_at.desc&limit=500`,
      { headers: DEV_HEADERS },
    );
    if (!res.ok) return [];
    return res.json();
  }
  const res = await fetch('/api/leaderboard-fetch');
  if (!res.ok) return [];
  return res.json();
}
