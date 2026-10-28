import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createTicket,
  getStudentTickets,
  getTicketDetails,
  addTicketMessage,
  adminListTickets,
  adminUpdateTicketStatus,
} from '../controllers/support.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

// Standard support router for authenticated users (students & all)
export const supportRouter: Router = Router();
supportRouter.use(authenticate);

supportRouter.post('/tickets', createTicket);
supportRouter.get('/tickets', getStudentTickets);
supportRouter.get('/tickets/:id', getTicketDetails);
supportRouter.post('/tickets/:id/messages', addTicketMessage);

// Admin support router for administrative helpdesk
export const adminSupportRouter: Router = Router();
adminSupportRouter.use(authenticate, requireRole([Role.ADMIN]));

adminSupportRouter.get('/tickets', adminListTickets);
adminSupportRouter.patch('/tickets/:id/status', adminUpdateTicketStatus);
