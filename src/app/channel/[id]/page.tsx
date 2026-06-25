import prisma from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

function getAIAction(video: { title: string; description: string | null; duration: string | null }) {
  const isLong = video.duration && (video.duration.includes('H') || parseInt(video.duration.replace(/[^0-9]/g, '')) > 45);
  const descLength = video.description?.length || 0;
  
  if (isLong && descLength < 200) {
    return { text: "🔴 Missing Watch Next Links", className: styles.badgeRed };
  }
  
  if (video.title.length > 80 && !video.title.includes('?')) {
    return { text: "🟠 Title Lacks Emotional Hook", className: styles.badgeOrange };
  }
  
  if (video.title.startsWith('#ep') || video.title.startsWith('Part')) {
    return { text: "🔴 Poor Title Structure", className: styles.badgeRed };
  }

  return { text: "🟢 SEO Optimized", className: styles.badgeGreen };
}

function parseDuration(durationStr: string | null) {
  if (!durationStr) return 'Unknown';
  return durationStr.replace('PT', '').toLowerCase();
}

export default async function ChannelPage({ params }: { params: { id: string } }) {
  const channel = await prisma.channel.findUnique({
    where: { id: params.id },
    include: {
      videos: {
        orderBy: { viewCount: 'desc' }
      }
    }
  });

  if (!channel) {
    notFound();
  }

  return (
    <div>
      <Link href="/" className={styles.backLink}>← Back to Channels</Link>
      
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{channel.title}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{channel.videos.length} videos analyzed</p>
        </div>
      </div>

      <div className={styles.grid}>
        {channel.videos.map((video) => {
          const badge = getAIAction(video);
          
          return (
            <div key={video.id} className={styles.videoCard}>
              <div className={styles.videoTitle}>{video.title}</div>
              
              <div className={styles.videoStats}>
                <span>👀 {video.viewCount.toLocaleString()} views</span>
                <span>⏱️ {parseDuration(video.duration)}</span>
              </div>
              
              <div className={`${styles.badge} ${badge.className}`}>
                {badge.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
