import { Request, Response, NextFunction } from 'express';
import { parishService } from '../services/parish.service.js';
import { CreateParishSchema, UpdateParishSchema, ParishQuerySchema } from '@eotc/shared';

export async function getParishes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = ParishQuerySchema.parse(req.query);
    const result = await parishService.listParishes(query);
    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getParishById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parish = await parishService.getParishById(req.params.id as string);
    res.json({
      status: 'success',
      data: parish,
    });
  } catch (error) {
    next(error);
  }
}

export async function createParish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = CreateParishSchema.parse(req.body);
    const parish = await parishService.createOrFindParish(body, (req as any).user?.id);
    res.status(201).json({
      status: 'success',
      data: parish,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyParish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { isVerified } = req.body;
    const parish = await parishService.verifyParish(req.params.id as string, Boolean(isVerified));
    res.json({
      status: 'success',
      data: parish,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateParish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = UpdateParishSchema.parse(req.body);
    const parish = await parishService.updateParish(req.params.id as string, body);
    res.json({
      status: 'success',
      data: parish,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteParish(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await parishService.deleteParish(req.params.id as string);
    res.json({
      status: 'success',
      message: 'Sunday School deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
