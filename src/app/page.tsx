import { existsSync, readFileSync } from 'fs';
import Link from 'next/link';
import prisma from '@/lib/db';
import styles from './dash.module.css';
import { addCompetitorAction, importStudioAction, saveGoogleCredsAction, setChannelFlagsAction, startSync } from './actions';
import { date, hoursAgo, n } from './fmt';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const channels = await prisma.channel.findMany({ orderBy: [{ isOwn: 'desc' }, { createdAt: 'asc' }], include: { _count: { select: { videos: true, recommendations: { where: { status: 'open' } } } } } });
  const drafts = await prisma.draft.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { video: { select: { id: true, title: true } } } });
  const log = existsSync('data/sync.log') ? readFileSync('data/sync.log', 'utf8').trim().split('\n').slice(-8).join('\n') : '';
  const own = channels.filter((c) => c.isOwn), comp = channels.filter((c) => !c.isOwn);
  const hasCreds = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

  return (
    <div>
      <div className={styles.row}>
        <h1>Các kênh</h1>
        <a className={styles.btn} href="/api/oauth/start" style={{ marginLeft: 'auto' }}>Kết nối kênh YouTube</a>
        <form action={startSync}><button className={`${styles.btn} ${styles.btnGhost}`}>Đồng bộ tất cả</button></form>
        <Link className={`${styles.btn} ${styles.btnGhost}`} href="/competitors">Đối thủ</Link>
      </div>
      {own.length === 0 && (
        <div className={styles.card}>
          <h3>Thiết lập: OAuth client của Google (một lần)</h3>
          {hasCreds && <p className={styles.warn}>Đã lưu key. Bấm &quot;Kết nối kênh YouTube&quot; trong profile trình duyệt đã đăng nhập tài khoản Google của kênh. Dán sai? Dán lại bên dưới.</p>}
          <ol className={styles.muted}>
            <li><a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noreferrer">APIs &amp; Services → Library</a>: bật <b>YouTube Data API v3</b> và <b>YouTube Analytics API</b>.</li>
            <li><a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noreferrer">OAuth consent screen</a>: chọn External, thêm email Google của từng kênh vào test user, rồi bấm <b>Publish app</b> (không làm thì refresh token hết hạn sau 7 ngày).</li>
            <li><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Credentials</a> → Create OAuth client ID → Web application → Authorized redirect URI: <code>http://localhost:3000/api/oauth/callback</code>{process.env.PUBLIC_ORIGIN ? <> và <code>{process.env.PUBLIC_ORIGIN}/api/oauth/callback</code></> : null}.</li>
          </ol>
          <form action={saveGoogleCredsAction} className={styles.row}>
            <input className={styles.input} name="clientId" placeholder="Client ID" required style={{ minWidth: 320 }} />
            <input className={styles.input} name="clientSecret" placeholder="Client secret (GOCSPX-…)" type="password" required />
            <button className={styles.btn}>Lưu vào .env</button>
          </form>
        </div>
      )}

      <h2>Kênh của tôi</h2>
      {own.map((c) => {
        const h = hoursAgo(c.lastSyncedAt);
        return (
          <div key={c.id} className={styles.card}>
            <div className={styles.row}>
              <Link href={`/channel/${c.id}`}><strong>{c.title}</strong></Link>
              <span className={styles.muted}>{c.handle} · {n(c.subscriberCount)} sub · {c._count.videos} video · {c._count.recommendations} đề xuất mở</span>
              <span className={h == null || h > 24 ? `${styles.badge} ${styles.orange}` : styles.muted} style={{ marginLeft: 'auto' }}>đã đồng bộ {h == null ? "chưa bao giờ" : `${h}h trước`}</span>
              <form action={startSync}><input type="hidden" name="channel" value={c.id} /><button className={`${styles.btn} ${styles.btnGhost}`}>Đồng bộ</button></form>
            </div>
            <form action={setChannelFlagsAction} className={styles.row} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={c.id} />
              <label className={styles.muted}><input type="checkbox" name="monetized" defaultChecked={c.monetized} /> đã kiếm tiền (YPP)</label>
              <label className={styles.muted}>thể loại <input className={styles.input} name="niche" defaultValue={c.niche} /></label>
              <label className={styles.muted}>ngôn ngữ <input className={styles.input} name="language" defaultValue={c.language} size={3} /></label>
              <button className={`${styles.btn} ${styles.btnGhost}`}>Lưu</button>
            </form>
          </div>
        );
      })}

      <h2>Đối thủ</h2>
      <div className={styles.card}>
        <form action={addCompetitorAction} className={styles.row}><input className={styles.input} name="handle" placeholder="@handle" required /><button className={styles.btn}>Thêm &amp; đồng bộ</button></form>
        <div className={styles.wrap}><table className={styles.table}><thead><tr><th>Kênh</th><th className={styles.num}>Sub</th><th className={styles.num}>Video</th><th>Đồng bộ</th></tr></thead>
          <tbody>{comp.map((c) => <tr key={c.id}><td><Link href={`/channel/${c.id}`}>{c.title}</Link> <span className={styles.muted}>{c.handle}</span></td><td className={styles.num}>{n(c.subscriberCount)}</td><td className={styles.num}>{c._count.videos}</td><td>{date(c.lastSyncedAt)}</td></tr>)}</tbody></table></div>
      </div>

      <h2>Nhập CSV từ Studio (lượt hiển thị + CTR)</h2>
      <div className={styles.card}>
        <p className={styles.muted}>Studio → Analytics → Content → See more/Advanced mode → chọn khoảng ngày → Export → CSV. Impressions/CTR chỉ có ở đây.</p>
        <form action={importStudioAction} className={styles.row}>
          <input type="file" name="file" accept=".csv,text/csv" className={styles.input} required />
          <label className={styles.muted}>từ <input type="date" name="from" className={styles.input} required /></label>
          <label className={styles.muted}>đến <input type="date" name="to" className={styles.input} required /></label>
          <button className={styles.btn}>Nhập</button>
        </form>
      </div>

      <h2>Bản nháp</h2>
      <div className={styles.card}>
        {drafts.length === 0 ? <p className={styles.muted}>Chưa có bản nháp. Chạy skill yt-new-video trước khi đăng video tiếp theo.</p> : (
          <div className={styles.wrap}><table className={styles.table}><thead><tr><th>Tạo lúc</th><th>Tiêu đề đã chọn</th><th>Video liên kết</th></tr></thead>
            <tbody>{drafts.map((d) => <tr key={d.id}><td>{date(d.createdAt)}</td><td className={styles.text}>{d.chosenTitle ?? JSON.parse(d.output).titles?.[0]}</td><td className={styles.text}>{d.video ? <Link href={`/video/${d.video.id}`}>{d.video.title}</Link> : <span className={styles.muted}>chưa liên kết (scripts/draft.ts link)</span>}</td></tr>)}</tbody></table></div>
        )}
      </div>

      {log && <div className={styles.card}><h3>Log đồng bộ gần nhất</h3><pre className={styles.pre} style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log}</pre></div>}
    </div>
  );
}
