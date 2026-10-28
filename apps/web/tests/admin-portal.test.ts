import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api } from '../src/lib/api';

describe('Admin Portal — Web Client API & Workflow Unit Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Set a mock admin session
    (api as any).token = 'mock-admin-access-token';
    (api as any).user = {
      id: 'admin-usr-1',
      email: 'admin@eotc-andnet.org',
      fullName: 'አስተዳዳሪ (Admin)',
      role: 'ADMIN',
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. getUsers sends authorization header and queries users', async () => {
    const mockUsers = [
      { id: 'u1', fullName: 'ዮሐንስ ዳዊት', email: 'yohannes@eotc.org', role: 'STUDENT', isActive: true },
      { id: 'u2', fullName: 'መምህር ተስፋዬ', email: 'tesfaye@eotc.org', role: 'TEACHER', isActive: true },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { users: mockUsers, pagination: { total: 2, page: 1, limit: 10 } },
      }),
    });

    const data = await api.getUsers({ role: 'STUDENT', search: 'ዮሐንስ' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users?role=STUDENT&search='),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-admin-access-token',
        }),
      })
    );
    expect(data.users.length).toBe(2);
    expect(data.users[0].fullName).toBe('ዮሐንስ ዳዊት');
  });

  it('2. createUser sends new user payload to /admin/users', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 'new-u3', fullName: 'ማርታ', email: 'marta@eotc.org', role: 'STUDENT' },
      }),
    });

    const result = await api.createUser({
      fullName: 'ማርታ',
      email: 'marta@eotc.org',
      password: 'SecurePassword2026!',
      role: 'STUDENT',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          fullName: 'ማርታ',
          email: 'marta@eotc.org',
          password: 'SecurePassword2026!',
          role: 'STUDENT',
        }),
      })
    );
    expect(result.id).toBe('new-u3');
  });

  it('3. updateUserStatus sends PATCH to /admin/users/:id/status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'u1', isActive: false } }),
    });

    const res = await api.updateUserStatus('u1', false);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/users/u1/status'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      })
    );
    expect(res.isActive).toBe(false);
  });

  it('4. Curriculum hierarchy creation (Grade -> Subject -> Chapter)', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'g1', level: 6, name: 'Grade 6' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 's1', code: 'HIST-G6', name: 'Church History' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'ch1', chapterNumber: 1, title: 'Early Church' } }),
      });

    const grade = await api.createGrade({ level: 6, name: 'Grade 6', amharicName: 'ክፍል ፮' });
    expect(grade.id).toBe('g1');

    const subject = await api.createSubject('g1', { name: 'Church History', code: 'HIST-G6' });
    expect(subject.id).toBe('s1');

    const chapter = await api.createChapter('s1', { chapterNumber: 1, title: 'Early Church' });
    expect(chapter.id).toBe('ch1');
  });

  it('5. upsertTextbook maps PDF with clamped page ranges [1..25]', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'tb-1',
          chapterId: 'ch1',
          startPage: 1,
          endPage: 25,
          totalPages: 120,
        },
      }),
    });

    const result = await api.upsertTextbook('ch1', {
      title: 'የ፮ኛ ክፍል መማሪያ',
      fileUrl: 'https://res.cloudinary.com/eotc/history.pdf',
      fileSize: 4194304,
      checksumSha256: 'sha256-mock-hash',
      mimeType: 'application/pdf',
      startPage: 1,
      endPage: 25,
      totalPages: 120,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/curriculum/chapters/ch1/textbook'),
      expect.objectContaining({
        method: 'PUT',
      })
    );
    expect(result.startPage).toBe(1);
    expect(result.endPage).toBe(25);
  });

  it('6. publishChapter sends publish request and returns manifest version', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          version: 1,
          manifest: {
            chapterId: 'ch1',
            version: 1,
            checksumSha256: 'sha-manifest-hash',
          },
        },
      }),
    });

    const res = await api.publishChapter('ch1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/curriculum/chapters/ch1/publish'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.version).toBe(1);
  });

  it('7. logout clears credentials from client state', async () => {
    expect(api.getToken()).toBe('mock-admin-access-token');
    expect(api.getUser()).toBeDefined();

    await api.logout();
    expect(api.getToken()).toBeNull();
    expect(api.getUser()).toBeNull();
  });
});
