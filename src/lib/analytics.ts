/** YouTube Analytics API v2. Every response is stored raw (AnalyticsReport); VideoDaily is the typed subset. */
import prisma from './db';

export interface Report { columnHeaders: { name: string }[]; rows: (string | number)[][] }

export interface QueryParams {
  startDate: string; endDate: string; metrics: string; dimensions?: string;
  filters?: string; sort?: string; maxResults?: number;
}

export async function query(token: string, p: QueryParams): Promise<Report> {
  const params = new URLSearchParams({ ids: 'channel==MINE', startDate: p.startDate, endDate: p.endDate, metrics: p.metrics });
  if (p.dimensions) params.set('dimensions', p.dimensions);
  if (p.filters) params.set('filters', p.filters);
  if (p.sort) params.set('sort', p.sort);
  if (p.maxResults) params.set('maxResults', String(p.maxResults));
  const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Analytics API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { columnHeaders: data.columnHeaders ?? [], rows: data.rows ?? [] };
}

export const DAILY_METRICS = 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares';
export const REVENUE_METRICS = 'estimatedRevenue,cpm';

/** Lifetime per-video (and channel-level) breakdowns, refreshed when older than SNAPSHOT_TTL_DAYS. */
export const SNAPSHOT_REPORTS: { kind: string; q: Omit<QueryParams, 'startDate' | 'endDate'>; channelOnly?: boolean }[] = [
  { kind: 'traffic', q: { dimensions: 'insightTrafficSourceType', metrics: 'views,estimatedMinutesWatched', sort: '-views' } },
  { kind: 'search-terms', q: { dimensions: 'insightTrafficSourceDetail', filters: 'insightTrafficSourceType==YT_SEARCH', metrics: 'views', sort: '-views', maxResults: 25 } },
  { kind: 'suggested-from', q: { dimensions: 'insightTrafficSourceDetail', filters: 'insightTrafficSourceType==RELATED_VIDEO', metrics: 'views', sort: '-views', maxResults: 25 } },
  { kind: 'retention', q: { dimensions: 'elapsedVideoTimeRatio', metrics: 'audienceWatchRatio,relativeRetentionPerformance' } },
  { kind: 'country', q: { dimensions: 'country', metrics: 'views,estimatedMinutesWatched', sort: '-views', maxResults: 25 } },
  { kind: 'device', q: { dimensions: 'deviceType', metrics: 'views,estimatedMinutesWatched' } },
  { kind: 'subscribed', q: { dimensions: 'subscribedStatus', metrics: 'views,estimatedMinutesWatched' } },
  { kind: 'playback-location', q: { dimensions: 'insightPlaybackLocationType', metrics: 'views,estimatedMinutesWatched' } },
  { kind: 'sharing', q: { dimensions: 'sharingService', metrics: 'shares', sort: '-shares' } },
  { kind: 'demographics', q: { dimensions: 'ageGroup,gender', metrics: 'viewerPercentage' } },
  { kind: 'os', q: { dimensions: 'operatingSystem', metrics: 'views' }, channelOnly: true },
];
export const SNAPSHOT_TTL_DAYS = 7;

export const day = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export async function storeRaw(channelId: string, videoId: string, kind: string, start: string, end: string, report: Report) {
  const rangeStart = new Date(start), rangeEnd = new Date(end);
  await prisma.analyticsReport.upsert({
    where: { channelId_videoId_kind_rangeStart_rangeEnd: { channelId, videoId, kind, rangeStart, rangeEnd } },
    update: { json: JSON.stringify(report), fetchedAt: new Date() },
    create: { channelId, videoId, kind, rangeStart, rangeEnd, json: JSON.stringify(report) },
  });
}

/** Turn a `day`-dimension report into VideoDaily rows. */
export function rowsToDaily(report: Report) {
  const idx = Object.fromEntries(report.columnHeaders.map((h, i) => [h.name, i]));
  const num = (row: (string | number)[], k: string) => (idx[k] === undefined ? undefined : Number(row[idx[k]]));
  return report.rows.map((r) => ({
    date: new Date(String(r[idx.day])),
    views: num(r, 'views') ?? 0,
    estimatedMinutesWatched: num(r, 'estimatedMinutesWatched') ?? 0,
    averageViewDuration: num(r, 'averageViewDuration') ?? 0,
    averageViewPercentage: num(r, 'averageViewPercentage') ?? 0,
    subscribersGained: num(r, 'subscribersGained') ?? 0,
    subscribersLost: num(r, 'subscribersLost') ?? 0,
    likes: num(r, 'likes') ?? 0,
    comments: num(r, 'comments') ?? 0,
    shares: num(r, 'shares') ?? 0,
    estimatedRevenue: num(r, 'estimatedRevenue') ?? null,
    cpm: num(r, 'cpm') ?? null,
  }));
}

export interface SyncAnalyticsOpts { token: string; channelId: string; monetized: boolean; log?: (s: string) => void }

/**
 * Backfills / refreshes analytics for one own channel. Incremental: from
 * (lastAnalyticsDate - 7 days) or each video's publish date, up to yesterday.
 */
export async function syncAnalytics({ token, channelId, monetized, log = () => {} }: SyncAnalyticsOpts) {
  const channel = await prisma.channel.findUniqueOrThrow({ where: { id: channelId }, include: { videos: true } });
  const end = day(addDays(new Date(), -1));
  const metrics = monetized ? `${DAILY_METRICS},${REVENUE_METRICS}` : DAILY_METRICS;
  const since = channel.lastAnalyticsDate ? addDays(channel.lastAnalyticsDate, -7) : null;
  const earliest = channel.videos.reduce<Date | null>((m, v) => (!m || v.publishedAt < m ? v.publishedAt : m), null) ?? new Date();

  // Channel-level daily (for YPP progress / channel trend).
  const chStart = day(since ?? earliest);
  const chDaily = await query(token, { startDate: chStart, endDate: end, metrics, dimensions: 'day' });
  await storeRaw(channelId, '', 'channel-daily', chStart, end, chDaily);
  log(`channel-daily ${chStart}..${end}: ${chDaily.rows.length} rows`);

  let failed = 0;
  for (const v of channel.videos) {
    const vStart = day(since && since > v.publishedAt ? since : v.publishedAt);
    if (vStart > end) continue;
    const filters = `video==${v.youtubeId}`;
    try {
      const rep = await query(token, { startDate: vStart, endDate: end, metrics, dimensions: 'day', filters });
      await storeRaw(channelId, v.youtubeId, 'video-daily', vStart, end, rep);
      for (const row of rowsToDaily(rep)) {
        await prisma.videoDaily.upsert({ where: { videoId_date: { videoId: v.id, date: row.date } }, update: row, create: { videoId: v.id, ...row } });
      }
      log(`daily ${v.youtubeId} ${vStart}..${end}: ${rep.rows.length} rows`);
    } catch (e) {
      failed++;
      log(`daily ${v.youtubeId} failed: ${(e as Error).message}`);
    }
    await refreshSnapshots(token, channelId, v.youtubeId, day(v.publishedAt), end, log);
  }
  await refreshSnapshots(token, channelId, '', day(earliest), end, log);
  // ponytail: any failure keeps the watermark so the next run re-fetches the whole range; per-video watermarks if one video errors forever.
  if (failed) log(`${failed} video(s) failed; lastAnalyticsDate not advanced`);
  else await prisma.channel.update({ where: { id: channelId }, data: { lastAnalyticsDate: new Date(end) } });
}

async function refreshSnapshots(token: string, channelId: string, videoId: string, start: string, end: string, log: (s: string) => void) {
  const fresh = await prisma.analyticsReport.findMany({
    where: { channelId, videoId, fetchedAt: { gt: addDays(new Date(), -SNAPSHOT_TTL_DAYS) } }, select: { kind: true },
  });
  const have = new Set(fresh.map((r) => r.kind));
  for (const r of SNAPSHOT_REPORTS) {
    if (have.has(r.kind) || (r.channelOnly && videoId)) continue;
    const filters = [videoId ? `video==${videoId}` : '', r.q.filters ?? ''].filter(Boolean).join(';') || undefined;
    try {
      const rep = await query(token, { ...r.q, filters, startDate: start, endDate: end });
      await storeRaw(channelId, videoId, r.kind, start, end, rep);
    } catch (e) {
      // Some breakdowns (demographics, retention) error on low-data videos; that's expected.
      log(`${r.kind} ${videoId || 'channel'} skipped: ${(e as Error).message.slice(0, 120)}`);
    }
  }
}

/** Latest raw report of a kind for a video ("" = channel), parsed. */
export async function latestReport(channelId: string, videoId: string, kind: string): Promise<Report | null> {
  const r = await prisma.analyticsReport.findFirst({ where: { channelId, videoId, kind }, orderBy: { fetchedAt: 'desc' } });
  return r ? (JSON.parse(r.json) as Report) : null;
}

export function reportToObjects(rep: Report): Record<string, string | number>[] {
  return rep.rows.map((row) => Object.fromEntries(rep.columnHeaders.map((h, i) => [h.name, row[i]])));
}
