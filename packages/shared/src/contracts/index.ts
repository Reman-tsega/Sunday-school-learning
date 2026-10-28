import type { UserProfile } from '../types/index.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  timestamp: string;
  version: string;
  database: 'connected' | 'disconnected';
  environment: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AuthResponseData {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface BatchSyncResultItem {
  clientAttemptUuid: string;
  serverAttemptId: string;
  status: 'SYNCED' | 'DUPLICATE' | 'REJECTED';
  validatedScore: number;
  passed: boolean;
  message?: string;
}

export interface BatchSyncResponseData {
  syncedCount: number;
  failedCount: number;
  results: BatchSyncResultItem[];
  progressSynced: number;
}
