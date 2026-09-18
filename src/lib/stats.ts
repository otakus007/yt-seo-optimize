/** Pure-ish stats helpers used by scripts and the dashboard. Everything cites numbers from the DB. */
import prisma from './db';

export const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

export interface VideoWithData {
  id: string; youtubeId: string; title: string; description: string | null; tags: string | null;
  publishedAt: Date; viewCount: number; likeCount: number; durationSec: number;
  daily: { date: Date; views: number; estimatedMinutesWatched: number; averageViewPercentage: number; averageViewDuration: number; subscribersGained: number; estimatedRevenue: number | null }[];
  studio: { rangeStart: Date; rangeEnd: Date; impressions: number; ctr: number }[];
}

export function viewsInWindow(v: VideoWithData, from: Date, to: Date) {
  return sum(v.daily.filter((d) => d.date >= from && d.date < to).map((d) => d.views));
}
const startOfDay = (d: Date) => new Date(Math.floor(d.getTime() / 86400000) * 86400000);
// VideoDaily.date is UTC midnight; start from the publish day so day 0 counts.
export const first7DaysViews = (v: VideoWithData) => viewsInWindow(v, startOfDay(v.publishedAt), new Date(startOfDay(v.publishedAt).getTime() + 7 * 86400000));
export const last28Views = (v: VideoWithData) => viewsInWindow(v, daysAgo(28), new Date());
export const latestCtr = (v: VideoWithData) => [...v.studio].sort((a, b) => +b.rangeEnd - +a.rangeEnd)[0]?.ctr ?? null;
export const avgViewPct = (v: VideoWithData) => {
  const d = v.daily.filter((x) => x.views > 0);
  return d.length ? sum(d.map((x) => x.averageViewPercentage * x.views)) / sum(d.map((x) => x.views)) : null;
};
export const revenue = (v: VideoWithData) => sum(v.daily.map((d) => d.estimatedRevenue ?? 0));

export interface Baseline { medianFirst7: number; medianLast28: number; medianCtr: number | null; medianAvp: number | null; medianViews: number }

export function baseline(videos: VideoWithData[]): Baseline {
  const ctrs = videos.map(latestCtr).filter((x): x is number => x != null);
  const avps = videos.map(avgViewPct).filter((x): x is number => x != null);
  return {
    medianFirst7: median(videos.filter((v) => v.publishedAt < daysAgo(7)).map(first7DaysViews)),
    medianLast28: median(videos.map(last28Views)),
    medianCtr: ctrs.length ? median(ctrs) : null,
    medianAvp: avps.length ? median(avps) : null,
    medianViews: median(videos.map((v) => v.viewCount)),
  };
}

export type Flag = { code: string; detail: string; severity: 'red' | 'orange' | 'green' };

/** Deterministic heuristic flags. The LLM audit adds judgment on top of these. */
export function flags(v: VideoWithData, b: Baseline): Flag[] {
  const out: Flag[] = [];
  const ctr = latestCtr(v), avp = avgViewPct(v), f7 = first7DaysViews(v), l28 = last28Views(v);
  const tags: string[] = v.tags ? JSON.parse(v.tags) : [];
  if (b.medianCtr != null && ctr != null && ctr < b.medianCtr * 0.8) out.push({ code: 'low-ctr', detail: `CTR ${ctr.toFixed(1)}% vs channel median ${b.medianCtr.toFixed(1)}%`, severity: 'red' });
  if (b.medianAvp != null && avp != null && avp < b.medianAvp * 0.8) out.push({ code: 'low-retention', detail: `avg view ${avp.toFixed(0)}% vs median ${b.medianAvp.toFixed(0)}%`, severity: 'orange' });
  if (v.publishedAt < daysAgo(7) && b.medianFirst7 > 0 && f7 < b.medianFirst7 * 0.5) out.push({ code: 'slow-start', detail: `${f7} views in first 7d vs median ${b.medianFirst7}`, severity: 'orange' });
  if (b.medianLast28 > 0 && l28 > b.medianLast28 * 3) out.push({ code: 'outlier', detail: `${l28} views last 28d vs median ${b.medianLast28}`, severity: 'green' });
  if (b.medianViews > 0 && v.viewCount > b.medianViews * 3) out.push({ code: 'top-performer', detail: `${v.viewCount} views vs median ${b.medianViews}`, severity: 'green' });
  if (v.title.length > 70) out.push({ code: 'title-long', detail: `${v.title.length} chars`, severity: 'orange' });
  if (tags.length === 0) out.push({ code: 'no-tags', detail: 'no tags', severity: 'orange' });
  if ((v.description?.length ?? 0) < 100) out.push({ code: 'thin-description', detail: `${v.description?.length ?? 0} chars`, severity: 'orange' });
  if (v.durationSec >= 600 && !/\d{1,2}:\d{2}/.test(v.description ?? '')) out.push({ code: 'no-timestamps', detail: 'long video without chapters', severity: 'orange' });
  return out;
}

/** Before/after for one Change: views/day and CTR over N days each side. */
export function compareChange(v: VideoWithData, appliedAt: Date, days: number) {
  const windowEnd = appliedAt.getTime() + days * 86400000;
  // Analytics lags 2-3 days: judge completeness and the after-divisor by the data we actually have, not the wall clock.
  const lastData = Math.max(0, ...v.daily.map((d) => d.date.getTime() + 86400000));
  const complete = lastData >= windowEnd;
  const coveredDays = complete ? days : Math.max(1, Math.min(days, Math.ceil((lastData - appliedAt.getTime()) / 86400000)));
  const before = viewsInWindow(v, new Date(appliedAt.getTime() - days * 86400000), appliedAt) / days;
  const after = viewsInWindow(v, appliedAt, new Date(windowEnd)) / coveredDays;
  const snapBefore = v.studio.filter((s) => s.rangeEnd <= appliedAt).sort((a, b) => +b.rangeEnd - +a.rangeEnd)[0];
  const snapAfter = v.studio.filter((s) => s.rangeStart >= appliedAt).sort((a, b) => +a.rangeStart - +b.rangeStart)[0];
  return { days, viewsPerDayBefore: before, viewsPerDayAfter: after, ctrBefore: snapBefore?.ctr ?? null, ctrAfter: snapAfter?.ctr ?? null, complete };
}

export const videoInclude = { daily: true, studio: true } as const;

export async function channelVideos(channelId: string): Promise<VideoWithData[]> {
  return prisma.video.findMany({ where: { channelId }, include: videoInclude, orderBy: { publishedAt: 'desc' } });
}

/** Progress toward YouTube Partner Program (1,000 subs, 4,000 public watch hours in 365 days). */
export function yppProgress(subscriberCount: number, videos: VideoWithData[]) {
  const since = daysAgo(365), recent = daysAgo(28);
  const minutes365 = sum(videos.flatMap((v) => v.daily.filter((d) => d.date >= since).map((d) => d.estimatedMinutesWatched)));
  const minutes28 = sum(videos.flatMap((v) => v.daily.filter((d) => d.date >= recent).map((d) => d.estimatedMinutesWatched)));
  const subs28 = sum(videos.flatMap((v) => v.daily.filter((d) => d.date >= recent).map((d) => d.subscribersGained)));
  const hours = minutes365 / 60, hoursPerDay = minutes28 / 60 / 28, subsPerDay = subs28 / 28;
  const etaHours = hours >= 4000 ? 0 : hoursPerDay > 0 ? Math.ceil((4000 - hours) / hoursPerDay) : null;
  const etaSubs = subscriberCount >= 1000 ? 0 : subsPerDay > 0 ? Math.ceil((1000 - subscriberCount) / subsPerDay) : null;
  return { hours, subscriberCount, hoursPerDay, subsPerDay, etaDays: etaHours == null || etaSubs == null ? null : Math.max(etaHours, etaSubs) };
}
