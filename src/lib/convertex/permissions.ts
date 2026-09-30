import { auth } from "@/auth";
import { isSuperAdminRole } from "@/lib/api-auth";

type ConvertexAction = "canRead" | "canCreate" | "canUpdate" | "canDelete" | "canWrite";

export async function requireConvertexApiPermission(action: ConvertexAction) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    isSuperAdminRole(session.user.role) ||
    permissions.some(
      (p: { module: string; [key: string]: unknown }) =>
        (p.module === "CONVERTEX" ||
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
