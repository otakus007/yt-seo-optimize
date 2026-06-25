/** @jest-environment node */
import prisma from '@/lib/db';

describe('Database Client', () => {
  beforeAll(async () => {
    await prisma.channel.deleteMany();
  });

  afterEach(async () => {
    await prisma.channel.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create and retrieve a channel', async () => {
    const channel = await prisma.channel.create({
      data: {
        youtubeId: 'UC12345',
        title: 'Test Channel',
        subscriberCount: 1000,
      }
    });

    expect(channel).toBeDefined();
    expect(channel.youtubeId).toBe('UC12345');

    const retrieved = await prisma.channel.findUnique({
      where: { youtubeId: 'UC12345' }
    });
    
    expect(retrieved?.title).toBe('Test Channel');
  });
});
