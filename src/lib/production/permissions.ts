import { auth } from "@/auth";
import { isSuperAdminRole } from "@/lib/api-auth";

type ProductionAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";

export async function requireProductionApiPermission(action: ProductionAction) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    isSuperAdminRole(session.user.role) ||
    permissions.some((p: { module: string; [key: string]: unknown }) => (p.module === "PRODUCTION" || p.module === "ALL") && Boolean(p[action]));

  if (!hasAccess) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, session };
}

export function canOverrideProductionRules(session: {
  role?: string;
  permissions?: { module: string; canUpdate?: boolean }[];
}) {
  if (isSuperAdminRole(session.role)) return true;
  return (session.permissions ?? []).some(
    (p) => p.module === "PRODUCTION" && p.canUpdate,
  );
}
