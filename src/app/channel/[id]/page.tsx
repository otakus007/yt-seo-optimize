import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { latestReport, reportToObjects } from '@/lib/analytics';
import Link from 'next/link';
import { avgViewPct, baseline, channelVideos, compareChange, daysAgo, first7DaysViews, flags, last28Views, latestCtr, revenue, yppProgress } from '@/lib/stats';
import styles from '../../dash.module.css';
import { Badges, ReportTable, Tile, date, hoursAgo, money, n, pct } from '../../fmt';
import { Changes, Recommendations } from '../../steps';

export const dynamic = 'force-dynamic';

export default async function ChannelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sort?: string }> }) {
  const { id } = await params; const { sort } = await searchParams;
  const ch = await prisma.channel.findUnique({ where: { id } });
  if (!ch) notFound();
  const videos = await channelVideos(id);
  const b = baseline(videos);
  const h = hoursAgo(ch.lastSyncedAt);
  const since28 = daysAgo(28);
  const d28 = videos.flatMap((v) => v.daily.filter((d) => d.date >= since28));
  const views28 = d28.reduce((a, d) => a + d.views, 0), rev28 = d28.reduce((a, d) => a + (d.estimatedRevenue ?? 0), 0), min28 = d28.reduce((a, d) => a + d.estimatedMinutesWatched, 0);
  const ypp = ch.isOwn && !ch.monetized ? yppProgress(ch.subscriberCount, videos) : null;

  const rows = videos.map((v) => ({ v, f: flags(v, b), f7: first7DaysViews(v), l28: last28Views(v), ctr: latestCtr(v), avp: avgViewPct(v), rev: revenue(v) }));
  const issues = (r: (typeof rows)[number]) => r.f.filter((x) => x.severity !== 'green').length;
  if (sort === 'issues') rows.sort((a, b2) => issues(b2) - issues(a));
  else if (sort === 'views') rows.sort((a, b2) => b2.v.viewCount - a.v.viewCount);
  else if (sort === 'revenue') rows.sort((a, b2) => b2.rev - a.rev);

  const recs = await prisma.recommendation.findMany({ where: { channelId: id, status: 'open' }, include: { steps: true, video: { select: { id: true, title: true } } } });
  const changes = await prisma.change.findMany({ where: { video: { channelId: id } }, orderBy: { appliedAt: 'desc' }, take: 30, include: { video: { select: { id: true, title: true } } } });
  const changeRows = changes.map((c) => { const v = videos.find((x) => x.id === c.videoId)!; return { ...c, d7: compareChange(v, c.appliedAt, 7), d14: compareChange(v, c.appliedAt, 14) }; });
  const bestChanges = changeRows.filter((c) => c.d7.complete && c.d7.viewsPerDayBefore > 0).sort((a, c) => c.d7.viewsPerDayAfter / c.d7.viewsPerDayBefore - a.d7.viewsPerDayAfter / a.d7.viewsPerDayBefore).slice(0, 5);
  const rep = async (k: string) => { const r = await latestReport(id, '', k); return r ? reportToObjects(r) : undefined; };

  return (
    <div>
      <Link href="/" className={styles.muted}>← Các kênh</Link>
      <div className={styles.row}><h1>{ch.title}</h1><span className={styles.muted}>{ch.handle} · {ch.isOwn ? (ch.monetized ? 'đã kiếm tiền' : 'chưa YPP') : 'đối thủ'} · {ch.niche} · {ch.language}</span></div>
      {ch.isOwn && (h == null || h > 24) && <div className={styles.warn}>Dữ liệu cũ (lần đồng bộ gần nhất {h == null ? "chưa bao giờ" : `${h}h trước`}). Đồng bộ từ trang chủ hoặc chạy <code>pnpm sync</code>.</div>}
      {ch.isOwn && b.medianCtr == null && <div className={styles.warn}>Chưa có dữ liệu CTR. Nhập CSV từ Studio ở trang chủ để mở khóa cờ CTR.</div>}

      <div className={styles.tiles}>
        <Tile value={n(ch.subscriberCount)} label="Người đăng ký" />
        <Tile value={n(views28)} label="Views (28 ngày)" />
        {ch.monetized ? <><Tile value={money(rev28)} label="Doanh thu (28 ngày)" /><Tile value={views28 ? money((rev28 / views28) * 1000) : '–'} label="RPM (28 ngày)" /></>
          : <Tile value={n(min28 / 60, 0)} label="Giờ xem (28 ngày)" />}
        <Tile value={n(b.medianFirst7)} label="Trung vị view, 7 ngày đầu" />
        <Tile value={pct(b.medianCtr)} label="Trung vị CTR" />
        <Tile value={pct(b.medianAvp, 0)} label="Trung vị % xem trung bình" />
      </div>
      {ypp && (
        <div className={styles.card}>
          <h3>Tiến độ kiếm tiền {ypp.etaDays != null && <span className={styles.muted}>· ETA ≈ {ypp.etaDays} ngày với tốc độ hiện tại</span>}</h3>
          <div className={styles.muted}>{n(ypp.subscriberCount)} / 1.000 người đăng ký ({n(ypp.subsPerDay, 1)}/ngày)</div><div className={styles.progress}><div style={{ width: `${Math.min(100, ypp.subscriberCount / 10)}%` }} /></div>
          <div className={styles.muted} style={{ marginTop: 8 }}>{n(ypp.hours)} / 4.000 giờ xem trong 365 ngày ({n(ypp.hoursPerDay, 1)}/ngày)</div><div className={styles.progress}><div style={{ width: `${Math.min(100, ypp.hours / 40)}%` }} /></div>
        </div>
      )}

      <h2>Đề xuất đang mở ({recs.length})</h2>
      <Recommendations recs={recs} canApply={ch.isOwn && !!ch.refreshToken} />

      <div className={styles.row}><h2>Video ({videos.length})</h2><span className={styles.muted}>sắp xếp: <Link href="?sort=recent">gần đây</Link> · <Link href="?sort=views">views</Link> · <Link href="?sort=issues">vấn đề</Link>{ch.monetized && <> · <Link href="?sort=revenue">doanh thu</Link></>}</span></div>
      <div className={styles.wrap}><table className={styles.table}>
        <thead><tr><th>Tiêu đề</th><th>Đăng lúc</th><th className={styles.num}>Views</th><th className={styles.num}>7 ngày đầu</th><th className={styles.num}>28 ngày qua</th><th className={styles.num}>CTR</th><th className={styles.num}>% xem TB</th>{ch.monetized && <th className={styles.num}>Doanh thu</th>}<th>Cờ</th></tr></thead>
        <tbody>{rows.map(({ v, f, f7, l28, ctr, avp, rev }) => (
          <tr key={v.id}><td className={styles.text}><Link href={`/video/${v.id}`}>{v.title}</Link></td><td>{date(v.publishedAt)}</td><td className={styles.num}>{n(v.viewCount)}</td><td className={styles.num}>{n(f7)}</td><td className={styles.num}>{n(l28)}</td><td className={styles.num}>{pct(ctr)}</td><td className={styles.num}>{pct(avp, 0)}</td>{ch.monetized && <td className={styles.num}>{money(rev)}</td>}<td><Badges flags={f} /></td></tr>
        ))}</tbody>
      </table></div>

      <h2>Thay đổi hiệu quả nhất</h2>
      <Changes changes={bestChanges} />
      <h2>Tất cả thay đổi</h2>
      <Changes changes={changeRows} />

      <ReportTable title="Nguồn traffic" rows={await rep('traffic')} />
      <ReportTable title="Từ khóa tìm kiếm hàng đầu" rows={await rep('search-terms')} />
      <ReportTable title="Quốc gia hàng đầu" rows={await rep('country')} />
      <ReportTable title="Thiết bị" rows={await rep('device')} />
      <ReportTable title="Đã đăng ký vs chưa" rows={await rep('subscribed')} />
      <ReportTable title="Nhân khẩu học" rows={await rep('demographics')} limit={30} />
    </div>
  );
}
