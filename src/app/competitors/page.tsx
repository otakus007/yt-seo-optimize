import Link from 'next/link';
import { competitorReport } from '@/lib/competitors';
import styles from '../dash.module.css';
import { date, n } from '../fmt';

export const dynamic = 'force-dynamic';

export default async function CompetitorsPage() {
  const report = await competitorReport();
  return (
    <div>
      <Link href="/" className={styles.muted}>← Các kênh</Link>
      <h1>Đối thủ</h1>
      {report.length === 0 && <p className={styles.muted}>Thêm handle đối thủ ở trang chủ.</p>}
      <div className={styles.wrap}><table className={styles.table}>
        <thead><tr><th>Kênh</th><th className={styles.num}>Sub</th><th className={styles.num}>Video</th><th className={styles.num}>Trung vị views</th><th className={styles.num}>Views/sub</th><th className={styles.num}>Đăng/tuần</th><th className={styles.num}>Trung vị phút</th><th className={styles.num}>Độ dài tiêu đề</th></tr></thead>
        <tbody>{report.map((c) => <tr key={c.id}><td><Link href={`/channel/${c.id}`}>{c.title}</Link></td><td className={styles.num}>{n(c.subscribers)}</td><td className={styles.num}>{c.videos}</td><td className={styles.num}>{n(c.medianViews)}</td><td className={styles.num}>{n(c.viewsPerSub, 2)}</td><td className={styles.num}>{n(c.uploadsPerWeek, 1)}</td><td className={styles.num}>{c.medianDurationMin}</td><td className={styles.num}>{c.medianTitleLength}</td></tr>)}</tbody>
      </table></div>
      {report.map((c) => c.outliers.length > 0 && (
        <div key={c.id} className={styles.card}>
          <h3>{c.title} — video nổi bật (&gt;3× trung vị)</h3>
          <div className={styles.wrap}><table className={styles.table}><thead><tr><th></th><th>Tiêu đề</th><th className={styles.num}>Views</th><th className={styles.num}>× trung vị</th><th>Đăng lúc</th><th className={styles.num}>Phút</th></tr></thead>
            <tbody>{c.outliers.map((o) => <tr key={o.youtubeId}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <td>{o.thumbnailUrl && <img src={o.thumbnailUrl} alt="" style={{ width: 96, borderRadius: 4 }} />}</td>
              <td className={styles.text}><a href={`https://youtu.be/${o.youtubeId}`} target="_blank">{o.title}</a></td><td className={styles.num}>{n(o.views)}</td><td className={styles.num}>{o.multiple}</td><td>{date(o.publishedAt)}</td><td className={styles.num}>{Math.round(o.durationSec / 60)}</td></tr>)}</tbody></table></div>
        </div>
      ))}
    </div>
  );
}
