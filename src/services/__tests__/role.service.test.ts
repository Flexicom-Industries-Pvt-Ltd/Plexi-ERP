import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleService } from "../role.service";
import { db } from "../../../test/prisma-mock";
import { Module } from "@/generated/prisma";

describe("RoleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listRoles", () => {
    it("should fetch all roles with permissions and user counts", async () => {
      const mockRoles = [
        { id: "r-1", name: "Operator", permissions: [], _count: { users: 5 } },
        { id: "r-2", name: "Supervisor", permissions: [], _count: { users: 2 } },
      ];

      vi.mocked(db.role.findMany).mockResolvedValue(mockRoles as any);

      const roles = await RoleService.listRoles();

      expect(roles).toHaveLength(2);
      expect(roles[0].name).toBe("Operator");
      expect(db.role.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
        include: {
          permissions: true,
          _count: { select: { users: true } },
        },
      });
    });
  });

  describe("getRoleById", () => {
    it("should return single role with permissions", async () => {
      const mockRole = {
        id: "r-1",
        name: "Security Guard",
        permissions: [
          { module: Module.SECURITY_GATE, canRead: true, canCreate: true, canUpdate: false, canDelete: false },
        ],
        _count: { users: 3 },
      };

      vi.mocked(db.role.findUnique).mockResolvedValue(mockRole as any);

      const role = await RoleService.getRoleById("r-1");

      expect(role).not.toBeNull();
      expect(role?.name).toBe("Security Guard");
      expect(role?.permissions).toHaveLength(1);
    });

    it("should return null if role not found", async () => {
      vi.mocked(db.role.findUnique).mockResolvedValue(null);

      const role = await RoleService.getRoleById("missing");
      expect(role).toBeNull();
    });
  });

  describe("createRole", () => {
    it("should create role and its permissions", async () => {
      vi.mocked(db.role.findUnique).mockResolvedValue(null);
      const mockCreated = {
        id: "r-new",
        name: "Quality Inspector",
        description: "QC specialist",
        permissions: [
          { id: "rp-1", module: Module.QUALITY_CONTROL, canRead: true, canCreate: true, canUpdate: true, canDelete: false },
        ],
      };
      vi.mocked(db.role.create).mockResolvedValue(mockCreated as any);

      const result = await RoleService.createRole({
        name: "Quality Inspector",
        description: "QC specialist",
        permissions: [
          { module: Module.QUALITY_CONTROL, canRead: true, canCreate: true, canUpdate: true, canDelete: false },
        ],
      });

      expect(result.id).toBe("r-new");
      expect(db.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Quality Inspector",
            description: "QC specialist",
          }),
        })
      );
    });

    it("should throw error if role name already exists", async () => {
      vi.mocked(db.role.findUnique).mockResolvedValue({ id: "r-old", name: "Operator" } as any);

      await expect(
        RoleService.createRole({ name: "Operator", permissions: [] })
      ).rejects.toThrow("A role with this name already exists.");
    });
  });

  describe("updateRole", () => {
    it("should update role and recreate permissions", async () => {
      const existingRole = { id: "r-1", name: "Old Name", permissions: [] };
      vi.mocked(db.role.findUnique)
        .mockResolvedValueOnce(existingRole as any)
        .mockResolvedValueOnce(null);

      const updatedRole = {
        id: "r-1",
        name: "New Name",
        permissions: [{ module: Module.INVENTORY, canRead: true, canCreate: true, canUpdate: false, canDelete: false }],
      };
      vi.mocked(db.role.update).mockResolvedValue(updatedRole as any);

      const result = await RoleService.updateRole("r-1", {
        name: "New Name",
        permissions: [{ module: Module.INVENTORY, canRead: true, canCreate: true, canUpdate: false, canDelete: false }],
      });

      expect(db.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "r-1" } });
      expect(result.name).toBe("New Name");
    });

    it("should throw error if role not found", async () => {
      vi.mocked(db.role.findUnique).mockResolvedValue(null);

      await expect(RoleService.updateRole("missing", { name: "Test", permissions: [] })).rejects.toThrow("Role not found");
    });
  });

  describe("deleteRole", () => {
    it("should delete role and associated permissions if not assigned to users", async () => {
      const existingRole = { id: "r-1", name: "Temporary Role", users: [] };
      vi.mocked(db.role.findUnique).mockResolvedValue(existingRole as any);

      const result = await RoleService.deleteRole("r-1");

      expect(db.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "r-1" } });
      expect(db.role.delete).toHaveBeenCalledWith({ where: { id: "r-1" } });
      expect(result.success).toBe(true);
    });

    it("should throw error if role is assigned to users", async () => {
      const existingRole = { id: "r-1", name: "Active Role", users: [{ id: "u-1" }, { id: "u-2" }] };
      vi.mocked(db.role.findUnique).mockResolvedValue(existingRole as any);

      await expect(RoleService.deleteRole("r-1")).rejects.toThrow("Cannot delete role because it is assigned to users.");
    });
  });
});
