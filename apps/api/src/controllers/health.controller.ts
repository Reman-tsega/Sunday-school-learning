import type { Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/prisma.js';
import { env } from '../config/env.js';
import type { ApiResponse, HealthCheckResponse } from '@eotc/shared';

const SERVER_START_TIME = Date.now();

export async function getHealth(_req: Request, res: Response<ApiResponse<HealthCheckResponse>>): Promise<void> {
  const isDbHealthy = await checkDatabaseHealth();
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START_TIME) / 1000);

  const healthData: HealthCheckResponse = {
    status: isDbHealthy ? 'healthy' : 'degraded',
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    database: isDbHealthy ? 'connected' : 'disconnected',
    environment: env.NODE_ENV,
  };

  const statusCode = isDbHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: isDbHealthy,
    data: healthData,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
