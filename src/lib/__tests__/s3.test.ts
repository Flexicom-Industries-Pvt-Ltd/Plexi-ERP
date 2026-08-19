import { describe, it, expect, vi } from 'vitest';
import { generatePresignedUploadUrl } from '../s3';

vi.mock('@/env', () => {
  return {
    env: {
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'mock-key',
      S3_SECRET_ACCESS_KEY: 'mock-secret',
      S3_BUCKET_NAME: 'mock-bucket',
    }
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: vi.fn().mockResolvedValue('https://mocked-s3-url.com/upload')
  };
});

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class { constructor() {} },
    PutObjectCommand: class { constructor() {} }
  };
});

describe('generatePresignedUploadUrl', () => {
  it('should format filename correctly and return valid URL', async () => {
    const result = await generatePresignedUploadUrl('test image.png', 'image/png', 'USERS' as any);
    
    expect(result.presignedUrl).toBe('https://mocked-s3-url.com/upload');
    expect(result.fileKey).toMatch(/^users\/[a-f0-9-]+\.png$/);
  });
});
