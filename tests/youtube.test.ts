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
});
