/** pnpm tsx scripts/add-competitor.ts @handle [@handle...] — register competitor channels, then sync them. */
import prisma from '../src/lib/db';
import { addCompetitor } from '../src/lib/competitors';
import { log, out, positional } from './_cli';

async function main() {
  if (!positional.length) throw new Error('usage: add-competitor.ts @handle ...');
  const res = [];
  for (const h of positional) res.push(await addCompetitor(h, log));
  out(res);
}
main().finally(() => prisma.$disconnect());
