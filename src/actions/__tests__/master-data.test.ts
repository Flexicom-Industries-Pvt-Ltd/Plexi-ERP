import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDepartment, updateDepartment, createSection, createLocation } from '../master-data';
import { db } from '../../../test/prisma-mock';
import { Module, LocationType } from '@/generated/prisma';

// Mock the transaction module
vi.mock('@/lib/transaction', () => {
  return {
    withTransaction: vi.fn().mockImplementation(async (options, action) => {
      // Execute the action, passing the mocked db as tx
      return await action(db);
    })
  };
});

// Mock Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

describe('Master Data Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Department', () => {
    it('should create a department', async () => {
      const mockDepartment = { id: 'dep-1', name: 'Production', code: 'PROD' };
      vi.mocked(db.department.create).mockResolvedValue(mockDepartment as any);

      const result = await createDepartment({ name: 'Production', code: 'PROD' });

      expect(db.department.create).toHaveBeenCalledWith({
        data: { name: 'Production', code: 'PROD' }
      });
      expect(result).toEqual(mockDepartment);
    });

    it('should update a department', async () => {
      const mockDepartment = { id: 'dep-1', name: 'Prod Updated', code: 'PROD', isActive: true };
      vi.mocked(db.department.update).mockResolvedValue(mockDepartment as any);

      const result = await updateDepartment('dep-1', { name: 'Prod Updated', code: 'PROD', isActive: true });

      expect(db.department.update).toHaveBeenCalledWith({
        where: { id: 'dep-1' },
        data: { name: 'Prod Updated', code: 'PROD', isActive: true }
      });
      expect(result).toEqual(mockDepartment);
    });
  });

  describe('Section', () => {
    it('should create a section', async () => {
      const mockSection = { id: 'sec-1', name: 'Lamination', code: 'LAM', departmentId: 'dep-1' };
      vi.mocked(db.section.create).mockResolvedValue(mockSection as any);

      const result = await createSection({ name: 'Lamination', code: 'LAM', departmentId: 'dep-1' });

      expect(db.section.create).toHaveBeenCalledWith({
        data: { name: 'Lamination', code: 'LAM', departmentId: 'dep-1' }
      });
      expect(result).toEqual(mockSection);
    });
  });

  describe('Location', () => {
    it('should create a location', async () => {
      const mockLocation = { id: 'loc-1', name: 'Gate 1', code: 'G1', type: LocationType.GATE };
      vi.mocked(db.location.create).mockResolvedValue(mockLocation as any);

      const result = await createLocation({ name: 'Gate 1', code: 'G1', type: LocationType.GATE });

      expect(db.location.create).toHaveBeenCalledWith({
        data: { name: 'Gate 1', code: 'G1', type: LocationType.GATE }
      });
      expect(result).toEqual(mockLocation);
    });
  });
});
