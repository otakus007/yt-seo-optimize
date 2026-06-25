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
