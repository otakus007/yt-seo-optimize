/**
 * Sync own channels (Data API + Analytics) and competitors (Data API only).
 *   pnpm tsx scripts/sync.ts [--channel <handle|youtubeId|id>] [--own-only|--competitors-only] [--json]
 * Incremental by default; re-fetches the last 7 analytics days each run.
 */
import prisma from '../src/lib/db';
import { syncChannel } from '../src/lib/sync';
import { flag, log, opt, out } from './_cli';

async function main() {
  const one = opt('channel');
  const where = one
    ? { OR: [{ youtubeId: one }, { handle: one.startsWith('@') ? one : `@${one}` }, { id: one }] }
    : flag('own-only') ? { isOwn: true } : flag('competitors-only') ? { isOwn: false } : {};
  const channels = await prisma.channel.findMany({ where, orderBy: { isOwn: 'desc' } });
  if (!channels.length) throw new Error('No matching channels. Connect one in the dashboard or run add-competitor.ts');
  const results = [];
  for (const c of channels) {
    try { results.push(await syncChannel(c.id, log)); }
    catch (e) { results.push({ id: c.id, title: c.title, error: (e as Error).message }); log(`FAILED ${c.title}: ${(e as Error).message}`); }
  }
  out(results);
}
main().finally(() => prisma.$disconnect());
