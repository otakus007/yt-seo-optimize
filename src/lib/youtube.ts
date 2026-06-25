export async function getChannelBasicStats(channelId: string, apiKey: string) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`;
  const response = await fetch(url);
  
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
