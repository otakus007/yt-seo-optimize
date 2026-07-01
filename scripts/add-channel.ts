import * as dotenv from 'dotenv';
import { getChannelBasicStats } from '../src/lib/youtube';
import prisma from '../src/lib/db';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const channelId = args[0];

  if (!channelId) {
    console.error('Usage: pnpm ts-node scripts/add-channel.ts <CHANNEL_ID>');
    process.exit(1);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('Error: YOUTUBE_API_KEY environment variable is not set in .env');
    process.exit(1);
  }

  console.log(`Fetching stats for channel ${channelId}...`);

  try {
    const stats = await getChannelBasicStats(channelId, apiKey);
    
    console.log('Stats fetched successfully:', stats);
    console.log('Saving to local database...');

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

    console.log('✅ Channel saved to database:', savedChannel.title);
  } catch (error) {
    console.error('❌ Failed to add channel:', error instanceof Error ? error.message : String(error));
  } finally {
    await prisma.$disconnect();
  }
}

main();
