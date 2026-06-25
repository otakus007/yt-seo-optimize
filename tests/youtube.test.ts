/** @jest-environment node */
import { getChannelBasicStats } from '../src/lib/youtube';

describe('YouTube API Client', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch and parse channel stats successfully', async () => {
    const mockResponse = {
      items: [
        {
          id: 'UC123',
          snippet: {
            title: 'Mock Channel',
            description: 'A mock channel',
          },
          statistics: {
            subscriberCount: '500',
            viewCount: '10000',
            videoCount: '10',
          }
        }
      ]
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const stats = await getChannelBasicStats('UC123', 'fake-api-key');

    expect(stats.title).toBe('Mock Channel');
    expect(stats.subscriberCount).toBe(500);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('UC123'));
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('fake-api-key'));
  });

  it('should throw an error if channel is not found', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    await expect(getChannelBasicStats('UC123', 'fake-api-key')).rejects.toThrow('Channel not found');
  });

  it('should throw an error on bad response status', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(getChannelBasicStats('UC123', 'fake-api-key')).rejects.toThrow('YouTube API Error: 403 Forbidden');
  });

  it('should throw a network error if fetch fails', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    await expect(getChannelBasicStats('UC123', 'fake-api-key')).rejects.toThrow('YouTube API Network Error: Network failure');
  });

  it('should resolve channel handle to ID and uploads playlist', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          id: 'UC456',
          contentDetails: { relatedPlaylists: { uploads: 'UU456' } }
        }]
      })
    });

    const result = await require('../src/lib/youtube').getChannelByHandle('@testhandle', 'key');
    expect(result.channelId).toBe('UC456');
    expect(result.uploadsPlaylistId).toBe('UU456');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('forHandle=testhandle'));
  });

  it('should fetch video IDs from playlist', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { contentDetails: { videoId: 'v1' } },
          { contentDetails: { videoId: 'v2' } }
        ]
      })
    });

    const result = await require('../src/lib/youtube').getVideosFromPlaylist('UU456', 'key');
    expect(result).toEqual(['v1', 'v2']);
  });

  it('should fetch video stats', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'v1',
            snippet: { title: 'Vid 1', description: 'Desc', publishedAt: '2023-01-01T00:00:00Z' },
            contentDetails: { duration: 'PT5M' },
            statistics: { viewCount: '100' }
          }
        ]
      })
    });

    const result = await require('../src/lib/youtube').getVideoStats(['v1'], 'key');
    expect(result[0].youtubeId).toBe('v1');
    expect(result[0].viewCount).toBe(100);
    expect(result[0].duration).toBe('PT5M');
  });
});
