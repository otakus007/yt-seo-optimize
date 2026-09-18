import Link from 'next/link';
import { competitorReport } from '@/lib/competitors';
import styles from '../dash.module.css';
import { date, n } from '../fmt';

export const dynamic = 'force-dynamic';

export default async function CompetitorsPage() {
  const report = await competitorReport();
  return (
    <div>
      <Link href="/" className={styles.muted}>← Channels</Link>
      <h1>Competitors</h1>
      {report.length === 0 && <p className={styles.muted}>Add competitor handles on the home page.</p>}
      <div className={styles.wrap}><table className={styles.table}>
        <thead><tr><th>Channel</th><th className={styles.num}>Subs</th><th className={styles.num}>Videos</th><th className={styles.num}>Median views</th><th className={styles.num}>Views/sub</th><th className={styles.num}>Uploads/wk</th><th className={styles.num}>Median min</th><th className={styles.num}>Title len</th></tr></thead>
        <tbody>{report.map((c) => <tr key={c.id}><td><Link href={`/channel/${c.id}`}>{c.title}</Link></td><td className={styles.num}>{n(c.subscribers)}</td><td className={styles.num}>{c.videos}</td><td className={styles.num}>{n(c.medianViews)}</td><td className={styles.num}>{n(c.viewsPerSub, 2)}</td><td className={styles.num}>{n(c.uploadsPerWeek, 1)}</td><td className={styles.num}>{c.medianDurationMin}</td><td className={styles.num}>{c.medianTitleLength}</td></tr>)}</tbody>
      </table></div>
      {report.map((c) => c.outliers.length > 0 && (
        <div key={c.id} className={styles.card}>
          <h3>{c.title} — outliers (&gt;3× their median)</h3>
          <div className={styles.wrap}><table className={styles.table}><thead><tr><th></th><th>Title</th><th className={styles.num}>Views</th><th className={styles.num}>× median</th><th>Published</th><th className={styles.num}>Min</th></tr></thead>
            <tbody>{c.outliers.map((o) => <tr key={o.youtubeId}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <td>{o.thumbnailUrl && <img src={o.thumbnailUrl} alt="" style={{ width: 96, borderRadius: 4 }} />}</td>
              <td className={styles.text}><a href={`https://youtu.be/${o.youtubeId}`} target="_blank">{o.title}</a></td><td className={styles.num}>{n(o.views)}</td><td className={styles.num}>{o.multiple}</td><td>{date(o.publishedAt)}</td><td className={styles.num}>{Math.round(o.durationSec / 60)}</td></tr>)}</tbody></table></div>
        </div>
      ))}
    </div>
  );
}
