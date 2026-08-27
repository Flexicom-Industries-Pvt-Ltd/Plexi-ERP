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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
  const module = searchParams.get('module') || undefined;
  const severity = searchParams.get('severity') || undefined;
  const action = searchParams.get('action') || undefined;
  const search = searchParams.get('search') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const sortBy = searchParams.get('sortBy') || 'timestamp';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Build where clause
  const where: any = {};
  if (module) where.module = module;
  if (severity) where.severity = severity;
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { module: { contains: search, mode: 'insensitive' } },
      { correlationId: { contains: search, mode: 'insensitive' } },
      { ip: { contains: search, mode: 'insensitive' } },
      { userAgent: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    db.logEntry.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: { diffs: true },
    }),
    db.logEntry.count({ where }),
  ]);

  // Enrich logs with user information
  const userIds = Array.from(new Set(logs.map((log) => log.userId).filter(Boolean))) as string[];
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  
  const userMap = new Map(users.map((u) => [u.id, u]));

  const enrichedLogs = logs.map((log) => ({
    ...log,
    user: log.userId ? userMap.get(log.userId) : null,
  }));

  return NextResponse.json({
    data: enrichedLogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
