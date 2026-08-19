import { describe, it, expect, vi } from 'vitest';
import { getRequestContext } from '../context';

describe('getRequestContext', () => {
  it('should extract correlation ID and IP from mocked Next.js headers', async () => {
    const ctx = await getRequestContext();
    
    expect(ctx.correlationId).toBe('test-correlation-id');
    expect(ctx.ipAddress).toBe('127.0.0.1');
    expect(ctx.userAgent).toBe('vitest-test-agent');
  });
});
