import 'dotenv/config';

const BASE = 'https://api.football-data.org/v4';
const COMPETITION = 'WC';

const KNOCKOUT_STAGES = [
  'LAST_32',
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'THIRD_PLACE',
  'FINAL',
];

export async function fetchKnockoutMatches({ stages = KNOCKOUT_STAGES } = {}) {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error('FOOTBALL_API_KEY não definido no .env');

  const url = `${BASE}/competitions/${COMPETITION}/matches?stage=${stages.join(',')}`;
  const res = await fetch(url, { headers: { 'X-Auth-Token': key } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.matches ?? [];
}
