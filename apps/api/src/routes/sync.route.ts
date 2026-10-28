import { Router } from 'express';
import {
  handleBatchSync,
  handleSingleAttemptSync,
  handlePullUpdates,
} from '../controllers/sync.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export const syncRouter: Router = Router();

// Protected with student authentication
syncRouter.use(authenticate);

// Batch synchronization of attempts and reading progress
syncRouter.post('/batch', handleBatchSync);

// Single idempotent attempt ingestion
syncRouter.post('/attempts', handleSingleAttemptSync);

// Cursor-based pull endpoint
syncRouter.get('/pull', handlePullUpdates);
