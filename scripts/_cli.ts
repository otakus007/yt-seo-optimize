import 'dotenv/config';
export const args = process.argv.slice(2);
export const flag = (name: string) => args.includes(`--${name}`);
export const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
export const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['json', 'backfill', 'competitors-only', 'own-only'].includes(args[i - 1].slice(2))));
export const json = flag('json');
export const log = (s: string) => { if (!json) console.log(s); };
export const out = (data: unknown) => console.log(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? Number(v) : v), json ? 0 : 2));
export function apiKey(): string {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error('YOUTUBE_API_KEY not set');
  return k;
}
