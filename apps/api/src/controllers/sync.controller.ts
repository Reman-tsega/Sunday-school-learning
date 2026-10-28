import type { Request, Response, NextFunction } from 'express';
import { syncService } from '../services/sync.service.js';
import {
  BatchSyncRequestSchema,
  SyncQuizAttemptItemSchema,
} from '@eotc/shared';
import type { ApiResponse } from '@eotc/shared';

export async function handleBatchSync(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const validated = BatchSyncRequestSchema.parse(req.body);

    const result = await syncService.syncBatch(userId, validated);

    const response: ApiResponse = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function handleSingleAttemptSync(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const validated = SyncQuizAttemptItemSchema.parse(req.body);

    const result = await syncService.processAttemptItem(userId, validated);

    const response: ApiResponse = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    const statusCode = result.status === 'SYNCED' ? 201 : 200;
    res.status(statusCode).json(response);
  } catch (err) {
    next(err);
  }
}

export async function handlePullUpdates(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const since = req.query.since as string | undefined;

    const data = await syncService.pullUpdates(userId, since);

    const response: ApiResponse = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}
