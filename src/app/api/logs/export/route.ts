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

  if (format === 'csv') {
    const header = 'Timestamp,Correlation ID,Module,Severity,Action,IP,User Agent,Duration (ms),Location\n';
    const rows = logs.map((l) => {
      const ts = new Date(l.timestamp).toISOString();
      const escape = (v: string | null) => `"${(v || '').replace(/"/g, '""')}"`;
      return [
        ts,
        escape(l.correlationId),
        escape(l.module),
        escape(l.severity),
        escape(l.action),
        escape(l.ip),
        escape(l.userAgent),
        l.durationMs ?? '',
        escape(l.location),
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

  // JSON export (can be used for PDF generation on client)
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    count: logs.length,
    data: logs.map((l) => ({
      timestamp: l.timestamp,
      correlationId: l.correlationId,
      module: l.module,
      severity: l.severity,
      action: l.action,
      ip: l.ip,
      userAgent: l.userAgent,
      durationMs: l.durationMs,
      location: l.location,
      payload: l.redactedPayload,
    })),
  });
}
