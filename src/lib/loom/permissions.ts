import { auth } from "@/auth";
import { isSuperAdminRole } from "@/lib/api-auth";

type LoomAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";

export async function requireLoomApiPermission(action: LoomAction) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    isSuperAdminRole(session.user.role) ||
    permissions.some(
      (p: { module: string; [key: string]: unknown }) =>
        (p.module === "LOOM" || p.module === "PRODUCTION" || p.module === "TAPE_PLANT" || p.module === "ALL") &&
        Boolean(p[action])
    );

  if (!hasAccess) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, session };
}
