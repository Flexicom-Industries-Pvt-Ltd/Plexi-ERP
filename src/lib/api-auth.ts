import { auth } from "@/auth";
import { Module } from "@/generated/prisma";
import { apiError } from "./api-response";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { isSuperAdminRole } from "@/lib/rbac";

export type ApiAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";

export interface ApiAuthOptions {
  module?: Module | Module[];
  action?: ApiAction;
}

export type ApiAuthResult =
  | {
      ok: true;
      session: Session;
      user: NonNullable<Session["user"]>;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export { isSuperAdminRole };

/**
 * requireApiAuth
 * High-performance API authentication & authorization helper.
 * Enforces active account status and module-level permissions.
 */
export async function requireApiAuth(options: ApiAuthOptions = {}): Promise<ApiAuthResult> {
  const session = (await auth()) as Session | null;
  if (!session?.user) {
    return {
      ok: false,
      response: apiError("Unauthorized", 401),
    };
  }

  // Enforce account active status (ERP-001, ERP-033, ERP-040)
  if ((session.user as any).isActive === false || session.user.role === "DEACTIVATED") {
    return {
      ok: false,
      response: apiError("Forbidden: Account has been deactivated", 403),
    };
  }

  const { module, action = "canRead" } = options;
  if (!module) {
    return { ok: true, session, user: session.user };
  }

  const roleName = session.user.role || (session.user as { roleName?: string }).roleName;
  if (isSuperAdminRole(roleName)) {
    return { ok: true, session, user: session.user };
  }

  const permissions = (session.user.permissions as Array<{ module: string; [key: string]: unknown }>) || [];
  const requiredModules = Array.isArray(module) ? module : [module];

  const hasPermission = requiredModules.some((mod) =>
    permissions.some((p) => (p.module === mod || p.module === "ALL") && Boolean(p[action]))
  );

  if (!hasPermission) {
    return {
      ok: false,
      response: apiError("Forbidden: Insufficient module permissions", 403),
    };
  }

  return { ok: true, session, user: session.user };
}
