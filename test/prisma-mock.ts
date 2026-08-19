import { PrismaClient } from '@/generated/prisma';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { beforeEach, vi } from 'vitest';

// Create a deep mock of the Prisma client
export const db = mockDeep<PrismaClient>();

// Reset the mock before each test
beforeEach(() => {
  mockReset(db);
  
  // Custom mock for $transaction to automatically execute the callback
  // with the mocked db instance as the transaction client.
  db.$transaction.mockImplementation(async (callback) => {
    // If it's an array of promises (not supported by our wrapper but good to handle)
    if (Array.isArray(callback)) {
      return Promise.all(callback);
    }
    // If it's a callback, execute it and pass the mocked db as the `tx` object
    // @ts-ignore - complex type matching
    return await callback(db);
  });
});
