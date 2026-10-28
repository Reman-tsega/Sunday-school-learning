import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import type { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: Role;
  fullName: string;
}

export function generateAccessToken(payload: JwtPayload): string {
  // If role is STUDENT, issue 24h (1 day) access token so student is not disrupted
  // If role is ADMIN or TEACHER, issue 15m access token (with activity-based silent refresh & idle timeout)
  const expiresIn = payload.role === 'STUDENT' ? '24h' : (env.JWT_ACCESS_EXPIRES_IN || '15m');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, env.JWT_ACCESS_SECRET as any, {
    expiresIn,
  } as any);
}

export function verifyAccessToken(token: string): JwtPayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.verify(token, env.JWT_ACCESS_SECRET as any) as JwtPayload;
}

export function generateRefreshTokenString(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function calculateRefreshTokenExpiry(): Date {
  // Default 7 days
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}
