import { Router } from 'express';
import {
  handleBatchSync,
  handleSingleAttemptSync,
  handlePullUpdates,
} from '../controllers/sync.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { syncRateLimiter } from '../middlewares/rateLimiter.js';

export const syncRouter: Router = Router();

// Protected with student authentication
syncRouter.use(authenticate);

// Batch synchronization of attempts and reading progress (rate-limited)
syncRouter.post('/batch', syncRateLimiter, handleBatchSync);

// Single idempotent attempt ingestion (rate-limited)
syncRouter.post('/attempts', syncRateLimiter, handleSingleAttemptSync);

// Cursor-based pull endpoint
syncRouter.get('/pull', handlePullUpdates);
