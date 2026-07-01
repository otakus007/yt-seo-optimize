import * as dotenv from 'dotenv';
import { 
  getChannelByHandle, 
  getChannelBasicStats, 
  getVideosFromPlaylist, 
  getVideoStats 
} from '../src/lib/youtube';
import prisma from '../src/lib/db';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const handle = args[0];

  if (!handle) {
    console.error('Usage: pnpm ts-node scripts/sync-videos.ts <@handle>');
    process.exit(1);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('Error: YOUTUBE_API_KEY is not set in .env');
    process.exit(1);
  }

  try {
    console.log(`[1/4] Resolving handle ${handle}...`);
    const { channelId, uploadsPlaylistId } = await getChannelByHandle(handle, apiKey);
    
    console.log(`[2/4] Fetching basic stats for channel ${channelId}...`);
    const stats = await getChannelBasicStats(channelId, apiKey);

    const savedChannel = await prisma.channel.upsert({
      where: { youtubeId: stats.youtubeId },
      update: {
        title: stats.title,
        description: stats.description,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
      },
      create: {
        youtubeId: stats.youtubeId,
        title: stats.title,
        description: stats.description,
        subscriberCount: stats.subscriberCount,
        viewCount: stats.viewCount,
        videoCount: stats.videoCount,
      }
    });

    console.log(`[3/4] Fetching videos from uploads playlist ${uploadsPlaylistId}...`);
    const videoIds = await getVideosFromPlaylist(uploadsPlaylistId, apiKey);
    
    if (videoIds.length === 0) {
      console.log('No videos found.');
      return;
    }

    console.log(`[4/4] Fetching stats and saving ${videoIds.length} videos...`);
    const videosStats = await getVideoStats(videoIds, apiKey);

    let savedCount = 0;
    for (const video of videosStats) {
      await prisma.video.upsert({
        where: { youtubeId: video.youtubeId },
        update: {
          title: video.title,
          description: video.description,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          tags: video.tags,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
        },
        create: {
          youtubeId: video.youtubeId,
          title: video.title,
          description: video.description,
          publishedAt: video.publishedAt,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          tags: video.tags,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          channelId: savedChannel.id,
        }
      });
      savedCount++;
    }

    console.log(`✅ Success! Synced channel "${savedChannel.title}" and ${savedCount} videos to the database.`);
  } catch (error) {
    console.error('❌ Sync failed:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

main();
