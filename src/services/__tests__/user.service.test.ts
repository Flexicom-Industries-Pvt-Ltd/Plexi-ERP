import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "../user.service";
import { db } from "../../../test/prisma-mock";
import bcrypt from "bcryptjs";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password_123"),
  },
}));

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listUsers", () => {
    it("should list users and strip password fields", async () => {
      const mockRawUsers = [
        { id: "u-1", name: "Alice", email: "alice@example.com", password: "secret_hash_1" },
        { id: "u-2", name: "Bob", email: "bob@example.com", password: "secret_hash_2" },
      ];

      vi.mocked(db.user.findMany).mockResolvedValue(mockRawUsers as any);
      vi.mocked(db.user.count).mockResolvedValue(2);

      const result = await UserService.listUsers();

      expect(result.users).toHaveLength(2);
      expect(result.users[0].name).toBe("Alice");
      expect(result.users[0]).not.toHaveProperty("password");
      expect(result.users[1]).not.toHaveProperty("password");
    });

    it("should apply search, roleId, departmentId, and isActive filters", async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([]);
      vi.mocked(db.user.count).mockResolvedValue(0);

      await UserService.listUsers({
        search: "Alice",
        roleId: "r-admin",
        departmentId: "d-prod",
        isActive: true,
      });

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roleId: "r-admin",
            departmentId: "d-prod",
            isActive: true,
            OR: [
              { name: { contains: "Alice", mode: "insensitive" } },
              { email: { contains: "Alice", mode: "insensitive" } },
              { employeeId: { contains: "Alice", mode: "insensitive" } },
              { phone: { contains: "Alice", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("should include pagination meta when page/limit are provided", async () => {
      const mockUsers = [{ id: "u-1", name: "Alice", email: "alice@example.com" }];
      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers as any);
      vi.mocked(db.user.count).mockResolvedValue(45);

      const result = await UserService.listUsers({ page: 2, limit: 10 });

      expect(result.meta).toBeDefined();
      expect(result.meta?.page).toBe(2);
      expect(result.meta?.limit).toBe(10);
      expect(result.meta?.total).toBe(45);
      expect(result.meta?.totalPages).toBe(5);
      expect(result.meta?.hasPrev).toBe(true);
      expect(result.meta?.hasNext).toBe(true);
    });
  });

  describe("getUserById", () => {
    it("should return user without password if found", async () => {
      const mockUser = {
        id: "u-1",
        name: "Alice",
        email: "alice@example.com",
        password: "secret_hash",
        role: { name: "Admin", permissions: [] },
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);

      const user = await UserService.getUserById("u-1");

      expect(user).not.toBeNull();
      expect(user?.name).toBe("Alice");
      expect(user).not.toHaveProperty("password");
    });

    it("should return null if user does not exist", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const user = await UserService.getUserById("non-existent");
      expect(user).toBeNull();
    });
  });

  describe("createUser", () => {
    it("should hash password and create user", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      const mockCreated = {
        id: "u-new",
        name: "Charlie",
        email: "charlie@example.com",
        password: "hashed_password_123",
      };
      vi.mocked(db.user.create).mockResolvedValue(mockCreated as any);

      const result = await UserService.createUser({
        name: "Charlie",
        email: "charlie@example.com",
        password: "password123",
        employeeId: "EMP001",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Charlie",
            email: "charlie@example.com",
            password: "hashed_password_123",
          }),
        })
      );
      expect(result).not.toHaveProperty("password");
      expect(result.id).toBe("u-new");
    });

    it("should throw error if email already exists", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: "u-old", email: "existing@example.com" } as any);

      await expect(
        UserService.createUser({ email: "existing@example.com", password: "pass" })
      ).rejects.toThrow("A user with this email already exists.");
    });

    it("should throw error if employeeId already exists", async () => {
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(null) // email check passes
        .mockResolvedValueOnce({ id: "u-old", employeeId: "EMP999" } as any); // employeeId check fails

      await expect(
        UserService.createUser({ email: "new@example.com", employeeId: "EMP999" })
      ).rejects.toThrow("A user with this Employee ID already exists.");
    });
  });

  describe("updateUser", () => {
    it("should update user details and hash new password if provided", async () => {
      const existing = { id: "u-1", email: "old@example.com", employeeId: "EMP001" };
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce(null);

      const updated = {
        id: "u-1",
        name: "Alice Updated",
        email: "new@example.com",
        password: "hashed_password_123",
      };
      vi.mocked(db.user.update).mockResolvedValue(updated as any);

      const result = await UserService.updateUser("u-1", {
        name: "Alice Updated",
        email: "new@example.com",
        password: "newpassword456",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword456", 10);
      expect(result).not.toHaveProperty("password");
      expect(result.name).toBe("Alice Updated");
    });

    it("should throw error if user not found", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      await expect(UserService.updateUser("non-existent", { name: "Test" })).rejects.toThrow("User not found.");
    });
  });

  describe("toggleStatus", () => {
    it("should toggle isActive status", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: "u-1", isActive: true } as any);
      vi.mocked(db.user.update).mockResolvedValue({ id: "u-1", isActive: false, password: "hash" } as any);

      const result = await UserService.toggleStatus("u-1", false);

      expect(db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "u-1" },
          data: { isActive: false },
        })
      );
      expect(result.isActive).toBe(false);
      expect(result).not.toHaveProperty("password");
    });
  });

  describe("deleteUser", () => {
    it("should delete user", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({ id: "u-1", email: "test@example.com" } as any);
      vi.mocked(db.user.delete).mockResolvedValue({ id: "u-1" } as any);

      const result = await UserService.deleteUser("u-1");

      expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "u-1" } });
      expect(result.success).toBe(true);
    });

    it("should throw error if user does not exist", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      await expect(UserService.deleteUser("missing")).rejects.toThrow("User not found.");
    });
  });
});
