 
/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { users } from '@/db/schema';
import { authOptions } from '@/lib/auth/auth-options';

vi.mock('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
  },
}));

describe('authOptions callbacks', () => {
  const findFirstMock = db.query.users.findFirst as unknown as ReturnType<typeof vi.fn>;
  const insertMock = db.insert as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn callback', () => {
    const signIn = authOptions.callbacks?.signIn;

    if (!signIn) {
      throw new Error('signIn callback is not defined in authOptions');
    }

    it('rejects login if email is not provided', async () => {
      const result = await signIn({
        user: {},
        account: null,
        profile: {},
      } as any);

      expect(result).toBe(false);
    });

    it('JIT provisions a new user with Employee role if the user does not exist', async () => {
      // User does not exist in DB
      findFirstMock.mockResolvedValue(null);

      const insertValuesMock = vi.fn().mockResolvedValue({});
      insertMock.mockReturnValue({
        values: insertValuesMock,
      });

      const result = await signIn({
        user: { name: 'Keycloak User', email: 'NEW_USER@tiqri.com' },
        account: null,
        profile: {
          email: 'NEW_USER@tiqri.com',
          name: 'Keycloak User',
          preferred_username: 'kuser',
        },
      } as any);

      expect(result).toBe(true);
      expect(findFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      );
      expect(insertMock).toHaveBeenCalledWith(users);
      expect(insertValuesMock).toHaveBeenCalledWith({
        email: 'new_user@tiqri.com',
        name: 'Keycloak User',
        role: 'Employee',
        isActive: true,
      });
    });

    it('JIT provisions using preferred_username if name is missing in profile', async () => {
      findFirstMock.mockResolvedValue(null);

      const insertValuesMock = vi.fn().mockResolvedValue({});
      insertMock.mockReturnValue({
        values: insertValuesMock,
      });

      const result = await signIn({
        user: { email: 'NEW_USER@tiqri.com' },
        account: null,
        profile: {
          email: 'NEW_USER@tiqri.com',
          preferred_username: 'username_fallback',
        },
      } as any);

      expect(result).toBe(true);
      expect(insertValuesMock).toHaveBeenCalledWith({
        email: 'new_user@tiqri.com',
        name: 'username_fallback',
        role: 'Employee',
        isActive: true,
      });
    });

    it('allows existing active user to sign in without JIT provisioning', async () => {
      findFirstMock.mockResolvedValue({
        id: 'user-id-123',
        email: 'existing@tiqri.com',
        isActive: true,
        role: 'ITOperator',
      });

      const result = await signIn({
        user: { email: 'existing@tiqri.com' },
        account: null,
        profile: { email: 'existing@tiqri.com' },
      } as any);

      expect(result).toBe(true);
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('rejects existing inactive user from logging in', async () => {
      findFirstMock.mockResolvedValue({
        id: 'user-id-123',
        email: 'inactive@tiqri.com',
        isActive: false,
        role: 'Employee',
      });

      const result = await signIn({
        user: { email: 'inactive@tiqri.com' },
        account: null,
        profile: { email: 'inactive@tiqri.com' },
      } as any);

      expect(result).toBe(false);
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('rejects sign in and returns false if database insert fails during JIT', async () => {
      findFirstMock.mockResolvedValue(null);

      const insertValuesMock = vi.fn().mockRejectedValue(new Error('DB error'));
      insertMock.mockReturnValue({
        values: insertValuesMock,
      });

      const result = await signIn({
        user: { email: 'error@tiqri.com' },
        account: null,
        profile: { email: 'error@tiqri.com' },
      } as any);

      expect(result).toBe(false);
    });
  });
});
