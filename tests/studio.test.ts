/** @jest-environment node */
import { parseStudioCsv } from '../src/lib/studio';

const csv = `﻿Content,Video title,Video publish time,Impressions,Impressions click-through rate (%),Views,Average view duration
Total,,,"12,000",4.5,900,0:03:10
abcdefghijk,"She Regressed, Then Ruined Him",Sep 1 2026,8000,5.2,600,0:04:01
zzzzzzzzzzz,Another,Sep 2 2026,4000,3.1,300,0:02:00
`;

describe('Studio CSV', () => {
  it('parses per-video impressions and CTR, skipping the Total row', () => {
    const rows = parseStudioCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ youtubeId: 'abcdefghijk', impressions: 8000, ctr: 5.2, views: 600, avdSec: 241 });
  });
  it('fails loudly on a CSV without impressions', () => {
    expect(() => parseStudioCsv('Content,Views\nabcdefghijk,5\n')).toThrow(/Impressions/);
  });
});
