import { auth } from "@/auth";

type ProductionAction = "canRead" | "canCreate" | "canUpdate" | "canDelete";

export async function requireProductionApiPermission(action: ProductionAction) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: { module: string; [key: string]: unknown }) => p.module === "PRODUCTION" && p[action]);

  if (!hasAccess) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, session };
}
