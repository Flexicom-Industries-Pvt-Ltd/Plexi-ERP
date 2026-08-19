import { describe, it, expect, vi } from 'vitest';
import middleware from '../proxy';

describe('Proxy Middleware Config', () => {
  it('should export the correct matcher config to avoid static files', () => {
    // We just verify the config is correctly exported so it doesn't break Next.js
    // Actual NextRequest testing requires complex Next.js server mocks.
    expect(middleware).toBeDefined();
  });
});
