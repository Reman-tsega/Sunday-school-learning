import { TicketCategory, TicketStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import type {
  SupportTicketItem,
  TicketMessageItem,
} from '@eotc/shared';

export interface AdminTicketQueryParams {
  status?: TicketStatus | undefined;
  category?: TicketCategory | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class SupportService {
  /**
   * Student creates a new support ticket and its initial message.
   */
  async createTicket(
    userId: string,
    data: {
      subject: string;
      category: TicketCategory;
      message: string;
    }
  ): Promise<SupportTicketItem> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, role: true, churchParish: true, phoneNumber: true },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject: data.subject.trim(),
        category: data.category,
        status: TicketStatus.OPEN,
        messages: {
          create: {
            senderId: userId,
            senderRole: user.role,
            message: data.message.trim(),
          },
        },
      },
      include: {
        messages: {
          include: {
            sender: {
              select: { fullName: true, role: true },
            },
          },
        },
      },
    });

    const firstMsg = ticket.messages[0];
    const messageItems: TicketMessageItem[] = ticket.messages.map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      senderId: m.senderId,
      senderName: m.sender.fullName,
      senderRole: m.sender.role,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId: ticket.userId,
      userName: user.fullName,
      userEmail: user.email,
      churchParish: user.churchParish,
      phoneNumber: user.phoneNumber,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messagesCount: 1,
      lastMessageSnippet: firstMsg ? firstMsg.message.slice(0, 100) : '',
      messages: messageItems,
    };
  }

  /**
   * List tickets created by a specific student.
   */
  async getStudentTickets(userId: string): Promise<SupportTicketItem[]> {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { fullName: true, email: true, churchParish: true, phoneNumber: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      userId: t.userId,
      userName: t.user.fullName,
      userEmail: t.user.email,
      churchParish: t.user.churchParish,
      phoneNumber: t.user.phoneNumber,
      subject: t.subject,
      category: t.category,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messagesCount: t._count.messages,
      lastMessageSnippet: t.messages[0] ? t.messages[0].message.slice(0, 100) : null,
    }));
  }

  /**
   * Admin lists all tickets with filtering and search.
   */
  async getAdminTickets(params: AdminTicketQueryParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 30));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.category) {
      where.category = params.category;
    }

    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim();
      where.OR = [
        { subject: { contains: term, mode: 'insensitive' } },
        { user: { fullName: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { churchParish: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: { fullName: true, email: true, churchParish: true, phoneNumber: true },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
    ]);

    const formatted: SupportTicketItem[] = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      userId: t.userId,
      userName: t.user.fullName,
      userEmail: t.user.email,
      churchParish: t.user.churchParish,
      phoneNumber: t.user.phoneNumber,
      subject: t.subject,
      category: t.category,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      messagesCount: t._count.messages,
      lastMessageSnippet: t.messages[0] ? t.messages[0].message.slice(0, 100) : null,
    }));

    return {
      tickets: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single ticket and entire message thread.
   */
  async getTicketDetails(
    ticketId: string,
    requestingUser: { id: string; role: Role }
  ): Promise<SupportTicketItem> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { fullName: true, email: true, churchParish: true, phoneNumber: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { fullName: true, role: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }

    // Role check: Admin can access any ticket; students can only view their own
    if (requestingUser.role !== Role.ADMIN && ticket.userId !== requestingUser.id) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this ticket');
    }

    const messages: TicketMessageItem[] = ticket.messages.map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      senderId: m.senderId,
      senderName: m.sender.fullName,
      senderRole: m.sender.role,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId: ticket.userId,
      userName: ticket.user.fullName,
      userEmail: ticket.user.email,
      churchParish: ticket.user.churchParish,
      phoneNumber: ticket.user.phoneNumber,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messagesCount: messages.length,
      lastMessageSnippet: messages[messages.length - 1]?.message.slice(0, 100) ?? null,
      messages,
    };
  }

  /**
   * Add reply message to ticket thread.
   */
  async addTicketMessage(
    ticketId: string,
    senderId: string,
    senderRole: Role,
    messageText: string
  ): Promise<TicketMessageItem> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true, status: true },
    });

    if (!ticket) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }

    if (senderRole !== Role.ADMIN && ticket.userId !== senderId) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this ticket');
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true, role: true },
    });

    if (!sender) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Sender not found');
    }

    // Auto update status if appropriate:
    // If admin replies and it was OPEN, mark IN_PROGRESS.
    // If student replies and it was RESOLVED, re-open to IN_PROGRESS.
    let newStatus = ticket.status;
    if (senderRole === Role.ADMIN && ticket.status === TicketStatus.OPEN) {
      newStatus = TicketStatus.IN_PROGRESS;
    } else if (senderRole === Role.STUDENT && (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED)) {
      newStatus = TicketStatus.IN_PROGRESS;
    }

    const [createdMsg] = await Promise.all([
      prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          senderRole,
          message: messageText.trim(),
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }),
    ]);

    return {
      id: createdMsg.id,
      ticketId: createdMsg.ticketId,
      senderId: createdMsg.senderId,
      senderName: sender.fullName,
      senderRole: sender.role,
      message: createdMsg.message,
      createdAt: createdMsg.createdAt.toISOString(),
    };
  }

  /**
   * Admin updates ticket status.
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicketItem> {
    const existing = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { fullName: true, email: true, churchParish: true, phoneNumber: true } },
        _count: { select: { messages: true } },
      },
    });

    if (!existing) {
      throw new AppError(404, 'TICKET_NOT_FOUND', 'Support ticket not found');
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
      include: {
        user: { select: { fullName: true, email: true, churchParish: true, phoneNumber: true } },
        _count: { select: { messages: true } },
      },
    });

    return {
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      userId: updated.userId,
      userName: updated.user.fullName,
      userEmail: updated.user.email,
      churchParish: updated.user.churchParish,
      phoneNumber: updated.user.phoneNumber,
      subject: updated.subject,
      category: updated.category,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      messagesCount: updated._count.messages,
    };
  }
}

export const supportService = new SupportService();
