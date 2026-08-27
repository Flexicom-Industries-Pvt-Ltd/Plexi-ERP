import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check SUPERADMIN or SETTINGS read permission
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasAccess =
    user?.role?.name === 'SUPERADMIN' ||
    user?.role?.permissions.some(
      (p) => p.module === 'SETTINGS' && p.canRead
    );

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const module = searchParams.get('module') || undefined;
  const severity = searchParams.get('severity') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  // Build where clause
  const where: any = {};
  if (module) where.module = module;
  if (severity) where.severity = severity;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }

  // Fetch up to 10,000 rows for export
  const logs = await db.logEntry.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 10000,
  });

  // Enrich with user info
  const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean))) as string[];
  const users = userIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  if (format === 'csv') {
    const header = 'Timestamp,Correlation ID,Module,Severity,Action,User,Email,HTTP Method,URL,Status Code,IP,Browser,OS,Device,Duration (ms),User Agent\n';
    const rows = logs.map((l) => {
      const ts = new Date(l.timestamp).toISOString();
      const u = l.userId ? userMap.get(l.userId) : null;
      const escape = (v: string | null | undefined) => `"${(v || '').replace(/"/g, '""')}"`;
      return [
        ts,
        escape(l.correlationId),
        escape(l.module),
        escape(l.severity),
        escape(l.action),
        escape(u?.name),
        escape(u?.email),
        escape(l.httpMethod),
        escape(l.url),
        l.statusCode ?? '',
        escape(l.ip),
        escape(l.browser),
        escape(l.os),
        escape(l.deviceType),
        l.durationMs ?? '',
        escape(l.userAgent),
      ].join(',');
    });

    const csv = header + rows.join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="system-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // JSON export
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    count: logs.length,
    data: logs.map((l) => {
      const u = l.userId ? userMap.get(l.userId) : null;
      return {
        timestamp: l.timestamp,
        correlationId: l.correlationId,
        module: l.module,
        severity: l.severity,
        action: l.action,
        user: u ? { name: u.name, email: u.email } : null,
        httpMethod: l.httpMethod,
        url: l.url,
        statusCode: l.statusCode,
        ip: l.ip,
        browser: l.browser,
        os: l.os,
        deviceType: l.deviceType,
        durationMs: l.durationMs,
        userAgent: l.userAgent,
        payload: l.redactedPayload,
      };
    }),
  });
}
