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

/** Outcome of a link code carried in the Mini App start parameter */
export type TelegramLinkStatus = 'LINKED' | 'TELEGRAM_LINK_INVALID' | 'TELEGRAM_ALREADY_LINKED' | 'TELEGRAM_IN_USE';

export interface TelegramAuthResponseData extends AuthResponseData {
  /** True on the first ever Mini App sign-in, so the client can send the student to complete their profile */
  isNewUser: boolean;
  linkStatus?: TelegramLinkStatus;
}

export interface TelegramLinkCodeData {
  /** Opens the Mini App and links it to the signed-in web account */
  deepLink: string;
  expiresAt: string;
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
