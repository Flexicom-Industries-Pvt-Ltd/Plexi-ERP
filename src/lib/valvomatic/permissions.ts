import { auth } from "@/auth";
import { isSuperAdminRole } from "@/lib/api-auth";

type ValvomaticAction = "canRead" | "canCreate" | "canUpdate" | "canDelete" | "canWrite";

export async function requireValvomaticApiPermission(action: ValvomaticAction) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const role = session.user.role || (session.user as any).roleName || "";
  const normalizedRole = role.trim().toUpperCase().replace(/[\s_-]/g, "");
  const isAdminOrSuper =
    normalizedRole === "SUPERADMIN" ||
    normalizedRole === "ADMIN" ||
    isSuperAdminRole(session.user.role);

  const permissions = session.user.permissions || [];
  const hasAccess =
    isAdminOrSuper ||
    permissions.some(
      (p: { module: string; [key: string]: unknown }) =>
        (p.module === "VALVOMATIC" ||
          p.module === "CONVERTEX" ||
          p.module === "PRODUCTION" ||
          p.module === "DATA_CENTRE" ||
          p.module === "ALL") &&
        (action === "canWrite" ? Boolean(p.canCreate || p.canUpdate) : Boolean(p[action]))
    );

  if (!hasAccess) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, session };
}
