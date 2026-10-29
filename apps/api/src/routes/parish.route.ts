import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  getParishes,
  getParishById,
  createParish,
  verifyParish,
  updateParish,
  deleteParish,
} from '../controllers/parish.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';

export const parishRouter: Router = Router();

// Publicly readable so students during registration and teachers/admins can query parishes
parishRouter.get('/', getParishes);
parishRouter.get('/:id', getParishById);

// Public or authenticated parish creation (allows creatable combobox during registration)
parishRouter.post('/', createParish);

// Admin-only management of Sunday schools / parishes
parishRouter.patch('/:id/verify', authenticate, requireRole([Role.ADMIN]), verifyParish);
parishRouter.put('/:id', authenticate, requireRole([Role.ADMIN]), updateParish);
parishRouter.delete('/:id', authenticate, requireRole([Role.ADMIN]), deleteParish);
