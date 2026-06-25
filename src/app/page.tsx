import prisma from '@/lib/db';
import Link from 'next/link';
import styles from './page.module.css';

// Force dynamic rendering if desired, but since it's a local DB, default is fine.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div className={styles.header}>
        <h1>Your Channels</h1>
        <p>Select a channel to view AI SEO insights and video performance.</p>
      </div>

      <div className={styles.grid}>
        {channels.map((channel) => (
          <Link key={channel.id} href={`/channel/${channel.id}`} className={styles.card}>
            <div className={styles.cardTitle}>{channel.title}</div>
            <div className={styles.cardStats}>
              <div className={styles.statItem}>
                <span>Subscribers</span>
                <span className={styles.statValue}>{channel.subscriberCount.toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span>Total Views</span>
                <span className={styles.statValue}>{channel.viewCount.toLocaleString()}</span>
              </div>
              <div className={styles.statItem}>
                <span>Videos</span>
                <span className={styles.statValue}>{channel.videoCount.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
