import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL environment variable is not set');
    }
    client = createClient({ url }) as RedisClientType;
    client.on('error', (err: Error) => console.error('Redis client error:', err));
    await client.connect();
  }
  return client;
}
