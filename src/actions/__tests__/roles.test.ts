import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRole, updateRole, deleteRole } from "../roles";
import { db } from "../../../test/prisma-mock";
import { Module } from "@/generated/prisma";

vi.mock("@/lib/transaction", () => ({
  withTransaction: vi.fn().mockImplementation(async (options, action) => {
    return await action(db);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Role Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRole", () => {
    it("should return error if role name already exists", async () => {
      vi.mocked(db.role.findUnique).mockResolvedValue({ id: "role-1", name: "Operator" } as any);

      const result = await createRole({
        name: "Operator",
        description: "Plant operator",
        permissions: [
          {
            module: Module.PRODUCTION,
            canCreate: true,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toMatch(/already exists/i);
      }
    });

    it("should create role with permissions successfully", async () => {
      vi.mocked(db.role.findUnique).mockResolvedValue(null);
      const mockCreatedRole = {
        id: "role-1",
        name: "Supervisor",
        description: "Floor supervisor",
        permissions: [
          {
            id: "p-1",
            module: Module.PRODUCTION,
            canCreate: true,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
        ],
      };
      vi.mocked(db.role.create).mockResolvedValue(mockCreatedRole as any);

      const result = await createRole({
        name: "Supervisor",
        description: "Floor supervisor",
        permissions: [
          {
            module: Module.PRODUCTION,
            canCreate: true,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockCreatedRole);
      }
    });
  });

  describe("updateRole", () => {
    it("should return error if role not found", async () => {
      vi.mocked(db.role.findUnique).mockResolvedValue(null);

      const result = await updateRole({
        id: "nonexistent",
        name: "Supervisor",
        description: "Updated",
        permissions: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toMatch(/not found/i);
      }
    });

    it("should return error if updating to an existing different role name", async () => {
      const oldRole = { id: "role-1", name: "Supervisor", permissions: [] };
      vi.mocked(db.role.findUnique)
        .mockResolvedValueOnce(oldRole as any)
        .mockResolvedValueOnce({ id: "role-2", name: "Admin" } as any);

      const result = await updateRole({
        id: "role-1",
        name: "Admin",
        description: "Updated",
        permissions: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toMatch(/already exists/i);
      }
    });

    it("should update role permissions successfully", async () => {
      const oldRole = { id: "role-1", name: "Supervisor", permissions: [] };
      const updatedRole = {
        id: "role-1",
        name: "Senior Supervisor",
        description: "Updated",
        permissions: [
          {
            id: "p-1",
            module: Module.SECURITY_GATE,
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
        ],
      };

      vi.mocked(db.role.findUnique)
        .mockResolvedValueOnce(oldRole as any)
        .mockResolvedValueOnce(null);
      vi.mocked(db.rolePermission.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(db.role.update).mockResolvedValue(updatedRole as any);

      const result = await updateRole({
        id: "role-1",
        name: "Senior Supervisor",
        description: "Updated",
        permissions: [
          {
            module: Module.SECURITY_GATE,
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(db.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "role-1" } });
      expect(db.role.update).toHaveBeenCalled();
    });
  });

  describe("deleteRole", () => {
    it("should return error if role is assigned to active users", async () => {
      const oldRole = { id: "role-1", name: "Manager", _count: { users: 3 } };
      vi.mocked(db.role.findUnique).mockResolvedValue(oldRole as any);

      const result = await deleteRole({ id: "role-1" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toMatch(/assigned to users/i);
      }
    });

    it("should delete unassigned role successfully", async () => {
      const oldRole = { id: "role-1", name: "Temp Role", _count: { users: 0 } };
      vi.mocked(db.role.findUnique).mockResolvedValue(oldRole as any);
      vi.mocked(db.role.delete).mockResolvedValue(oldRole as any);

      const result = await deleteRole({ id: "role-1" });

      expect(result.success).toBe(true);
      expect(db.role.delete).toHaveBeenCalledWith({ where: { id: "role-1" } });
    });
  });
});
