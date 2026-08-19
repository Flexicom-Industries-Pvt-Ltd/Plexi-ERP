import { headers } from "next/headers";
import { requireAuth } from "@/lib/auth-utils"; // Need to ensure this exists or create it

export type RequestContext = {
  correlationId: string;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
};

/**
 * Retrieves the unified context for the current request.
 * Must be called within a Server Action or API Route context.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const headersList = await headers();
  const session = await requireAuth();

  // Try to get correlationId from headers, fallback to a new one if somehow missing (e.g., bypasses middleware)
  const correlationId = headersList.get("x-correlation-id") || crypto.randomUUID();
  const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
  const userAgent = headersList.get("user-agent") || null;

  return {
    correlationId,
    ipAddress,
    userAgent,
    userId: session.user.id!,
  };
}
