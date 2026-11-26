import { auth } from "@/auth";
import { isSuperAdminRole } from "@/lib/api-auth";

type RecyclingAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";

export async function requireRecyclingApiPermission(action: RecyclingAction) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    isSuperAdminRole(session.user.role) ||
    permissions.some(
      (p: { module: string; [key: string]: unknown }) =>
        (p.module === "RECYCLING_PLANT" ||
          p.module === "PRODUCTION" ||
          p.module === "DATA_CENTRE" ||
          p.module === "ALL") &&
        Boolean(p[action])
    );

  if (!hasAccess) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, session };
}
