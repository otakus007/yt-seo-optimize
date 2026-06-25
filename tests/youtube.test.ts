/** @jest-environment node */
import { getChannelBasicStats } from '../src/lib/youtube';

global.fetch = jest.fn();

describe('YouTube API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const stats = await getChannelBasicStats('UC123', 'fake-api-key');

    expect(stats.title).toBe('Mock Channel');
    expect(stats.subscriberCount).toBe(500);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('UC123'));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('fake-api-key'));
  });

  it('should throw an error if channel is not found', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    await expect(getChannelBasicStats('UC123', 'fake-api-key')).rejects.toThrow('Channel not found');
  });

  it('should throw an error on bad response status', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(getChannelBasicStats('UC123', 'fake-api-key')).rejects.toThrow('YouTube API Error: 403 Forbidden');
  });
});
