import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser, updateUser, toggleUserStatus, updateProfile } from '../users';
import { db } from '../../../test/prisma-mock';
import { Module } from '@/generated/prisma';
import bcrypt from 'bcryptjs';

// Mock transaction
vi.mock('@/lib/transaction', () => {
  return {
    withTransaction: vi.fn().mockImplementation(async (options, action) => {
      return await action(db);
    })
  };
});

// Mock Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password')
  }
}));

describe('User Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should hash password and create a user', async () => {
      const mockUser = { id: 'u-1', email: 'test@example.com', password: 'hashed_password' };
      vi.mocked(db.user.create).mockResolvedValue(mockUser as any);

      const result = await createUser({ email: 'test@example.com', password: 'plain_password', roleId: 'r-1' });

      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);
      expect(db.user.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com', password: 'hashed_password', roleId: 'r-1' }
      });
      // Ensure password is not returned
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('u-1');
    });
  });

  describe('toggleUserStatus', () => {
    it('should update isActive status', async () => {
      const mockUser = { id: 'u-1', isActive: false };
      vi.mocked(db.user.update).mockResolvedValue(mockUser as any);

      const result = await toggleUserStatus('u-1', false);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { isActive: false }
      });
      expect(result).toEqual(mockUser);
    });
  });
});
