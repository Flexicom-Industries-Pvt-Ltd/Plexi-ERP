import { v4 as uuidv4 } from 'uuid';
import { db as prisma } from './db';

// ──────────────────────────────────────────────
// Severity Levels (PRD §12)
// ──────────────────────────────────────────────
export type LogSeverity = 'INFO' | 'NOTICE' | 'WARN' | 'ERROR' | 'CRITICAL' | 'SECURITY';

// ──────────────────────────────────────────────
// Sensitive Field Redaction (PRD §14)
// ──────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
  'password', 'newpassword', 'currentpassword', 'confirmpassword',
  'token', 'accesstoken', 'refreshtoken',
  'secret', 'apikey', 'api_key',
  'authorization', 'cookie', 'set-cookie',
  'credit_card', 'creditcard', 'cvv', 'ssn',
]);

/** Recursively redact sensitive fields from any object */
export function redactPayload(payload: any): { original: any; redacted: any } {
  if (payload === null || payload === undefined) {
    return { original: payload, redacted: payload };
  }
  
  if (typeof payload !== 'object') {
    return { original: payload, redacted: payload };
  }

  const redacted = Array.isArray(payload) ? [...payload] : { ...payload };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      const nested = redactPayload(redacted[key]);
      redacted[key] = nested.redacted;
    }
  }

  return { original: payload, redacted };
}

// ──────────────────────────────────────────────
// User-Agent Parser (PRD §6)
// ──────────────────────────────────────────────
export interface ParsedUA {
  browser: string | null;
  os: string | null;
  deviceType: string | null;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { browser: null, os: null, deviceType: null };

  // Browser detection
  let browser: string | null = null;
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = `Edge ${match?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = `Chrome ${match?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = `Firefox ${match?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const match = ua.match(/Version\/([\d.]+)/);
    browser = `Safari ${match?.[1]?.split('.')[0] || ''}`.trim();
  } else {
    browser = 'Unknown Browser';
  }

  // OS detection
  let os: string | null = null;
  if (ua.includes('Windows NT 10.0')) {
    os = ua.includes('Windows NT 10.0; Win64') ? 'Windows 10/11' : 'Windows 10';
  } else if (ua.includes('Windows NT')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X ([\d_]+)/);
    os = `macOS ${match?.[1]?.replace(/_/g, '.') || ''}`.trim();
  } else if (ua.includes('Linux')) {
    os = ua.includes('Android') ? 'Android' : 'Linux';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  } else {
    os = 'Unknown OS';
  }

  // Device type
  let deviceType: string | null = 'desktop';
  if (/Mobi|Android|iPhone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'tablet';
  }

  return { browser, os, deviceType };
}

// ──────────────────────────────────────────────
// Core Logging Function (PRD §2, §3, §4)
// ──────────────────────────────────────────────
export interface LogEventParams {
  userId?: string;
  module: string;
  severity: LogSeverity;
  action: string;
  payload?: any;
  ip?: string | null;
  location?: string | null;
  userAgent?: string | null;
  durationMs?: number | null;
  meta?: any;
  // Request-level fields
  httpMethod?: string | null;
  url?: string | null;
  statusCode?: number | null;
}

export async function logEvent(params: LogEventParams): Promise<string> {
  const correlationId = uuidv4();
  const { original, redacted } = redactPayload(params.payload ?? {});
  const ua = parseUserAgent(params.userAgent);

  try {
    const entry = await prisma.logEntry.create({
      data: {
        correlationId,
        userId: params.userId,
        module: params.module,
        severity: params.severity,
        action: params.action,
        payload: original,
        redactedPayload: redacted,
        ip: params.ip ?? null,
        location: params.location ?? null,
        userAgent: params.userAgent ?? null,
        durationMs: params.durationMs ?? null,
        meta: params.meta ?? undefined,
        // Request-level
        httpMethod: params.httpMethod ?? null,
        url: params.url ?? null,
        statusCode: params.statusCode ?? null,
        // Parsed device info
        deviceType: ua.deviceType,
        browser: ua.browser,
        os: ua.os,
      },
    });

    // Push to any SSE listeners (fire-and-forget)
    pushRealtime(entry);
    return correlationId;
  } catch (err) {
    console.error('[LogService] Failed to write log entry:', err);
    return correlationId; // Never let logging failures break the app
  }
}

// ──────────────────────────────────────────────
// Data-Diff Logging (PRD §4)
// ──────────────────────────────────────────────
export async function logDiff(params: {
  userId?: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
  module?: string;
  ip?: string | null;
  userAgent?: string | null;
  httpMethod?: string | null;
  url?: string | null;
  statusCode?: number | null;
}): Promise<string> {
  const correlationId = await logEvent({
    userId: params.userId,
    module: params.module ?? 'DATA_CHANGE',
    severity: 'INFO',
    action: `Data Change: ${params.entity}`,
    payload: { before: params.before, after: params.after },
    ip: params.ip,
    userAgent: params.userAgent,
    httpMethod: params.httpMethod,
    url: params.url,
    statusCode: params.statusCode,
  });

  // Link diff record to the created LogEntry
  try {
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
  } catch (err) {
    console.error('[LogService] Failed to write diff:', err);
  }

  return correlationId;
}

// ──────────────────────────────────────────────
// SSE Real-time Push (PRD §16)
// ──────────────────────────────────────────────
const listeners = new Set<any>();

export function registerLogListener(res: any) {
  listeners.add(res);
  res.on('close', () => listeners.delete(res));
}

function pushRealtime(entry: any) {
  const payload = JSON.stringify({
    id: entry.id,
    correlationId: entry.correlationId,
    module: entry.module,
    severity: entry.severity,
    action: entry.action,
    timestamp: entry.timestamp,
    userId: entry.userId,
    ip: entry.ip,
    httpMethod: entry.httpMethod,
    url: entry.url,
    statusCode: entry.statusCode,
    durationMs: entry.durationMs,
    browser: entry.browser,
    os: entry.os,
    deviceType: entry.deviceType,
  });
  listeners.forEach((res) => {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      listeners.delete(res);
    }
  });
}

export default prisma;
