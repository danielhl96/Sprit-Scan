import { registerAs } from '@nestjs/config';

/**
 * Central place where all microservice base URLs are read from the
 * environment. The API Gateway uses these URLs to forward REST requests
 * to the individual microservices.
 *
 * Supported microservices (see backend/src/*-microservice):
 *  - auth-microservice
 *  - profile-microservice
 *  - history-microservice
 *  - ai-microservice
 */
export type ServiceName = 'auth' | 'profile' | 'history' | 'ai';

export interface ServiceUrls {
  auth: string;
  profile: string;
  history: string;
  ai: string;
}

export const servicesConfig = registerAs('services', (): ServiceUrls => ({
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
  profile: process.env.PROFILE_SERVICE_URL ?? 'http://localhost:3002',
  history: process.env.HISTORY_SERVICE_URL ?? 'http://localhost:3003',
  ai: process.env.AI_SERVICE_URL ?? 'http://localhost:3004',
}));

export const gatewayConfig = registerAs('gateway', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim()),
  httpTimeout: parseInt(process.env.HTTP_TIMEOUT ?? '5000', 10),
  // Rate limiting: allow `rateLimit` requests per `rateTtl` milliseconds per client (IP).
  rateTtl: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10),
  rateLimit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
}));
