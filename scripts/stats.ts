/**
 * Machine-readable analysis for skills and humans.
 *   pnpm tsx scripts/stats.ts [--channel <id|handle>] [--video <youtubeId>] [--json]
 * Channel mode: baseline, per-video metrics + flags, underperformers, open recommendations, change results.
 * Video mode: everything about one video incl. traffic, search terms, retention curve.
 */
import prisma from '../src/lib/db';
import { latestReport, reportToObjects } from '../src/lib/analytics';
import { avgViewPct, baseline, channelVideos, compareChange, first7DaysViews, flags, last28Views, latestCtr, revenue, yppProgress } from '../src/lib/stats';
import { opt, out } from './_cli';

async function findChannel(ref?: string) {
  const ch = ref
    ? await prisma.channel.findFirst({ where: { OR: [{ id: ref }, { youtubeId: ref }, { handle: ref.startsWith('@') ? ref : `@${ref}` }] } })
    : await prisma.channel.findFirst({ where: { isOwn: true }, orderBy: { createdAt: 'asc' } });
  if (!ch) throw new Error('channel not found');
  return ch;
}

async function channelStats(ref?: string) {
  const ch = await findChannel(ref);
  const videos = await channelVideos(ch.id);
  const b = baseline(videos);
  const rows = videos.map((v) => ({
    youtubeId: v.youtubeId, title: v.title, publishedAt: v.publishedAt, durationSec: v.durationSec, views: v.viewCount,
    first7: first7DaysViews(v), last28: last28Views(v), ctr: latestCtr(v), avgViewPct: avgViewPct(v), revenue: ch.monetized ? revenue(v) : undefined,
    tags: v.tags ? JSON.parse(v.tags) : [], descriptionLength: v.description?.length ?? 0, flags: flags(v, b),
  }));
  const changes = await prisma.change.findMany({ where: { video: { channelId: ch.id } }, orderBy: { appliedAt: 'desc' }, take: 50 });
  const changeResults = changes.map((c) => {
    const v = videos.find((x) => x.id === c.videoId)!;
    return { id: c.id, youtubeId: v.youtubeId, field: c.field, before: JSON.parse(c.before), after: JSON.parse(c.after), appliedAt: c.appliedAt, d7: compareChange(v, c.appliedAt, 7), d14: compareChange(v, c.appliedAt, 14) };
  });
  const recommendations = await prisma.recommendation.findMany({ where: { channelId: ch.id, status: 'open' }, include: { steps: true, video: { select: { youtubeId: true } } } });
  const channelReports: Record<string, unknown> = {};
  for (const kind of ['traffic', 'country', 'device', 'subscribed', 'demographics', 'search-terms']) {
    const r = await latestReport(ch.id, '', kind); if (r) channelReports[kind] = reportToObjects(r);
  }
  out({
    channel: { id: ch.id, youtubeId: ch.youtubeId, handle: ch.handle, title: ch.title, isOwn: ch.isOwn, monetized: ch.monetized, niche: ch.niche, language: ch.language, subscribers: ch.subscriberCount, lastSyncedAt: ch.lastSyncedAt, lastAnalyticsDate: ch.lastAnalyticsDate },
    baseline: b, ypp: ch.monetized ? undefined : yppProgress(ch.subscriberCount, videos),
    videos: rows, underperformers: rows.filter((r) => r.flags.some((f) => f.severity === 'red' || f.code === 'slow-start')),
    outliers: rows.filter((r) => r.flags.some((f) => f.code === 'outlier' || f.code === 'top-performer')),
    changeResults, recommendations, channelReports,
  });
}

async function videoStats(youtubeId: string) {
  const v = await prisma.video.findUniqueOrThrow({ where: { youtubeId }, include: { daily: { orderBy: { date: 'asc' } }, studio: true, changes: true, recommendations: { include: { steps: true } }, channel: true } });
  const all = await channelVideos(v.channelId);
  const b = baseline(all);
  const reports: Record<string, unknown> = {};
  for (const kind of ['traffic', 'search-terms', 'suggested-from', 'retention', 'country', 'device', 'subscribed', 'playback-location']) {
    const r = await latestReport(v.channelId, youtubeId, kind); if (r) reports[kind] = reportToObjects(r);
  }
  out({ video: { ...v, daily: undefined, studio: undefined, changes: undefined, recommendations: undefined, channel: undefined, tags: v.tags ? JSON.parse(v.tags) : [] },
    metrics: { first7: first7DaysViews(v), last28: last28Views(v), ctr: latestCtr(v), avgViewPct: avgViewPct(v), revenue: revenue(v) }, flags: flags(v, b), baseline: b,
    daily: v.daily, studio: v.studio, changes: v.changes.map((c) => ({ ...c, d7: compareChange(v, c.appliedAt, 7), d14: compareChange(v, c.appliedAt, 14) })), recommendations: v.recommendations, reports });
}

const video = opt('video');
(video ? videoStats(video) : channelStats(opt('channel'))).finally(() => prisma.$disconnect());
