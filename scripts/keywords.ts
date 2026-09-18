/**
 * Keyword research from three real sources: YouTube autocomplete, competitor titles/tags in DB,
 * and own search terms from Analytics. pnpm tsx scripts/keywords.ts "<seed>" [--lang en] [--json]
 */
import prisma from '../src/lib/db';
import { latestReport, reportToObjects } from '../src/lib/analytics';
import { autocomplete } from '../src/lib/youtube';
import { opt, out, positional } from './_cli';

const STOP = new Set('the a an of to in on and or for with is are was be by at from this that it as manhwa recap webtoon full story explained'.split(' '));

async function main() {
  const seed = positional[0]; const lang = opt('lang') ?? 'en';
  if (!seed) throw new Error('usage: keywords.ts "<seed>"');
  const suggestions = await autocomplete(seed, lang);
  const expanded = (await Promise.all('abcdefghijklmnopqrstuvwxyz'.split('').slice(0, 10).map((c) => autocomplete(`${seed} ${c}`, lang).catch(() => [])))).flat();

  const competitors = await prisma.video.findMany({ where: { channel: { isOwn: false } }, select: { title: true, tags: true, viewCount: true }, orderBy: { viewCount: 'desc' }, take: 300 });
  const freq = new Map<string, { count: number; views: number }>();
  for (const v of competitors) {
    const words = new Set([...v.title.toLowerCase().split(/[^a-z0-9']+/), ...((v.tags ? (JSON.parse(v.tags) as string[]) : []).map((t) => t.toLowerCase()))].filter((w) => w.length > 2 && !STOP.has(w)));
    for (const w of words) { const f = freq.get(w) ?? { count: 0, views: 0 }; f.count++; f.views += v.viewCount; freq.set(w, f); }
  }
  const competitorTerms = [...freq].sort((a, b) => b[1].views - a[1].views).slice(0, 40).map(([term, f]) => ({ term, videos: f.count, views: f.views }));

  const own = await prisma.channel.findMany({ where: { isOwn: true }, select: { id: true } });
  const searchTerms: Record<string, number> = {};
  for (const c of own) {
    const rep = await latestReport(c.id, '', 'search-terms');
    if (rep) for (const r of reportToObjects(rep)) searchTerms[String(r.insightTrafficSourceDetail)] = (searchTerms[String(r.insightTrafficSourceDetail)] ?? 0) + Number(r.views);
  }
  out({ seed, autocomplete: [...new Set([...suggestions, ...expanded])], competitorTerms, ownSearchTerms: Object.entries(searchTerms).sort((a, b) => b[1] - a[1]).slice(0, 40) });
}
main().finally(() => prisma.$disconnect());
