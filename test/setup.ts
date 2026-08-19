import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js next/headers globally for server actions/context
vi.mock('next/headers', () => {
  return {
    headers: vi.fn().mockResolvedValue(new Map([
      ['x-correlation-id', 'test-correlation-id'],
      ['x-forwarded-for', '127.0.0.1'],
      ['user-agent', 'vitest-test-agent']
    ])),
  };
});

// Mock NextAuth globally
vi.mock('@/auth', () => {
  return {
    auth: vi.fn().mockResolvedValue({
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN'
      }
    }),
  };
});

// Mock DB 
vi.mock('@/lib/db', async () => {
  const mock = await import('./prisma-mock');
  return mock;
});
