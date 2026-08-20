import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const upstream = await fetch(
    `${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=played_at.desc&limit=500`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  if (!upstream.ok) return res.status(502).json({ error: 'upstream error' });
  res.json(await upstream.json());
}
