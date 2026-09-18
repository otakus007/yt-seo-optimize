/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Google API payloads */
/** YouTube Data API v3. API-key functions read public data; token functions act as the channel owner. */
const API = 'https://www.googleapis.com/youtube/v3';

async function get(path: string, params: Record<string, string>, auth: { apiKey?: string; token?: string }) {
  const p = new URLSearchParams(params);
  if (auth.apiKey) p.set('key', auth.apiKey);
  let res: Response;
  try {
    res = auth.token ? await fetch(`${API}/${path}?${p}`, { headers: { Authorization: `Bearer ${auth.token}` } }) : await fetch(`${API}/${path}?${p}`);
  } catch (error) {
    throw new Error(`YouTube API Network Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!res.ok) throw new Error(`YouTube API Error: ${res.status} ${res.statusText}`);
  return res.json();
}

export interface YouTubeChannelStats {
  youtubeId: string; title: string; description: string; handle: string | null;
  uploadsPlaylistId: string; subscriberCount: number; viewCount: bigint; videoCount: number;
}

function toChannel(c: any): YouTubeChannelStats {
  return {
    youtubeId: c.id, title: c.snippet.title, description: c.snippet.description,
    handle: c.snippet.customUrl ?? null,
    uploadsPlaylistId: c.contentDetails?.relatedPlaylists?.uploads ?? '',
    subscriberCount: parseInt(c.statistics.subscriberCount || '0', 10),
    viewCount: BigInt(c.statistics.viewCount || '0'),
    videoCount: parseInt(c.statistics.videoCount || '0', 10),
  };
}

const CH_PARTS = 'snippet,contentDetails,statistics';

export async function getChannelBasicStats(channelId: string, apiKey: string): Promise<YouTubeChannelStats> {
  const data = await get('channels', { part: CH_PARTS, id: channelId }, { apiKey });
  if (!data.items?.length) throw new Error('Channel not found');
  return toChannel(data.items[0]);
}

export async function getChannelByHandle(handle: string, apiKey: string): Promise<YouTubeChannelStats> {
  const data = await get('channels', { part: CH_PARTS, forHandle: handle.replace(/^@/, '') }, { apiKey });
  if (!data.items?.length) throw new Error('Channel not found for the given handle');
  return toChannel(data.items[0]);
}

/** The channel the OAuth token belongs to. */
export async function getMyChannel(token: string): Promise<YouTubeChannelStats> {
  const data = await get('channels', { part: CH_PARTS, mine: 'true' }, { token });
  if (!data.items?.length) throw new Error('No channel for this Google account');
  return toChannel(data.items[0]);
}

export async function getVideosFromPlaylist(playlistId: string, apiKey: string, maxVideos = 200): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < maxVideos) {
    const data = await get('playlistItems', { part: 'contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) }, { apiKey });
    if (!data.items?.length) break;
    ids.push(...data.items.map((i: any) => i.contentDetails.videoId));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return ids.slice(0, maxVideos);
}

export interface YouTubeVideoStats {
  youtubeId: string; title: string; description: string; publishedAt: Date;
  viewCount: number; likeCount: number; commentCount: number; tags: string | null;
  thumbnailUrl: string | null; duration: string; durationSec: number;
  privacyStatus: string | null; categoryId: string | null;
}

export function isoDurationToSec(iso: string): number {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? '');
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + (+(m[4] ?? 0));
}

export function bestThumbnail(t: any): string | null {
  return t?.maxres?.url ?? t?.standard?.url ?? t?.high?.url ?? t?.medium?.url ?? t?.default?.url ?? null;
}

export async function getVideoStats(videoIds: string[], apiKey: string): Promise<YouTubeVideoStats[]> {
  const out: YouTubeVideoStats[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const data = await get('videos', { part: 'snippet,contentDetails,statistics,status', id: videoIds.slice(i, i + 50).join(',') }, { apiKey });
    for (const v of data.items ?? []) {
      out.push({
        youtubeId: v.id, title: v.snippet.title, description: v.snippet.description,
        publishedAt: new Date(v.snippet.publishedAt),
        viewCount: parseInt(v.statistics.viewCount || '0', 10),
        likeCount: parseInt(v.statistics.likeCount || '0', 10),
        commentCount: parseInt(v.statistics.commentCount || '0', 10),
        tags: v.snippet.tags ? JSON.stringify(v.snippet.tags) : null,
        thumbnailUrl: bestThumbnail(v.snippet.thumbnails),
        duration: v.contentDetails.duration, durationSec: isoDurationToSec(v.contentDetails.duration),
        privacyStatus: v.status?.privacyStatus ?? null, categoryId: v.snippet.categoryId ?? null,
      });
    }
  }
  return out;
}

export interface LiveSnippet { title: string; description: string; tags: string[]; categoryId: string; thumbnailUrl: string | null; defaultLanguage?: string }

/** Current metadata straight from YouTube (never from our DB) — the "before" of every Change. */
export async function getVideoLive(token: string, videoId: string): Promise<LiveSnippet> {
  const data = await get('videos', { part: 'snippet', id: videoId }, { token });
  const s = data.items?.[0]?.snippet;
  if (!s) throw new Error('Video not found');
  return { title: s.title, description: s.description ?? '', tags: s.tags ?? [], categoryId: s.categoryId, thumbnailUrl: bestThumbnail(s.thumbnails), defaultLanguage: s.defaultLanguage };
}

export async function updateVideoSnippet(token: string, videoId: string, s: LiveSnippet): Promise<void> {
  const res = await fetch(`${API}/videos?part=snippet`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: videoId, snippet: { title: s.title, description: s.description, tags: s.tags, categoryId: s.categoryId, ...(s.defaultLanguage ? { defaultLanguage: s.defaultLanguage } : {}) } }),
  });
  if (!res.ok) throw new Error(`videos.update failed: ${res.status} ${await res.text()}`);
}

export async function setThumbnail(token: string, videoId: string, jpeg: Buffer): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body: new Uint8Array(jpeg),
  });
  if (!res.ok) throw new Error(`thumbnails.set failed: ${res.status} ${await res.text()}`);
}

export async function addToPlaylist(token: string, playlistId: string, videoId: string): Promise<void> {
  const res = await fetch(`${API}/playlistItems?part=snippet`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } }),
  });
  if (!res.ok) throw new Error(`playlistItems.insert failed: ${res.status} ${await res.text()}`);
}

/** Unofficial autocomplete endpoint: what people actually type. */
export async function autocomplete(seed: string, lang = 'en'): Promise<string[]> {
  const res = await fetch(`https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&hl=${lang}&q=${encodeURIComponent(seed)}`);
  const text = await res.text();
  const json = JSON.parse(text.replace(/^[^(]*\(/, '').replace(/\)$/, ''));
  return (json[1] ?? []).map((x: any) => (Array.isArray(x) ? x[0] : x)).filter((x: unknown): x is string => typeof x === 'string');
}
