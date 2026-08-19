import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withTransaction } from '../transaction';
import { db } from '../../../test/prisma-mock';
import { getRequestContext } from '../context';
import { auth } from '@/auth';

describe('withTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute callback and log audit trail successfully', async () => {
    // Setup our mock return values
    const mockResult = { success: true, data: 'test' };
    
    // We expect auditLog.create to be called during the transaction
    db.auditLog.create.mockResolvedValue({ id: 'log-1' } as any);

    const result = await withTransaction({
      action: 'TEST_ACTION',
      module: 'SETTINGS',
      entityId: 'ent-123',
      newValues: { change: 'tested something' },
    }, async (tx) => {
      // simulate some work with tx
      return mockResult;
    });

    expect(result).toEqual(mockResult);
    
    // Ensure audit log was created
    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'TEST_ACTION',
        module: 'SETTINGS',
        correlationId: 'test-correlation-id',
        userId: 'test-user-id',
        ipAddress: '127.0.0.1'
      })
    }));
  });

  it('should propagate errors and not swallow them', async () => {
    const error = new Error('Database connection failed');
    
    await expect(withTransaction({
      action: 'FAIL_ACTION',
      module: 'SETTINGS'
    }, async () => {
      throw error;
    })).rejects.toThrow('Database connection failed');
    
    // If it throws early, we shouldn't have called auditLog.create 
    // unless the callback threw AFTER auditLog creation, but in our code
    // we log audit AFTER the business logic successfully runs.
  });
});
