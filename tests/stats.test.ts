/** @jest-environment node */
import { baseline, compareChange, flags, median, yppProgress, type VideoWithData } from '../src/lib/stats';

const day = (offset: number) => new Date(Date.now() - offset * 86400000);
function video(over: Partial<VideoWithData> & { viewsPerDay?: number; days?: number; ctr?: number }): VideoWithData {
  const days = over.days ?? 30, vpd = over.viewsPerDay ?? 100;
  return {
    id: over.id ?? 'v', youtubeId: 'y', title: over.title ?? 'Title', description: over.description ?? 'x'.repeat(200), tags: over.tags ?? '["a"]',
    publishedAt: day(days), viewCount: vpd * days, likeCount: 0, durationSec: over.durationSec ?? 300,
    daily: Array.from({ length: days }, (_, i) => ({ date: day(days - i), views: vpd, estimatedMinutesWatched: vpd * 3, averageViewPercentage: 40, averageViewDuration: 180, subscribersGained: 1, estimatedRevenue: null })),
    studio: over.ctr == null ? [] : [{ rangeStart: day(days), rangeEnd: day(0), impressions: 1000, ctr: over.ctr }],
  };
}

describe('stats', () => {
  it('median', () => { expect(median([3, 1, 2])).toBe(2); expect(median([1, 2, 3, 4])).toBe(2.5); expect(median([])).toBe(0); });

  it('flags low CTR against the channel median and long titles', () => {
    const vids = [video({ id: 'a', ctr: 5 }), video({ id: 'b', ctr: 5 }), video({ id: 'c', ctr: 2, title: 'x'.repeat(80) })];
    const b = baseline(vids);
    expect(b.medianCtr).toBe(5);
    const codes = flags(vids[2], b).map((f) => f.code);
    expect(codes).toContain('low-ctr');
    expect(codes).toContain('title-long');
    expect(flags(vids[0], b).map((f) => f.code)).not.toContain('low-ctr');
  });

  it('compares views/day before and after a change', () => {
    const v = video({ days: 30 });
    v.daily = v.daily.map((d, i) => ({ ...d, views: i < 20 ? 100 : 200 }));
    const applied = v.daily[20].date;
    const c = compareChange(v, applied, 7);
    expect(c.viewsPerDayBefore).toBe(100);
    expect(c.viewsPerDayAfter).toBe(200);
    expect(c.complete).toBe(true);
  });

  it('estimates YPP eta from the last 28 days', () => {
    const p = yppProgress(500, [video({ days: 60, viewsPerDay: 100 })]);
    expect(p.hours).toBeCloseTo((100 * 3 * 60) / 60, 0);
    expect(p.etaDays).toBeGreaterThan(0);
  });
});
