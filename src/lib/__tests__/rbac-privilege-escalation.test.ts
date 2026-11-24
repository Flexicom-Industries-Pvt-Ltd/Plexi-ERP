import { describe, it, expect, vi, beforeEach } from "vitest";
import { isSuperAdminRole } from "../rbac";
import { requireApiAuth } from "../api-auth";
import * as authModule from "@/auth";

describe("RBAC Privilege Escalation Prevention (ERP-001, ERP-017)", () => {
  it("should never treat generic 'ADMIN' as SuperAdmin", () => {
    expect(isSuperAdminRole("ADMIN")).toBe(false);
    expect(isSuperAdminRole("Admin")).toBe(false);
    expect(isSuperAdminRole("admin")).toBe(false);
    expect(isSuperAdminRole("FACTORY_ADMIN")).toBe(false);
  });

  it("should only recognize legitimate SuperAdmin and SystemAdmin variants", () => {
    expect(isSuperAdminRole("SUPERADMIN")).toBe(true);
    expect(isSuperAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isSuperAdminRole("Super Admin")).toBe(true);
    expect(isSuperAdminRole("SYSTEMADMIN")).toBe(true);
    expect(isSuperAdminRole("SYSTEM_ADMIN")).toBe(true);
  });

  it("should reject standard non-administrative roles", () => {
    expect(isSuperAdminRole("OPERATOR")).toBe(false);
    expect(isSuperAdminRole("SUPERVISOR")).toBe(false);
    expect(isSuperAdminRole("MANAGER")).toBe(false);
    expect(isSuperAdminRole(undefined)).toBe(false);
    expect(isSuperAdminRole(null as any)).toBe(false);
  });

  it("requireApiAuth should reject users with NO_ROLE or DEACTIVATED status", async () => {
    vi.spyOn(authModule, "auth").mockResolvedValueOnce({
      user: {
        id: "user-no-role",
        role: "NO_ROLE",
        permissions: [],
      },
    } as any);

    const resultNoRole = await requireApiAuth();
    expect(resultNoRole.ok).toBe(false);
    if (!resultNoRole.ok) {
      expect(resultNoRole.response.status).toBe(403);
    }

    vi.spyOn(authModule, "auth").mockResolvedValueOnce({
      user: {
        id: "user-deactivated",
        role: "DEACTIVATED",
        permissions: [],
      },
    } as any);

    const resultDeactivated = await requireApiAuth();
    expect(resultDeactivated.ok).toBe(false);
    if (!resultDeactivated.ok) {
      expect(resultDeactivated.response.status).toBe(403);
    }
  });
});
