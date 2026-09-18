/** @jest-environment node */
import { getChannelBasicStats, getChannelByHandle, getVideoStats, getVideosFromPlaylist, isoDurationToSec } from '../src/lib/youtube';

const ok = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response;

describe('YouTube Data API client', () => {
  let fetchSpy: jest.SpyInstance;
  beforeEach(() => { fetchSpy = jest.spyOn(global, 'fetch'); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('parses channel stats (BigInt views, uploads playlist)', async () => {
    fetchSpy.mockResolvedValueOnce(ok({ items: [{ id: 'UC123', snippet: { title: 'Mock', description: 'd', customUrl: '@mock' }, contentDetails: { relatedPlaylists: { uploads: 'UU123' } }, statistics: { subscriberCount: '500', viewCount: '3000000000', videoCount: '10' } }] }));
    const s = await getChannelBasicStats('UC123', 'fake-key');
    expect(s).toMatchObject({ youtubeId: 'UC123', title: 'Mock', handle: '@mock', uploadsPlaylistId: 'UU123', subscriberCount: 500, viewCount: BigInt('3000000000') });
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('key=fake-key'));
  });

  it('throws when the channel is missing', async () => {
    fetchSpy.mockResolvedValueOnce(ok({ items: [] }));
    await expect(getChannelBasicStats('UC404', 'k')).rejects.toThrow('Channel not found');
  });

  it('resolves a handle without the @', async () => {
    fetchSpy.mockResolvedValueOnce(ok({ items: [{ id: 'UC456', snippet: { title: 't', description: '' }, contentDetails: { relatedPlaylists: { uploads: 'UU456' } }, statistics: {} }] }));
    const s = await getChannelByHandle('@testhandle', 'k');
    expect(s.uploadsPlaylistId).toBe('UU456');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('forHandle=testhandle'));
  });

  it('pages through playlist items', async () => {
    fetchSpy.mockResolvedValueOnce(ok({ items: [{ contentDetails: { videoId: 'v1' } }], nextPageToken: 'p2' }));
    fetchSpy.mockResolvedValueOnce(ok({ items: [{ contentDetails: { videoId: 'v2' } }] }));
    expect(await getVideosFromPlaylist('UU456', 'k')).toEqual(['v1', 'v2']);
  });

  it('parses video stats incl. duration seconds and best thumbnail', async () => {
    fetchSpy.mockResolvedValueOnce(ok({ items: [{ id: 'v1', snippet: { title: 'Vid', description: 'Desc', publishedAt: '2023-01-01T00:00:00Z', thumbnails: { default: { url: 'd' }, high: { url: 'h' } } }, contentDetails: { duration: 'PT1H5M2S' }, statistics: { viewCount: '100' }, status: { privacyStatus: 'public' } }] }));
    const [v] = await getVideoStats(['v1'], 'k');
    expect(v).toMatchObject({ youtubeId: 'v1', viewCount: 100, durationSec: 3902, thumbnailUrl: 'h', privacyStatus: 'public', tags: null });
  });

  it('converts ISO durations', () => { expect(isoDurationToSec('PT5M')).toBe(300); expect(isoDurationToSec('P1DT1S')).toBe(86401); expect(isoDurationToSec('')).toBe(0); });
});
