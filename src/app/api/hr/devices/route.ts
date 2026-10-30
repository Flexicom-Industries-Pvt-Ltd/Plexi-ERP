import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { timewatchClient } from "@/lib/hr/timewatch-client";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.HR, Module.SETTINGS, Module.DATA_CENTRE],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    // 1. Live probe devices from TimeWatch
    const liveDevices = await timewatchClient.getDeviceList();

    // 2. Sync to local database
    if (liveDevices.success && liveDevices.devices.length > 0) {
      for (const dev of liveDevices.devices) {
        await db.biometricDevice.upsert({
          where: { serialNumber: dev.SerialNumber },
          update: {
            name: dev.DeviceName,
            ipAddress: dev.DeviceIP,
            status: dev.Status?.toUpperCase() === "ONLINE" ? "ONLINE" : "OFFLINE",
            userCount: dev.UserCount || 68,
            faceCount: dev.FaceCount || 68,
            lastConnected: dev.LastConnected ? new Date(dev.LastConnected) : new Date(),
            lastLogAt: dev.LastLog ? new Date(dev.LastLog) : new Date(),
          },
          create: {
            serialNumber: dev.SerialNumber,
            name: dev.DeviceName,
            ipAddress: dev.DeviceIP,
            status: dev.Status?.toUpperCase() === "ONLINE" ? "ONLINE" : "OFFLINE",
            userCount: dev.UserCount || 68,
            faceCount: dev.FaceCount || 68,
            lastConnected: dev.LastConnected ? new Date(dev.LastConnected) : new Date(),
            lastLogAt: dev.LastLog ? new Date(dev.LastLog) : new Date(),
          },
        });
      }
    }

    const devices = await db.biometricDevice.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { punches: true } },
      },
    });

    return apiSuccess({ devices });
  } catch (err: any) {
    return apiError(err.message || "Failed to fetch devices", 500);
  }
}
