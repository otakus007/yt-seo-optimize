import prisma from './db';
import { median } from './stats';
import { syncChannel, apiKey } from './sync';
import { getChannelByHandle } from './youtube';

export async function addCompetitor(handle: string, log?: (s: string) => void) {
  const { youtubeId, ...rest } = await getChannelByHandle(handle, apiKey());
  const ch = await prisma.channel.upsert({ where: { youtubeId }, update: rest, create: { youtubeId, ...rest, isOwn: false } });
  return syncChannel(ch.id, log);
}

/** Outlier = video with views > 3x that channel's median: its title/thumbnail is worth studying. */
export async function competitorReport() {
  const channels = await prisma.channel.findMany({ where: { isOwn: false }, include: { videos: { orderBy: { publishedAt: 'desc' } } } });
  return channels.map((c) => {
    const med = median(c.videos.map((v) => v.viewCount));
    const recent = c.videos.filter((v) => v.publishedAt > new Date(Date.now() - 90 * 86400000));
    const daysSpan = recent.length > 1 ? (+recent[0].publishedAt - +recent[recent.length - 1].publishedAt) / 86400000 : 0;
    return {
      id: c.id, handle: c.handle, title: c.title, subscribers: c.subscriberCount, videos: c.videos.length, medianViews: med,
      viewsPerSub: c.subscriberCount && c.videos.length ? Math.round((c.videos.reduce((a, v) => a + v.viewCount, 0) / c.videos.length / c.subscriberCount) * 1000) / 1000 : null,
      uploadsPerWeek: daysSpan ? Math.round((recent.length / daysSpan) * 70) / 10 : null,
      medianDurationMin: Math.round(median(c.videos.map((v) => v.durationSec)) / 60),
      medianTitleLength: median(c.videos.map((v) => v.title.length)),
      outliers: c.videos.filter((v) => med > 0 && v.viewCount > med * 3).sort((a, b) => b.viewCount - a.viewCount).slice(0, 15)
        .map((v) => ({ youtubeId: v.youtubeId, title: v.title, views: v.viewCount, multiple: Math.round((v.viewCount / med) * 10) / 10, thumbnailUrl: v.thumbnailUrl, publishedAt: v.publishedAt, durationSec: v.durationSec, tags: v.tags ? (JSON.parse(v.tags) as string[]) : [] })),
    };
  });
}
