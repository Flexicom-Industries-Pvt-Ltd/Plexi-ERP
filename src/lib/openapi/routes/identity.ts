import { reg } from "../helpers";
import {
  IdPathParam,
  UserListQuery,
  CreateUserBody,
  UpdateUserBody,
  CreateRoleBody,
  UpdateRoleBody,
} from "../schemas";

const USERS = ["Users"];
const ROLES = ["Roles"];

export function registerIdentityRoutes() {
  // ─── Users ───────────────────────────────────────────────────────────────────

  reg({
    method: "get",
    path: "/api/users",
    summary: "List and search system users",
    description: "Retrieve paginated list of users with role and department details. Sensitive password hashes are automatically excluded.",
    tags: USERS,
    query: UserListQuery,
  });

  reg({
    method: "post",
    path: "/api/users",
    summary: "Create a new user account",
    description: "Create a user with hashed password, assigned role, and department. Logs CREATE_USER audit transaction.",
    tags: USERS,
    body: CreateUserBody,
  });

  reg({
    method: "get",
    path: "/api/users/{id}",
    summary: "Get user details by ID",
    description: "Retrieve user details including role permissions and department info.",
    tags: USERS,
    params: IdPathParam,
  });

  reg({
    method: "patch",
    path: "/api/users/{id}",
    summary: "Update user profile or status",
    description: "Update user name, email, phone, role, department, or active status.",
    tags: USERS,
    params: IdPathParam,
    body: UpdateUserBody,
  });

  reg({
    method: "delete",
    path: "/api/users/{id}",
    summary: "Delete a user account",
    description: "Permanently removes a user record after verifying constraints.",
    tags: USERS,
    params: IdPathParam,
  });

  // ─── Roles & Permissions ─────────────────────────────────────────────────────

  reg({
    method: "get",
    path: "/api/roles",
    summary: "List all roles and permission matrices",
    description: "Retrieve all roles along with their granular module permissions and assigned user count.",
    tags: ROLES,
  });

  reg({
    method: "post",
    path: "/api/roles",
    summary: "Create a custom role with permissions",
    description: "Create a new role and configure its CRUD permissions across all system modules.",
    tags: ROLES,
    body: CreateRoleBody,
  });

  reg({
    method: "get",
    path: "/api/roles/{id}",
    summary: "Get role details and permissions",
    description: "Retrieve single role with full permission matrix.",
    tags: ROLES,
    params: IdPathParam,
  });

  reg({
    method: "patch",
    path: "/api/roles/{id}",
    summary: "Update role details and permissions",
    description: "Update role name, description, and module permissions.",
    tags: ROLES,
    params: IdPathParam,
    body: UpdateRoleBody,
  });

  reg({
    method: "delete",
    path: "/api/roles/{id}",
    summary: "Delete a role",
    description: "Delete role if no active users are currently assigned.",
    tags: ROLES,
    params: IdPathParam,
  });
}
