import prisma from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type VideoForBadges = {
  title: string;
  description: string | null;
  tags: string | null;
  viewCount: number;
  likeCount: number;
  duration: string | null;
};

type Severity = 'red' | 'orange' | 'green';

function getBadges(video: VideoForBadges): { text: string; severity: Severity }[] {
  const badges: { text: string; severity: Severity }[] = [];

  const isLong = video.duration && (video.duration.includes('H') || parseInt(video.duration.replace(/[^0-9]/g, '')) > 45);
  const descLength = video.description?.length || 0;
  
  if (descLength === 0) {
    badges.push({ text: "Empty Description", severity: 'red' });
  } else if (isLong && descLength < 150) {
    badges.push({ text: "Missing Timestamps", severity: 'orange' });
  }

  if (video.title.includes('#p') || video.title.includes('-chap') || video.title.includes('#ep')) {
    badges.push({ text: "Spammy Chapters", severity: 'red' });
  }
  
  if (video.title.includes('Manwha') || video.title.includes('Ronmantic')) {
    badges.push({ text: "Misspelled Keyword", severity: 'red' });
  }

  if (video.title.length > 70) {
    badges.push({ text: "Title Too Long", severity: 'orange' });
  }

  if (video.title.includes('Reup:')) {
    badges.push({ text: "Duplicate Content", severity: 'red' });
  }

  if (!video.tags || video.tags.trim().length === 0) {
    badges.push({ text: 'No Tags', severity: 'red' });
  }

  if (video.viewCount > 0 && video.likeCount / video.viewCount > 0.038) {
    badges.push({ text: 'High Engagement', severity: 'green' });
  }

  const hasIssues = badges.some(b => b.severity === 'red' || b.severity === 'orange');
  if (!hasIssues) {
    badges.push({ text: 'SEO Good', severity: 'green' });
  }

  return badges;
}

function badgeClass(severity: Severity): string {
  if (severity === 'red') return styles.badgeRed;
  if (severity === 'orange') return styles.badgeOrange;
  return styles.badgeGreen;
}

function countIssues(video: VideoForBadges): number {
  return getBadges(video).filter((b) => b.severity === 'red' || b.severity === 'orange').length;
}

type QuickWin = {
  category: string;
  finding: string;
  recommendation: string;
  example: string;
};

function readQuickWins(channelYoutubeId: string): QuickWin[] {
  try {
    const filePath = join(process.cwd(), '_workspace', '03_seo_recommendations.json');
    if (!existsSync(filePath)) return [];
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (data.channelId !== channelYoutubeId) return [];
    if (!Array.isArray(data.quickWins)) return [];
    return data.quickWins.slice(0, 3);
  } catch {
    return [];
  }
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { id } = await params;
  const { sort } = await searchParams;

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      videos: {
        orderBy: { viewCount: 'desc' },
      },
    },
  });

  if (!channel) {
    notFound();
  }

  const videos = channel.videos;
  const videoCount = videos.length;

  // Stats
  const viewCounts = videos.map((v) => v.viewCount);
  const totalViews = viewCounts.reduce((a, b) => a + b, 0);
  const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;

  const sortedViews = [...viewCounts].sort((a, b) => a - b);
  let medianViews = 0;
  if (videoCount > 0) {
    const mid = Math.floor(videoCount / 2);
    medianViews =
      videoCount % 2 === 0
        ? Math.round((sortedViews[mid - 1] + sortedViews[mid]) / 2)
        : sortedViews[mid];
  }

  const totalLikes = videos.reduce((a, v) => a + v.likeCount, 0);
  const likeRatio = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;

  // SEO health
  const noTags = videos.filter((v) => !v.tags || v.tags.trim().length === 0).length;
  const noDescriptions = videos.filter((v) => !v.description || v.description.length < 50).length;
  const titlesTooLong = videos.filter((v) => v.title.length > 70).length;

  // Quick wins
  const quickWins = readQuickWins(channel.youtubeId);

  // Sorting
  const sortByIssues = sort === 'issues';
  const displayVideos = sortByIssues
    ? [...videos].sort((a, b) => countIssues(b) - countIssues(a))
    : videos;

  return (
    <div>
      <Link href="/" className={styles.backLink}>← Back to Channels</Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{channel.title}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{videoCount} videos analyzed</p>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statTile}>
          <div className={styles.statValue}>{avgViews.toLocaleString()}</div>
          <div className={styles.statLabel}>Avg Views</div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statValue}>{medianViews.toLocaleString()}</div>
          <div className={styles.statLabel}>Median Views</div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statValue}>{likeRatio.toFixed(1)}%</div>
          <div className={styles.statLabel}>Like Ratio</div>
        </div>
        <div className={styles.statTile}>
          <div className={styles.statValue}>{videoCount}</div>
          <div className={styles.statLabel}>Videos Analyzed</div>
        </div>
      </div>

      <div className={styles.healthBar}>
        <span className={`${styles.healthCount} ${styles.healthCountRed}`}>{noTags} no tags</span>
        <span className={`${styles.healthCount} ${styles.healthCountRed}`}>
          {noDescriptions} no descriptions
        </span>
        <span className={`${styles.healthCount} ${styles.healthCountOrange}`}>
          {titlesTooLong} titles too long
        </span>
      </div>

      {quickWins.length > 0 && (
        <div className={styles.quickWins}>
          <div className={styles.sectionHeader}>
            <h2>Quick Wins</h2>
            <Link href={`/channel/${id}/analysis`} className={styles.analysisLink}>
              View Full Analysis →
            </Link>
          </div>
          {quickWins.map((win, i) => (
            <div key={i} className={styles.quickWinItem}>
              <span className={styles.quickWinCategory}>{win.category}</span>
              <div className={styles.quickWinText}>{win.recommendation}</div>
              <div className={styles.quickWinExample}>{win.example}</div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h2>Videos</h2>
        {quickWins.length === 0 && (
          <Link href={`/channel/${id}/analysis`} className={styles.analysisLink}>
            View Full Analysis →
          </Link>
        )}
      </div>

      <div className={styles.sortBar}>
        <Link
          href={`/channel/${id}`}
          className={`${styles.sortBtn} ${!sortByIssues ? styles.sortBtnActive : ''}`}
        >
          Most Views
        </Link>
        <Link
          href={`/channel/${id}?sort=issues`}
          className={`${styles.sortBtn} ${sortByIssues ? styles.sortBtnActive : ''}`}
        >
          Most Issues
        </Link>
      </div>

      <div className={styles.grid}>
        {displayVideos.map((video) => {
          const badges = getBadges(video);

          return (
            <div key={video.id} className={styles.videoCard}>
              <div className={styles.videoTitle}>{video.title}</div>

              <div className={styles.videoStats}>
                <span>👀 {video.viewCount.toLocaleString()} views</span>
                <span>👍 {video.likeCount.toLocaleString()}</span>
              </div>

              <div className={styles.badges}>
                {badges.map((badge, i) => (
                  <span key={i} className={`${styles.badgeSmall} ${badgeClass(badge.severity)}`}>
                    {badge.text}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
