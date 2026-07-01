import prisma from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type QuickWin = {
  category: string;
  finding: string;
  recommendation: string;
  example: string;
};

type StrategicChange = {
  category: string;
  finding: string;
  recommendation: string;
  example: string;
};

type TitleToRewrite = {
  youtubeId: string;
  currentTitle: string;
  suggestedTitle: string;
  reason: string;
};

type SeoRecommendations = {
  channelId: string;
  quickWins?: QuickWin[];
  strategicChanges?: StrategicChange[];
  titlesToRewrite?: TitleToRewrite[];
};

function readRecommendations(channelYoutubeId: string): SeoRecommendations | null {
  try {
    const filePath = join(process.cwd(), '_workspace', '03_seo_recommendations.json');
    if (!existsSync(filePath)) return null;
    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as SeoRecommendations;
    if (data.channelId !== channelYoutubeId) return null;
    return data;
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function likePct(viewCount: number, likeCount: number): string {
  if (viewCount <= 0) return '0.0%';
  return ((likeCount / viewCount) * 100).toFixed(1) + '%';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
  const topVideos = videos.slice(0, 10);
  const bottomVideos = [...videos].slice(-10).reverse();

  // Upload pattern by day of week
  const dayCounts = new Array(7).fill(0) as number[];
  for (const v of videos) {
    dayCounts[new Date(v.publishedAt).getDay()]++;
  }
  const uploadPattern = DAY_NAMES.map((name, i) => ({ name, count: dayCounts[i] })).sort(
    (a, b) => b.count - a.count
  );

  const recs = readRecommendations(channel.youtubeId);

  const renderTable = (rows: typeof videos) => (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.th}>#</th>
          <th className={styles.th}>Title</th>
          <th className={styles.th}>Views</th>
          <th className={styles.th}>Likes</th>
          <th className={styles.th}>Like %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((v, i) => (
          <tr key={v.id}>
            <td className={`${styles.td} ${styles.rank}`}>{i + 1}</td>
            <td className={styles.td}>{truncate(v.title, 50)}</td>
            <td className={`${styles.td} ${styles.viewCount}`}>{v.viewCount.toLocaleString()}</td>
            <td className={styles.td}>{v.likeCount.toLocaleString()}</td>
            <td className={styles.td}>{likePct(v.viewCount, v.likeCount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className={styles.container}>
      <Link href={`/channel/${id}`} className={styles.backLink}>
        ← Back to Channel
      </Link>

      <h1 className={styles.title}>{channel.title}</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Performance Analysis</h2>
        <h3>Top 10 Videos</h3>
        {renderTable(topVideos)}
        <h3 style={{ marginTop: 24 }}>Bottom 10 Videos</h3>
        {renderTable(bottomVideos)}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Upload Pattern</h2>
        {uploadPattern.map((d) => (
          <div key={d.name} className={styles.dayRow}>
            <span>{d.name}</span>
            <span>{d.count} uploads</span>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>SEO Recommendations</h2>
        {!recs ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            No analysis data available for this channel.
          </p>
        ) : (
          <>
            {recs.quickWins && recs.quickWins.length > 0 && (
              <>
                <h3>Quick Wins</h3>
                {recs.quickWins.map((win, i) => (
                  <div key={i} className={styles.recCard}>
                    <span className={styles.recCategory}>{win.category}</span>
                    <div className={styles.recFinding}>{win.finding}</div>
                    <div className={styles.recRecommendation}>{win.recommendation}</div>
                    <div className={styles.recExample}>{win.example}</div>
                  </div>
                ))}
              </>
            )}

            {recs.strategicChanges && recs.strategicChanges.length > 0 && (
              <>
                <h3 style={{ marginTop: 24 }}>Strategic Changes</h3>
                {recs.strategicChanges.map((change, i) => (
                  <div key={i} className={styles.recCard}>
                    <span className={styles.recCategory}>{change.category}</span>
                    <div className={styles.recFinding}>{change.finding}</div>
                    <div className={styles.recRecommendation}>{change.recommendation}</div>
                    <div className={styles.recExample}>{change.example}</div>
                  </div>
                ))}
              </>
            )}

            {recs.titlesToRewrite && recs.titlesToRewrite.length > 0 && (
              <>
                <h3 style={{ marginTop: 24 }}>Titles to Rewrite</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Current</th>
                      <th className={styles.th}>Suggested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recs.titlesToRewrite.map((t) => (
                      <tr key={t.youtubeId}>
                        <td className={styles.td}>{t.currentTitle}</td>
                        <td className={styles.td}>{t.suggestedTitle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
