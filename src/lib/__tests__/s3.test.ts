import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePresignedUploadUrl, deleteS3File } from '../s3';
import { db } from '@/lib/db';

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

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({}),
}));

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = mockSend;
    },
    PutObjectCommand: class { constructor() {} },
    DeleteObjectCommand: class { constructor() {} }
  };
});

describe('S3 Storage Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePresignedUploadUrl', () => {
    it('should format filename correctly and return valid URL', async () => {
      const result = await generatePresignedUploadUrl('test image.png', 'image/png', 'USERS' as any);
      
      expect(result.presignedUrl).toBe('https://mocked-s3-url.com/upload');
      expect(result.fileKey).toMatch(/^users\/[a-f0-9-]+\.png$/);
    });
  });

  describe('deleteS3File ownership validation', () => {
    it('should allow deletion when requesting user is owner', async () => {
      vi.mocked(db.fileAsset.findUnique).mockResolvedValue({
        id: 'asset-1',
        fileKey: 'users/test.png',
        uploadedBy: 'user-123',
      } as any);

      await expect(deleteS3File('users/test.png', 'user-123')).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should reject deletion when requesting user is not owner and not super admin', async () => {
      vi.mocked(db.fileAsset.findUnique).mockResolvedValue({
        id: 'asset-1',
        fileKey: 'users/test.png',
        uploadedBy: 'owner-456',
      } as any);

      await expect(deleteS3File('users/test.png', 'attacker-789', 'OPERATOR')).rejects.toThrow(
        /Forbidden: You do not have permission to delete this file asset/
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should allow deletion when requesting user is Super Admin even if not owner', async () => {
      vi.mocked(db.fileAsset.findUnique).mockResolvedValue({
        id: 'asset-1',
        fileKey: 'users/test.png',
        uploadedBy: 'owner-456',
      } as any);

      await expect(deleteS3File('users/test.png', 'admin-001', 'Super Admin')).resolves.toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });
});
