import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import { Module } from "@/generated/prisma";
import bcrypt from "bcryptjs";
import { parsePaginationParams, createPaginationMeta, PaginationMeta } from "@/lib/pagination";

export interface ListUsersQuery {
  search?: string | null;
  roleId?: string | null;
  departmentId?: string | null;
  isActive?: boolean | string | null;
  page?: number | string | null;
  limit?: number | string | null;
}

export interface UserListResult {
  users: any[];
  meta?: PaginationMeta;
}

export interface CreateUserInput {
  name?: string;
  email?: string;
  password?: string;
  employeeId?: string;
  roleId?: string;
  departmentId?: string;
  phone?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  employeeId?: string;
  roleId?: string;
  departmentId?: string;
  phone?: string;
  isActive?: boolean;
}

export class UserService {
  /**
   * List users with filtering, sorting, and pagination.
   */
  static async listUsers(
    query: ListUsersQuery = {},
    options: { paginate?: boolean } = {}
  ): Promise<UserListResult> {
    const { search, roleId, departmentId, isActive } = query;

    const where: Record<string, unknown> = {};

    if (roleId) where.roleId = roleId;
    if (departmentId) where.departmentId = departmentId;

    if (isActive !== undefined && isActive !== null && isActive !== "") {
      where.isActive = typeof isActive === "string" ? isActive === "true" : Boolean(isActive);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const { page, limit, skip, take, isPaginated } = parsePaginationParams(
      { page: query.page, limit: query.limit },
      { defaultLimit: 50, maxLimit: 200 }
    );

    const shouldPaginate = options.paginate || isPaginated;

    const [rawUsers, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          role: true,
          department: true,
        },
        ...(shouldPaginate ? { skip, take } : {}),
      }),
      db.user.count({ where }),
    ]);

    // Sanitize passwords
    const users = rawUsers.map((u: any) => {
      const { password, ...sanitized } = u;
      return sanitized;
    });

    return {
      users,
      ...(shouldPaginate ? { meta: createPaginationMeta(total, page, limit) } : {}),
    };
  }

  /**
   * Get single user by ID including role permissions and department.
   */
  static async getUserById(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        department: true,
      },
    });

    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create a new user with password hashing and transaction logging.
   */
  static async createUser(data: CreateUserInput) {
    if (data.email) {
      const existingEmail = await db.user.findUnique({ where: { email: data.email } });
      if (existingEmail) throw new Error("A user with this email already exists.");
    }

    if (data.employeeId) {
      const existingEmp = await db.user.findUnique({ where: { employeeId: data.employeeId } });
      if (existingEmp) throw new Error("A user with this Employee ID already exists.");
    }

    let passwordHash: string | null = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    const userData: Record<string, unknown> = { ...data };
    if (passwordHash) {
      userData.password = passwordHash;
    } else {
      delete userData.password;
    }

    const result = await withTransaction(
      {
        action: "CREATE_USER",
        module: Module.USERS,
        newValues: {
          email: data.email,
          roleId: data.roleId,
          departmentId: data.departmentId,
          employeeId: data.employeeId,
        },
      },
      async (tx) => {
        const user = await tx.user.create({
          data: userData as any,
          include: {
            role: true,
            department: true,
          },
        });
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
    );

    return result;
  }

  /**
   * Update existing user details or password.
   */
  static async updateUser(id: string, updateData: UpdateUserInput) {
    const oldUser = await db.user.findUnique({ where: { id } });
    if (!oldUser) throw new Error("User not found.");

    if (updateData.email && updateData.email !== oldUser.email) {
      const existingEmail = await db.user.findUnique({ where: { email: updateData.email } });
      if (existingEmail) throw new Error("A user with this email already exists.");
    }

    if (updateData.employeeId && updateData.employeeId !== oldUser.employeeId) {
      const existingEmp = await db.user.findUnique({ where: { employeeId: updateData.employeeId } });
      if (existingEmp) throw new Error("A user with this Employee ID already exists.");
    }

    const userPayload: Record<string, unknown> = { ...updateData };

    if (updateData.password && updateData.password.trim() !== "") {
      userPayload.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete userPayload.password;
    }

    const result = await withTransaction(
      {
        action: "UPDATE_USER",
        module: Module.USERS,
        oldValues: { email: oldUser.email, roleId: oldUser.roleId, departmentId: oldUser.departmentId },
        newValues: { email: updateData.email, roleId: updateData.roleId, departmentId: updateData.departmentId },
      },
      async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id },
          data: userPayload as any,
          include: {
            role: true,
            department: true,
          },
        });
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
      }
    );

    return result;
  }

  /**
   * Toggle user active status.
   */
  static async toggleStatus(id: string, isActive: boolean) {
    const oldUser = await db.user.findUnique({ where: { id } });
    if (!oldUser) throw new Error("User not found.");

    const result = await withTransaction(
      {
        action: "TOGGLE_USER_STATUS",
        module: Module.USERS,
        oldValues: { id, isActive: oldUser.isActive },
        newValues: { id, isActive },
      },
      async (tx) => {
        const updated = await tx.user.update({
          where: { id },
          data: { isActive },
          include: { role: true, department: true },
        });
        const { password, ...userWithoutPassword } = updated;
        return userWithoutPassword;
      }
    );

    return result;
  }

  /**
   * Delete a user.
   */
  static async deleteUser(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) throw new Error("User not found.");

    const result = await withTransaction(
      {
        action: "DELETE_USER",
        module: Module.USERS,
        oldValues: { id, email: user.email, name: user.name },
      },
      async (tx) => {
        await tx.user.delete({ where: { id } });
        return { success: true, id };
      }
    );

    return result;
  }
}
