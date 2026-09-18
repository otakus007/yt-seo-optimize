/**
 * Import a YouTube Studio "Content" table export (CSV) — the only source of thumbnail impressions + CTR.
 *   pnpm tsx scripts/import-studio.ts <file.csv> --from 2026-08-01 --to 2026-08-28 [--json]
 * Studio → Analytics → Content → date range → Export → Comma-separated values.
 */
import { readFileSync } from 'fs';
import prisma from '../src/lib/db';
import { parseStudioCsv } from '../src/lib/studio';
import { opt, out, positional } from './_cli';

async function main() {
  const [file] = positional; const from = opt('from'), to = opt('to');
  if (!file || !from || !to) throw new Error('usage: import-studio.ts <file.csv> --from YYYY-MM-DD --to YYYY-MM-DD');
  const rows = parseStudioCsv(readFileSync(file, 'utf8'));
  let imported = 0, unknown = 0;
  for (const r of rows) {
    const v = await prisma.video.findUnique({ where: { youtubeId: r.youtubeId } });
    if (!v) { unknown++; continue; }
    const key = { videoId: v.id, rangeStart: new Date(from), rangeEnd: new Date(to) };
    await prisma.studioSnapshot.upsert({ where: { videoId_rangeStart_rangeEnd: key }, update: { impressions: r.impressions, ctr: r.ctr, views: r.views, avdSec: r.avdSec }, create: { ...key, impressions: r.impressions, ctr: r.ctr, views: r.views, avdSec: r.avdSec } });
    imported++;
  }
  out({ imported, unknown, from, to });
}
if (require.main === module) main().finally(() => prisma.$disconnect());
