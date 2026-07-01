import * as dotenv from 'dotenv';
import prisma from '../src/lib/db';

dotenv.config();

function parseDurationSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return (+(match?.[1] || 0)) * 3600 + (+(match?.[2] || 0)) * 60 + (+(match?.[3] || 0));
}

async function main() {
  const args = process.argv.slice(2);
  const channelId = args[0];

  if (!channelId) {
    console.error('Usage: pnpm tsx scripts/analyze-channel.ts <CHANNEL_YOUTUBE_ID>');
    process.exit(1);
  }

  const channel = await prisma.channel.findUnique({
    where: { youtubeId: channelId },
    include: { videos: { orderBy: { viewCount: 'desc' } } },
  });

  if (!channel) {
    console.error(`Channel ${channelId} not found in DB. Run sync-videos.ts first.`);
    process.exit(1);
  }

  const videos = channel.videos;
  if (videos.length === 0) {
    console.log('No videos found for this channel.');
    process.exit(0);
  }

  // View stats
  const views = videos.map(v => v.viewCount);
  const avg = views.reduce((a, b) => a + b, 0) / views.length;
  const sorted = [...views].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const stdDev = Math.sqrt(views.map(v => (v - avg) ** 2).reduce((a, b) => a + b, 0) / views.length);

  // Upload frequency
  const dates = videos.map(v => v.publishedAt).sort((a, b) => a.getTime() - b.getTime());
  const spanDays = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24);
  const perMonth = spanDays > 0 ? (videos.length / spanDays) * 30 : 0;

  // Best upload days
  const dayCounts: Record<string, number> = {};
  for (const v of videos) {
    const day = new Date(v.publishedAt).toLocaleDateString('en', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  const bestDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);

  // Title length correlation (top 20% vs bottom 20%)
  const slice = Math.max(1, Math.floor(videos.length * 0.2));
  const topVideos = videos.slice(0, slice);
  const bottomVideos = videos.slice(-slice);
  const topAvgTitle = topVideos.reduce((a, v) => a + v.title.length, 0) / topVideos.length;
  const bottomAvgTitle = bottomVideos.reduce((a, v) => a + v.title.length, 0) / bottomVideos.length;

  // Duration stats
  const durations = videos.filter(v => v.duration).map(v => parseDurationSeconds(v.duration!));
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // Engagement (if available)
  const hasLikes = videos.some(v => v.likeCount > 0);
  const avgLikeRatio = hasLikes
    ? videos.filter(v => v.viewCount > 0).reduce((a, v) => a + v.likeCount / v.viewCount, 0) / videos.length
    : null;

  console.log(`\n📊 Channel Analysis: ${channel.title}`);
  console.log(`   Videos analyzed: ${videos.length}`);
  if (videos.length < 10) console.log('   ⚠️  Small sample (<10 videos) — patterns may not be reliable');
  console.log(`\n📈 View Statistics`);
  console.log(`   Average:  ${Math.round(avg).toLocaleString()}`);
  console.log(`   Median:   ${median.toLocaleString()}`);
  console.log(`   Std Dev:  ${Math.round(stdDev).toLocaleString()}`);
  console.log(`\n🏆 Top 5 Videos`);
  videos.slice(0, 5).forEach((v, i) => console.log(`   ${i + 1}. ${v.title} — ${v.viewCount.toLocaleString()} views`));
  console.log(`\n📉 Bottom 5 Videos`);
  videos.slice(-5).reverse().forEach((v, i) => console.log(`   ${i + 1}. ${v.title} — ${v.viewCount.toLocaleString()} views`));
  console.log(`\n📅 Upload Pattern`);
  console.log(`   Frequency: ${perMonth.toFixed(1)} videos/month`);
  console.log(`   Best days: ${bestDays.join(', ')}`);
  console.log(`\n📝 Title Length`);
  console.log(`   Top 20% avg: ${topAvgTitle.toFixed(0)} chars`);
  console.log(`   Bottom 20% avg: ${bottomAvgTitle.toFixed(0)} chars`);
  console.log(`\n⏱️  Duration`);
  console.log(`   Average: ${Math.floor(avgDuration / 60)}m ${Math.round(avgDuration % 60)}s`);
  if (avgLikeRatio !== null) {
    console.log(`\n❤️  Engagement`);
    console.log(`   Avg like/view ratio: ${(avgLikeRatio * 100).toFixed(2)}%`);
  }
}

main().finally(() => prisma.$disconnect());
