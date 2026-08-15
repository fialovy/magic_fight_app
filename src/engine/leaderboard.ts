const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string;

const HEADERS = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
}

export async function fetchScores(): Promise<LeaderboardRow[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=played_at.desc&limit=500`,
    { headers: HEADERS },
  );
  if (!res.ok) return [];
  return res.json();
}
