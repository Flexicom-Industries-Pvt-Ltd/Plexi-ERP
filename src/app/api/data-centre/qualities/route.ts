import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export interface UniversalQualityOption {
  code: string;
  label?: string;
  tapeType?: string;
  colour?: string;
  colorGroup?: string;
  denier?: number | null;
  size?: string;
  recipeGroup?: string;
  remarks?: string;
  source?: "recipe" | "loom_mapping" | "party_printing" | "production";
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [
      Module.DATA_CENTRE,
      Module.PRODUCTION,
      Module.TAPE_PLANT,
      Module.LOOM,
      Module.LAMINATION,
      Module.PRINTING,
      Module.CONVERTEX,
      Module.SETTINGS,
    ],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    const [
      recipes,
      mappings,
      partyDetails,
      loomRolls,
      lamEntries,
      printEntries,
      convEntries,
      valvEntries,
    ] = await Promise.all([
      db.tapePlantRecipe.findMany({
        where: { isActive: true },
        select: {
          code: true,
          tapeType: true,
          colour: true,
          colorGroup: true,
          recipeGroup: true,
          denier: true,
          spacerSize: true,
          tapeWidth: true,
          remarks: true,
        },
      }),
      db.loomMachineMapping.findMany({
        where: { isActive: true },
        select: {
          qualityCode: true,
          colour: true,
          colorGroup: true,
          denier: true,
          reedSpaceCm: true,
          tapeWidth: true,
        },
      }),
      db.partyPrintingDetail.findMany({
        where: { isActive: true },
        select: {
          quality: true,
          companyName: true,
          unitName: true,
          grade: true,
          drumSize: true,
        },
      }),
      db.loomRollCuttingEntry.findMany({
        select: { qualityType: true },
        where: { qualityType: { not: "" } },
        distinct: ["qualityType"],
        take: 100,
      }),
      db.laminationProductionEntry.findMany({
        select: { quality: true },
        where: { quality: { not: "" } },
        distinct: ["quality"],
        take: 100,
      }),
      db.printingDailyReportEntry.findMany({
        select: { quality: true },
        where: { quality: { not: "" } },
        distinct: ["quality"],
        take: 100,
      }),
      db.convertexDailyReportEntry.findMany({
        select: { quality: true },
        where: { quality: { not: "" } },
        distinct: ["quality"],
        take: 100,
      }),
      db.valvomaticDailyReportEntry.findMany({
        select: { quality: true },
        where: { quality: { not: "" } },
        distinct: ["quality"],
        take: 100,
      }),
    ]);

    const qualityMap = new Map<string, UniversalQualityOption>();

    const registerQuality = (item: UniversalQualityOption) => {
      const trimmed = (item.code || "").trim();
      if (!trimmed) return;
      const key = trimmed.toUpperCase();
      const existing = qualityMap.get(key);
      if (!existing) {
        qualityMap.set(key, { ...item, code: trimmed });
      } else {
        // Merge enriched metadata
        qualityMap.set(key, {
          code: existing.code,
          label: item.label || existing.label,
          tapeType: item.tapeType || existing.tapeType,
          colour: item.colour || existing.colour,
          colorGroup: item.colorGroup || existing.colorGroup,
          denier: item.denier ?? existing.denier,
          size: item.size || existing.size,
          recipeGroup: item.recipeGroup || existing.recipeGroup,
          remarks: item.remarks || existing.remarks,
          source: existing.source || item.source,
        });
      }
    };

    // 1. Floor production distinct entries
    loomRolls.forEach((r) => r.qualityType && registerQuality({ code: r.qualityType, source: "production" }));
    lamEntries.forEach((r) => r.quality && registerQuality({ code: r.quality, source: "production" }));
    printEntries.forEach((r) => r.quality && registerQuality({ code: r.quality, source: "production" }));
    convEntries.forEach((r) => r.quality && registerQuality({ code: r.quality, source: "production" }));
    valvEntries.forEach((r) => r.quality && registerQuality({ code: r.quality, source: "production" }));

    // 2. Party printing details from Data Centre
    partyDetails.forEach((p) => {
      if (p.quality) {
        registerQuality({
          code: p.quality,
          label: p.companyName ? `${p.companyName} (${p.grade || "STD"})` : undefined,
          source: "party_printing",
        });
      }
    });

    // 3. Loom machine mappings from Data Centre
    mappings.forEach((m) => {
      if (m.qualityCode) {
        registerQuality({
          code: m.qualityCode,
          colour: m.colour || undefined,
          colorGroup: m.colorGroup || undefined,
          denier: m.denier,
          size: m.reedSpaceCm ? `${m.reedSpaceCm * 10}mm` : m.tapeWidth ? `${m.tapeWidth}mm` : undefined,
          source: "loom_mapping",
        });
      }
    });

    // 4. Tape plant recipes from Data Centre (Master authority)
    recipes.forEach((r) => {
      if (r.code) {
        registerQuality({
          code: r.code,
          tapeType: r.tapeType || undefined,
          colour: r.colour || undefined,
          colorGroup: r.colorGroup || undefined,
          recipeGroup: r.recipeGroup || undefined,
          denier: r.denier,
          size: r.spacerSize ? `${r.spacerSize * 10}mm` : r.tapeWidth ? `${r.tapeWidth}mm` : undefined,
          remarks: r.remarks || undefined,
          source: "recipe",
        });
      }
    });

    let qualities = Array.from(qualityMap.values()).sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { sensitivity: "base" })
    );

    if (search) {
      qualities = qualities.filter((q) => {
        return (
          q.code.toLowerCase().includes(search) ||
          (q.label && q.label.toLowerCase().includes(search)) ||
          (q.tapeType && q.tapeType.toLowerCase().includes(search)) ||
          (q.colour && q.colour.toLowerCase().includes(search)) ||
          (q.colorGroup && q.colorGroup.toLowerCase().includes(search)) ||
          (q.recipeGroup && q.recipeGroup.toLowerCase().includes(search)) ||
          (q.denier && String(q.denier).includes(search)) ||
          (q.size && q.size.toLowerCase().includes(search))
        );
      });
    }

    return NextResponse.json(
      {
        success: true,
        count: qualities.length,
        qualities,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/data-centre/qualities error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch qualities", qualities: [] },
      { status: 500 }
    );
  }
}
