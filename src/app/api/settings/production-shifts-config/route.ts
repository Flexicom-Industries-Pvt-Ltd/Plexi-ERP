import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logEvent } from "@/lib/logging";

const CONFIG_KEY = "PRODUCTION_ENABLE_DAY_NIGHT_SHIFT";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await db.configParameter.findUnique({
      where: { key: CONFIG_KEY },
    });

    // Default to true (standard for continuous plastic processing plants)
    const allowDayNight = config ? config.value === "true" || config.value === "1" : true;

    return NextResponse.json({
      success: true,
      allowDayNight,
      description: config?.description || "Enables 24-Hour (Day+Night) continuous shift in production modules",
    });
  } catch (error: any) {
    console.error("GET production-shifts-config error:", error);
    return NextResponse.json({ error: error.message || "Failed to load config" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const permissions = user.permissions || [];
  const isSuperAdmin = user.role === "SUPERADMIN";
  const hasSettingsWrite = permissions.some((p: any) => p.module === "SETTINGS" && (p.canCreate || p.canUpdate));

  if (!isSuperAdmin && !hasSettingsWrite) {
    return NextResponse.json({ error: "Forbidden: requires Settings permission" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const allowDayNight = Boolean(body.allowDayNight);

    const updated = await db.configParameter.upsert({
      where: { key: CONFIG_KEY },
      update: {
        value: String(allowDayNight),
        updatedBy: user.email || user.name || "Admin",
      },
      create: {
        key: CONFIG_KEY,
        value: String(allowDayNight),
        description: "Enables 24-Hour (Day+Night) continuous shift in production modules",
        isSystem: true,
        updatedBy: user.email || user.name || "Admin",
      },
    });

    await logEvent({
      module: "SETTINGS",
      severity: "INFO",
      action: `${allowDayNight ? "Enabled" : "Disabled"} 24-Hour (Day+Night) Combined Shift in Production Master Settings`,
      userId: user.id || user.email || "system",
      payload: { allowDayNight, configId: updated.id, userName: user.name || "Admin" },
    });

    return NextResponse.json({
      success: true,
      allowDayNight,
      message: `24-Hour (Day+Night) shift provision successfully ${allowDayNight ? "enabled" : "disabled"}.`,
    });
  } catch (error: any) {
    console.error("POST production-shifts-config error:", error);
    return NextResponse.json({ error: error.message || "Failed to update config" }, { status: 500 });
  }
}
