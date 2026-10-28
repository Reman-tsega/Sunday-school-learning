import { Request, Response } from 'express';
import {
  CreateSupportTicketSchema,
  CreateTicketMessageSchema,
  UpdateTicketStatusSchema,
} from '@eotc/shared';
import { supportService } from '../services/support.service.js';
import { AppError } from '../middlewares/errorHandler.js';
import { Role } from '@prisma/client';

export async function createTicket(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const parsed = CreateSupportTicketSchema.parse(req.body);
  const ticket = await supportService.createTicket(userId, parsed);
  res.status(201).json(ticket);
}

export async function getStudentTickets(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const tickets = await supportService.getStudentTickets(userId);
  res.status(200).json({ tickets });
}

export async function getTicketDetails(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const id = req.params.id as string;
  const ticket = await supportService.getTicketDetails(id, {
    id: user.id,
    role: user.role as Role,
  });

  res.status(200).json(ticket);
}

export async function addTicketMessage(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const id = req.params.id as string;
  const parsed = CreateTicketMessageSchema.parse(req.body);

  const message = await supportService.addTicketMessage(
    id,
    user.id,
    user.role as Role,
    parsed.message
  );

  res.status(201).json(message);
}

export async function adminListTickets(req: Request, res: Response): Promise<void> {
  const { status, category, search, page, limit } = req.query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await supportService.getAdminTickets({
    status: status as any,
    category: category as any,
    search: search ? String(search) : undefined,
    page: page ? parseInt(String(page), 10) : undefined,
    limit: limit ? parseInt(String(limit), 10) : undefined,
  });

  res.status(200).json(result);
}

export async function adminUpdateTicketStatus(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const parsed = UpdateTicketStatusSchema.parse(req.body);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await supportService.updateTicketStatus(id, parsed.status as any);
  res.status(200).json(updated);
}
