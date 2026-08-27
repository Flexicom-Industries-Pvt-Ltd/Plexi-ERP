import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db as prisma } from './db';

// Using singleton Prisma client from db module

// Define which fields are sensitive and should be redacted
export const redactionSchema = z.object({
  password: z.string().optional(),
  token: z.string().optional(),
  secret: z.string().optional(),
  // extend as needed per payload shape
});

/** Redact sensitive fields from a payload */
export function redactPayload(payload: any): { original: any; redacted: any } {
  const parseResult = redactionSchema.safeParse(payload);
  if (!parseResult.success) {
    return { original: payload, redacted: payload };
  }
  const redacted = { ...payload };
  for (const key of Object.keys(parseResult.data)) {
    redacted[key] = '[REDACTED]';
  }
  return { original: payload, redacted };
}

/** Core logging function */
export async function logEvent(params: {
  userId?: string;
  module: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  action: string;
  payload: any;
  ip?: string;
  location?: string;
  userAgent?: string;
  durationMs?: number;
  meta?: any;
}) {
  const correlationId = uuidv4();
  const { original, redacted } = redactPayload(params.payload);
  const entry = await prisma.logEntry.create({
    data: {
      correlationId,
      userId: params.userId,
      module: params.module,
      severity: params.severity,
      action: params.action,
      payload: original,
      redactedPayload: redacted,
      ip: params.ip,
      location: params.location,
      userAgent: params.userAgent,
      durationMs: params.durationMs,
      meta: params.meta,
    },
  });
  // Push to any SSE listeners (fire‑and‑forget)
  pushRealtime(entry);
  return correlationId;
}

/** Data‑diff logging */
export async function logDiff(params: {
  userId?: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
  module?: string;
}) {
  const correlationId = await logEvent({
    userId: params.userId,
    module: params.module ?? 'dataDiff',
    severity: 'INFO',
    action: `Diff ${params.entity}`,
    payload: { before: params.before, after: params.after },
    ip: undefined,
    location: undefined,
    userAgent: undefined,
    durationMs: undefined,
    meta: undefined,
  });
  // Link diff record to the created LogEntry
  const logEntry = await prisma.logEntry.findUnique({ where: { correlationId } });
  if (logEntry) {
    await prisma.logDiff.create({
      data: {
        logEntryId: logEntry.id,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before,
        after: params.after,
      },
    });
  }
  return correlationId;
}

/** SSE listener registration */
const listeners = new Set<any>();
export function registerLogListener(res: any) {
  listeners.add(res);
  res.on('close', () => listeners.delete(res));
}

function pushRealtime(entry: any) {
  const payload = JSON.stringify({
    correlationId: entry.correlationId,
    module: entry.module,
    severity: entry.severity,
    action: entry.action,
    payload: entry.redactedPayload,
    timestamp: entry.timestamp,
  });
  listeners.forEach((res) => {
    res.write(`data: ${payload}\n\n`);
  });
}

export default prisma;
