import { createClient } from 'redis';

const redisUrl =
  process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://localhost:6379';

export const redisClient = createClient({ url: redisUrl });
redisClient.on('error', (err) =>
  console.error('Redis Client Error:', err.message),
);
redisClient
  .connect()
  .catch((err) => console.error('Redis connection failed:', err.message));
