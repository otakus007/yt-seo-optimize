/** Sync one channel: Data API metadata + videos; Analytics too when it is an own channel. */
import prisma from './db';
import { accessTokenFor } from './oauth';
import { syncAnalytics } from './analytics';
import { getChannelBasicStats, getMyChannel, getVideoStats, getVideosFromPlaylist } from './youtube';

export function apiKey(): string {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error('YOUTUBE_API_KEY not set');
  return k;
}

async function upsertVideos(channelId: string, playlistId: string, key: string, max: number) {
  const ids = await getVideosFromPlaylist(playlistId, key, max);
  const stats = await getVideoStats(ids, key);
  for (const s of stats) {
    const { youtubeId, ...rest } = s;
    await prisma.video.upsert({ where: { youtubeId }, update: rest, create: { youtubeId, channelId, ...rest } });
  }
  return stats.length;
}

export async function syncChannel(id: string, log: (s: string) => void = () => {}) {
  const key = apiKey();
  const ch = await prisma.channel.findUniqueOrThrow({ where: { id } });
  log(`== ${ch.title} (${ch.isOwn ? 'own' : 'competitor'})`);
  const info = ch.isOwn ? await getMyChannel(await accessTokenFor(ch)) : await getChannelBasicStats(ch.youtubeId, key);
  const { youtubeId, ...data } = info;
  void youtubeId;
  await prisma.channel.update({ where: { id }, data });
  const n = await upsertVideos(id, info.uploadsPlaylistId, key, ch.isOwn ? 5000 : 200);
  log(`videos: ${n}`);
  if (ch.isOwn) await syncAnalytics({ token: await accessTokenFor(ch), channelId: id, monetized: ch.monetized, log });
  await prisma.channel.update({ where: { id }, data: { lastSyncedAt: new Date() } });
  return { id, title: info.title, videos: n };
}
