export interface YouTubeChannelStats {
  youtubeId: string;
  title: string;
  description: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export async function getChannelBasicStats(channelId: string, apiKey: string): Promise<YouTubeChannelStats> {
  const params = new URLSearchParams({
    part: 'statistics,snippet',
    id: channelId,
    key: apiKey
  });
  const url = `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`;
  
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`YouTube API Network Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  if (!response.ok) {
    throw new Error(`YouTube API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  const channel = data.items[0];
  return {
    youtubeId: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    subscriberCount: parseInt(channel.statistics.subscriberCount || '0', 10),
    viewCount: parseInt(channel.statistics.viewCount || '0', 10),
    videoCount: parseInt(channel.statistics.videoCount || '0', 10),
  };
}

export interface YouTubeVideoStats {
  youtubeId: string;
  title: string;
  description: string;
  publishedAt: Date;
  viewCount: number;
  duration: string;
}

export interface ChannelResolution {
  channelId: string;
  uploadsPlaylistId: string;
}

export async function getChannelByHandle(handle: string, apiKey: string): Promise<ChannelResolution> {
  // Remove the @ if the user included it
  const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
  const params = new URLSearchParams({
    part: 'contentDetails',
    forHandle: cleanHandle,
    key: apiKey
  });
  
  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found for the given handle');
  }

  return {
    channelId: data.items[0].id,
    uploadsPlaylistId: data.items[0].contentDetails.relatedPlaylists.uploads
  };
}

export async function getVideosFromPlaylist(playlistId: string, apiKey: string): Promise<string[]> {
  const params = new URLSearchParams({
    part: 'contentDetails',
    playlistId: playlistId,
    maxResults: '50', // Fetch up to 50 videos at once
    key: apiKey
  });
  
  const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items.map((item: any) => item.contentDetails.videoId);
}

export async function getVideoStats(videoIds: string[], apiKey: string): Promise<YouTubeVideoStats[]> {
  if (videoIds.length === 0) return [];
  
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    id: videoIds.join(','),
    key: apiKey
  });
  
  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items) return [];

  return data.items.map((video: any) => ({
    youtubeId: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: new Date(video.snippet.publishedAt),
    viewCount: parseInt(video.statistics.viewCount || '0', 10),
    duration: video.contentDetails.duration
  }));
}
