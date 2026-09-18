import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { latestReport, reportToObjects } from '@/lib/analytics';
import { avgViewPct, baseline, channelVideos, compareChange, first7DaysViews, flags, last28Views, latestCtr, revenue } from '@/lib/stats';
import styles from '../../dash.module.css';
import { Badges, ReportTable, Tile, date, money, n, pct } from '../../fmt';
import { Changes, Recommendations } from '../../steps';

export const dynamic = 'force-dynamic';

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await prisma.video.findUnique({ where: { id }, include: { channel: true, daily: { orderBy: { date: 'desc' } }, studio: { orderBy: { rangeEnd: 'desc' } }, recommendations: { where: { status: 'open' }, include: { steps: true } }, changes: { orderBy: { appliedAt: 'desc' } } } });
  if (!v) notFound();
  const all = await channelVideos(v.channelId);
  const b = baseline(all);
  const f = flags(v, b);
  const tags: string[] = v.tags ? JSON.parse(v.tags) : [];
  const changes = v.changes.map((c) => ({ ...c, d7: compareChange(v, c.appliedAt, 7), d14: compareChange(v, c.appliedAt, 14) }));
  const rep = async (k: string) => { const r = await latestReport(v.channelId, v.youtubeId, k); return r ? reportToObjects(r) : undefined; };
  const retention = await rep('retention');

  return (
    <div>
      <Link href={`/channel/${v.channelId}`} className={styles.muted}>← {v.channel.title}</Link>
      <h1>{v.title}</h1>
      <div className={styles.row}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" className={styles.thumb} />}
        <div>
          <div className={styles.muted}>{date(v.publishedAt)} · {Math.round(v.durationSec / 60)} phút · <a href={`https://youtu.be/${v.youtubeId}`} target="_blank">youtu.be/{v.youtubeId}</a> · <a href={`https://studio.youtube.com/video/${v.youtubeId}/edit`} target="_blank">Studio</a></div>
          <div style={{ marginTop: 6 }}><Badges flags={f} /></div>
          <div className={styles.muted} style={{ marginTop: 6 }}>tiêu đề {v.title.length} ký tự · mô tả {v.description?.length ?? 0} ký tự · {tags.length} tag</div>
        </div>
      </div>
      <div className={styles.tiles}>
        <Tile value={n(v.viewCount)} label="Views" />
        <Tile value={`${n(first7DaysViews(v))} / ${n(b.medianFirst7)}`} label="7 ngày đầu / trung vị kênh" />
        <Tile value={n(last28Views(v))} label="Views 28 ngày qua" />
        <Tile value={`${pct(latestCtr(v))} / ${pct(b.medianCtr)}`} label="CTR / trung vị" />
        <Tile value={`${pct(avgViewPct(v), 0)} / ${pct(b.medianAvp, 0)}`} label="% xem TB / trung vị" />
        {v.channel.monetized && <Tile value={money(revenue(v))} label="Doanh thu" />}
      </div>

      <h2>Đề xuất</h2>
      <Recommendations recs={v.recommendations.map((r) => ({ ...r, video: { id: v.id, title: v.title } }))} canApply={v.channel.isOwn && !!v.channel.refreshToken} />

      <h2>Lịch sử thay đổi</h2>
      <Changes changes={changes} />

      <div className={styles.card}><h3>Mô tả</h3><p className={styles.pre}>{v.description}</p><p className={styles.muted}>tag: {tags.join(', ') || '–'}</p></div>

      {v.studio.length > 0 && (
        <div className={styles.card}><h3>Snapshot Studio (lượt hiển thị / CTR)</h3>
          <div className={styles.wrap}><table className={styles.table}><thead><tr><th>Khoảng ngày</th><th className={styles.num}>Lượt hiển thị</th><th className={styles.num}>CTR</th><th className={styles.num}>Views</th><th className={styles.num}>AVD (s)</th></tr></thead>
            <tbody>{v.studio.map((s) => <tr key={s.id}><td>{date(s.rangeStart)} → {date(s.rangeEnd)}</td><td className={styles.num}>{n(s.impressions)}</td><td className={styles.num}>{pct(s.ctr)}</td><td className={styles.num}>{n(s.views)}</td><td className={styles.num}>{n(s.avdSec)}</td></tr>)}</tbody></table></div>
        </div>
      )}

      {retention && (
        <div className={styles.card}><h3>Đường cong giữ chân</h3>
          <div className={styles.wrap}><table className={styles.table}><thead><tr><th>Vị trí</th><th className={styles.num}>Người xem còn lại</th><th className={styles.num}>So với video tương tự</th></tr></thead>
            <tbody>{retention.filter((_, i) => i % 5 === 0).map((r, i) => <tr key={i}><td>{pct(Number(r.elapsedVideoTimeRatio) * 100, 0)}</td><td className={styles.num}>{pct(Number(r.audienceWatchRatio) * 100, 0)}</td><td className={styles.num}>{n(r.relativeRetentionPerformance as number, 2)}</td></tr>)}</tbody></table></div>
        </div>
      )}
      <ReportTable title="Nguồn traffic" rows={await rep('traffic')} />
      <ReportTable title="Từ khóa tìm kiếm" rows={await rep('search-terms')} />
      <ReportTable title="Đề xuất từ" rows={await rep('suggested-from')} />
      <ReportTable title="Quốc gia" rows={await rep('country')} />
      <ReportTable title="Thiết bị" rows={await rep('device')} />
      <ReportTable title="Đã đăng ký vs chưa" rows={await rep('subscribed')} />

      <div className={styles.card}><h3>Theo ngày (60 ngày gần nhất)</h3>
        <div className={styles.wrap}><table className={styles.table}><thead><tr><th>Ngày</th><th className={styles.num}>Views</th><th className={styles.num}>Phút</th><th className={styles.num}>% xem TB</th><th className={styles.num}>Sub +</th><th className={styles.num}>Likes</th>{v.channel.monetized && <th className={styles.num}>Doanh thu</th>}</tr></thead>
          <tbody>{v.daily.slice(0, 60).map((d) => <tr key={d.id}><td>{date(d.date)}</td><td className={styles.num}>{n(d.views)}</td><td className={styles.num}>{n(d.estimatedMinutesWatched)}</td><td className={styles.num}>{pct(d.averageViewPercentage, 0)}</td><td className={styles.num}>{n(d.subscribersGained)}</td><td className={styles.num}>{n(d.likes)}</td>{v.channel.monetized && <td className={styles.num}>{money(d.estimatedRevenue)}</td>}</tr>)}</tbody></table></div>
      </div>
    </div>
  );
}
