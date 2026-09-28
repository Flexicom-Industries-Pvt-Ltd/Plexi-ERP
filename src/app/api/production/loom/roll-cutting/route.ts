import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLoomApiPermission } from "@/lib/loom/permissions";
import { logAudit } from "@/lib/audit-logger";
import {
  LoomRollCuttingEntryItem,
  computeRollMeters,
  computeRollWeightsAndAvg,
  generateNextRollNumber,
} from "@/lib/loom/loom-roll-cutting-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getNormalizedShiftCandidates(shiftName: string): string[] {
  const clean = (shiftName || "").trim();
  const upper = clean.toUpperCase();
  const candidates = new Set<string>([clean, upper, clean.toLowerCase()]);
  if (upper === "DAY" || upper === "DAY SHIFT" || upper === "SHIFT A") {
    candidates.add("DAY");
    candidates.add("Day Shift");
    candidates.add("Day");
    candidates.add("Shift A");
    candidates.add("DAY SHIFT");
  } else if (upper === "NIGHT" || upper === "NIGHT SHIFT" || upper === "SHIFT B") {
    candidates.add("NIGHT");
    candidates.add("Night Shift");
    candidates.add("Night");
    candidates.add("Shift B");
    candidates.add("NIGHT SHIFT");
  }
  return Array.from(candidates);
}

export async function GET(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const shiftNameParam = searchParams.get("shiftName") || "DAY";
  const search = searchParams.get("search")?.toLowerCase().trim() || "";

  try {
    const candidateShiftNames = getNormalizedShiftCandidates(shiftNameParam);

    // Fetch existing report, shifts, operators, contractors, loom mappings, tape recipes, and last roll number concurrently
    const [shifts, operators, contractors, mappings, tapeRecipes, existingReport, lastEntry] = await Promise.all([
      db.shift.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      db.operator.findMany({
        where: { isActive: true },
        orderBy: [{ section: "asc" }, { name: "asc" }],
      }),
      db.contractor.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      db.loomMachineMapping.findMany({
        where: { isActive: true },
        orderBy: [{ colorGroup: "asc" }, { qualityCode: "asc" }],
      }),
      db.tapePlantRecipe.findMany({
        where: { isActive: true },
        orderBy: [{ colorGroup: "asc" }, { code: "asc" }],
      }),
      db.loomRollCuttingReport.findFirst({
        where: {
          date: dateParam,
          shiftName: { in: candidateShiftNames },
        },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      }),
      db.loomRollCuttingEntry.findFirst({
        orderBy: { createdAt: "desc" },
        select: { rollNumber: true },
      }),
    ]);

    // Build qualities catalog
    const qualityMap = new Map<string, {
      code: string;
      colorGroup: string;
      colour: string;
      denier: number | null;
      reedSpaceCm: number | null;
      size: string;
    }>();

    tapeRecipes.forEach((r) => {
      qualityMap.set(r.code, {
        code: r.code,
        colorGroup: r.colorGroup || "Standard",
        colour: r.colour || "White",
        denier: r.denier ?? null,
        reedSpaceCm: r.spacerSize ?? null,
        size: r.spacerSize ? String(r.spacerSize * 10) : r.tapeWidth ? String(r.tapeWidth) : "",
      });
    });

    mappings.forEach((m) => {
      const existing = qualityMap.get(m.qualityCode);
      qualityMap.set(m.qualityCode, {
        code: m.qualityCode,
        colorGroup: m.colorGroup || existing?.colorGroup || "Standard",
        colour: m.colour || existing?.colour || "White",
        denier: m.denier ?? existing?.denier ?? null,
        reedSpaceCm: m.reedSpaceCm ?? existing?.reedSpaceCm ?? null,
        size: m.reedSpaceCm ? String(m.reedSpaceCm * 10) : m.tapeWidth ? String(m.tapeWidth) : existing?.size || "",
      });
    });

    const availableQualities = Array.from(qualityMap.values()).sort((a, b) => a.code.localeCompare(b.code));

    // Build loom allocation quick-reference map
    const loomAllocations: Record<number, { qualityCode: string; size: string; denier: string }> = {};
    for (const mapping of mappings) {
      const qSpec = qualityMap.get(mapping.qualityCode);
      for (const loomNum of mapping.loomNumbers) {
        loomAllocations[loomNum] = {
          qualityCode: mapping.qualityCode,
          size: qSpec?.size || (mapping.reedSpaceCm ? String(mapping.reedSpaceCm * 10) : ""),
          denier: qSpec?.denier ? String(qSpec.denier) : (mapping.denier ? String(mapping.denier) : ""),
        };
      }
    }

    // Process entries
    let entries: LoomRollCuttingEntryItem[] = [];
    if (existingReport && existingReport.entries.length > 0) {
      entries = existingReport.entries.map((e, idx) => {
        const meter = computeRollMeters(e.initialReading, e.finalReading);
        const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(
          meter,
          e.grossWeightKg,
          e.tareWeightKg
        );

        return {
          id: e.id,
          sequence: e.sequence || idx + 1,
          rollNumber: e.rollNumber,
          loomNumber: e.loomNumber,
          size: e.size || "",
          qualityType: e.qualityType,
          initialReading: e.initialReading,
          finalReading: e.finalReading,
          meter,
          grossWeightKg: e.grossWeightKg,
          tareWeightKg: e.tareWeightKg,
          nettWeightKg,
          avgWeightPerMeter,
          contractor: e.contractor || "",
          supervisorSign: e.supervisorSign || "",
          remarks: e.remarks || "",
          productionRollId: e.productionRollId || null,
        };
      });
    }

    // Calculate report totals & KPIs
    const totalRollsCount = entries.length;
    const totalMeters = Math.round(entries.reduce((s, e) => s + (Number(e.meter) || 0), 0) * 100) / 100;
    const totalGrossWtKg = Math.round(entries.reduce((s, e) => s + (Number(e.grossWeightKg) || 0), 0) * 100) / 100;
    const totalTareWtKg = Math.round(
      entries.reduce((s, e) => {
        const tareVal = e.tareWeightKg !== "" && e.tareWeightKg !== null && e.tareWeightKg !== undefined
          ? (!isNaN(Number(e.tareWeightKg)) ? Number(e.tareWeightKg) : 1.2)
          : 1.2;
        return s + tareVal;
      }, 0) * 100
    ) / 100;
    const totalNettWtKg = Math.round(entries.reduce((s, e) => s + (Number(e.nettWeightKg) || 0), 0) * 100) / 100;
    const averageWeightPerMeter = totalMeters > 0 && totalNettWtKg > 0
      ? Math.round(((totalNettWtKg * 1000) / totalMeters) * 10) / 10
      : 0;

    const uniqueLooms = new Set(entries.map((e) => e.loomNumber));

    // Optional Search Filter
    let filteredEntries = entries;
    if (search) {
      filteredEntries = entries.filter((e) =>
        e.rollNumber.toLowerCase().includes(search) ||
        String(e.loomNumber).includes(search) ||
        `#${e.loomNumber}`.includes(search) ||
        (e.qualityType && e.qualityType.toLowerCase().includes(search)) ||
        (e.contractor && e.contractor.toLowerCase().includes(search)) ||
        (e.size && e.size.toLowerCase().includes(search)) ||
        (e.supervisorSign && e.supervisorSign.toLowerCase().includes(search)) ||
        (e.remarks && e.remarks.toLowerCase().includes(search))
      );
    }

    const suggestedNextRoll = generateNextRollNumber(
      entries.length > 0
        ? entries[entries.length - 1].rollNumber
        : lastEntry?.rollNumber || "CT-14376"
    );

    return NextResponse.json({
      report: {
        id: existingReport?.id || null,
        date: dateParam,
        shiftName: shiftNameParam,
        supervisorName: existingReport?.supervisorName || "",
        preparedBy: existingReport?.preparedBy || "",
        checkedBy: existingReport?.checkedBy || "",
        approvedBy: existingReport?.approvedBy || "",
        status: existingReport?.status || "DRAFT",
        remarks: existingReport?.remarks || "",
        totalRollsCount,
        totalMeters,
        totalGrossWtKg,
        totalTareWtKg,
        totalNettWtKg,
        averageWeightPerMeter,
        createdAt: existingReport?.createdAt?.toISOString(),
        updatedAt: existingReport?.updatedAt?.toISOString(),
      },
      entries: filteredEntries,
      kpis: {
        totalRollsCount,
        totalMeters,
        totalGrossWtKg,
        totalTareWtKg,
        totalNettWtKg,
        averageWeightPerMeter,
        activeLoomsCount: uniqueLooms.size,
      },
      availableShifts: shifts.map((s) => ({ id: s.id, name: s.name })),
      availableOperators: operators.map((o) => ({
        id: o.id,
        name: o.name,
        employeeCode: o.code,
        section: o.section,
        designation: o.designation,
      })),
      availableContractors: contractors.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        section: c.section,
      })),
      availableQualities,
      loomAllocations,
      suggestedNextRollNumber: suggestedNextRoll,
    });
  } catch (error: any) {
    console.error("GET /api/production/loom/roll-cutting error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch Roll Cutting Report" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const action = body.action || "SAVE_REPORT";
    const date = body.date || new Date().toISOString().slice(0, 10);
    const shiftName = body.shiftName || "Day Shift";
    const userEmail = authResult.session?.user?.email || "System User";

    // -------------------------------------------------------------
    // ACTION 1: SAVE_REPORT
    // -------------------------------------------------------------
    if (action === "SAVE_REPORT") {
      const {
        entries = [],
        supervisorName = "",
        preparedBy = "",
        checkedBy = "",
        approvedBy = "",
        remarks = "",
        status = "DRAFT",
      } = body;

      let reportTotalMeters = 0;
      let reportTotalGross = 0;
      let reportTotalTare = 0;
      let reportTotalNett = 0;

      const processedEntries = (entries as LoomRollCuttingEntryItem[]).map((e, idx) => {
        const initRdg = e.initialReading !== "" && e.initialReading !== null && e.initialReading !== undefined
          ? (Number(e.initialReading) || 0)
          : 0;
        const finalRdg = e.finalReading !== "" && e.finalReading !== null && e.finalReading !== undefined
          ? (Number(e.finalReading) || 0)
          : 0;
        const meter = computeRollMeters(initRdg, finalRdg);
        const gross = e.grossWeightKg !== "" && e.grossWeightKg !== null && e.grossWeightKg !== undefined
          ? (Number(e.grossWeightKg) || 0)
          : 0;
        const tare = e.tareWeightKg !== "" && e.tareWeightKg !== null && e.tareWeightKg !== undefined
          ? (!isNaN(Number(e.tareWeightKg)) && Number(e.tareWeightKg) >= 0 ? Number(e.tareWeightKg) : 1.2)
          : 1.2;
        const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(meter, gross, tare);

        reportTotalMeters += meter;
        reportTotalGross += gross;
        reportTotalTare += tare;
        reportTotalNett += nettWeightKg;

        return {
          sequence: idx + 1,
          rollNumber: (e.rollNumber || `ROLL-${idx + 1}`).trim().toUpperCase(),
          loomNumber: Number(e.loomNumber) || 1,
          size: e.size?.trim() || null,
          qualityType: (e.qualityType || "STANDARD").trim(),
          contractor: e.contractor?.trim() || null,
          initialReading: initRdg,
          finalReading: finalRdg,
          meter,
          grossWeightKg: gross,
          tareWeightKg: tare,
          nettWeightKg,
          avgWeightPerMeter,
          supervisorSign: e.supervisorSign?.trim() || supervisorName?.trim() || null,
          remarks: e.remarks?.trim() || null,
          productionRollId: e.productionRollId || null,
        };
      });

      const averageWeightPerMeter = reportTotalMeters > 0 && reportTotalNett > 0
        ? Math.round(((reportTotalNett * 1000) / reportTotalMeters) * 10) / 10
        : 0;

      const candidateShiftNames = getNormalizedShiftCandidates(shiftName);
      const existingReport = await db.loomRollCuttingReport.findFirst({
        where: {
          date,
          shiftName: { in: candidateShiftNames },
        },
      });

      const targetShiftName = existingReport?.shiftName || shiftName;

      // Upsert report header
      const savedReport = await db.loomRollCuttingReport.upsert({
        where: {
          date_shiftName: {
            date,
            shiftName: targetShiftName,
          },
        },
        update: {
          supervisorName,
          preparedBy: preparedBy || userEmail,
          checkedBy,
          approvedBy,
          totalRollsCount: processedEntries.length,
          totalMeters: reportTotalMeters,
          totalGrossWtKg: reportTotalGross,
          totalTareWtKg: reportTotalTare,
          totalNettWtKg: reportTotalNett,
          averageWeightPerMeter,
          status,
          remarks,
        },
        create: {
          date,
          shiftName: targetShiftName,
          supervisorName,
          preparedBy: preparedBy || userEmail,
          checkedBy,
          approvedBy,
          totalRollsCount: processedEntries.length,
          totalMeters: reportTotalMeters,
          totalGrossWtKg: reportTotalGross,
          totalTareWtKg: reportTotalTare,
          totalNettWtKg: reportTotalNett,
          averageWeightPerMeter,
          status,
          remarks,
        },
      });

      // Replace entries
      await db.loomRollCuttingEntry.deleteMany({
        where: { reportId: savedReport.id },
      });

      if (processedEntries.length > 0) {
        await db.loomRollCuttingEntry.createMany({
          data: processedEntries.map((item) => ({
            reportId: savedReport.id,
            sequence: item.sequence,
            rollNumber: item.rollNumber,
            loomNumber: item.loomNumber,
            size: item.size,
            qualityType: item.qualityType,
            contractor: item.contractor,
            initialReading: item.initialReading,
            finalReading: item.finalReading,
            meter: item.meter,
            grossWeightKg: item.grossWeightKg,
            tareWeightKg: item.tareWeightKg,
            nettWeightKg: item.nettWeightKg,
            avgWeightPerMeter: item.avgWeightPerMeter,
            supervisorSign: item.supervisorSign,
            remarks: item.remarks,
            productionRollId: item.productionRollId,
          })),
        });

        // -------------------------------------------------------------
        // Sync to Central ProductionRoll Inventory / Quality Stage
        // -------------------------------------------------------------
        for (const item of processedEntries) {
          if (item.rollNumber && item.meter > 0) {
            try {
              const rollType = item.qualityType.toUpperCase().includes("LPP") ? "LPP" : "PP";
              const weightVal = item.nettWeightKg > 0 ? item.nettWeightKg : Math.round(item.meter * 0.16 * 100) / 100;

              await db.productionRoll.upsert({
                where: { rollNumber: item.rollNumber },
                create: {
                  rollNumber: item.rollNumber,
                  rollType,
                  weight: weightVal,
                  length: item.meter,
                  qualityStatus: "PASSED",
                  sourcePhase: "LOOM",
                  characteristics: {
                    loomNumber: item.loomNumber,
                    qualityType: item.qualityType,
                    size: item.size,
                    initialReading: item.initialReading,
                    finalReading: item.finalReading,
                    grossWeightKg: item.grossWeightKg,
                    tareWeightKg: item.tareWeightKg,
                    nettWeightKg: item.nettWeightKg,
                    avgWeightPerMeter: item.avgWeightPerMeter,
                    date,
                    shiftName: targetShiftName,
                    supervisorSign: item.supervisorSign,
                  },
                  remarks: `Loom #${item.loomNumber} Roll Cut: ${item.qualityType} (${item.meter}m, ${weightVal}kg)`,
                },
                update: {
                  rollType,
                  weight: weightVal,
                  length: item.meter,
                  characteristics: {
                    loomNumber: item.loomNumber,
                    qualityType: item.qualityType,
                    size: item.size,
                    initialReading: item.initialReading,
                    finalReading: item.finalReading,
                    grossWeightKg: item.grossWeightKg,
                    tareWeightKg: item.tareWeightKg,
                    nettWeightKg: item.nettWeightKg,
                    avgWeightPerMeter: item.avgWeightPerMeter,
                    date,
                    shiftName: targetShiftName,
                    supervisorSign: item.supervisorSign,
                  },
                  remarks: `Loom #${item.loomNumber} Roll Cut: ${item.qualityType} (${item.meter}m, ${weightVal}kg)`,
                },
              }).catch((e) => console.error(`Roll stock sync notice for ${item.rollNumber}:`, e?.message));
            } catch (syncErr) {
              console.error(`Roll sync error for ${item.rollNumber}:`, syncErr);
            }
          }
        }
      }

      await logAudit({
        action: "UPDATE",
        module: "LOOM",
        entityId: savedReport.id,
        newValues: {
          details: `Saved Daily Loom Roll Cutting Report for ${date} (${targetShiftName}): ${processedEntries.length} rolls, ${reportTotalMeters.toLocaleString()}m, ${reportTotalNett.toFixed(2)}kg nett weight, avg ${averageWeightPerMeter} g/m.`,
        },
      });

      return NextResponse.json({
        success: true,
        reportId: savedReport.id,
        totalRollsCount: processedEntries.length,
        totalMeters: reportTotalMeters,
        totalGrossWtKg: reportTotalGross,
        totalTareWtKg: reportTotalTare,
        totalNettWtKg: reportTotalNett,
        averageWeightPerMeter,
        message: "Daily Loom Roll Cutting Report saved successfully",
      });
    }

    // -------------------------------------------------------------
    // ACTION 2: AUTO_PREFILL_FROM_SHEET
    // Pulls running looms with production/readings from the 2-Hour Sheet for quick roll logging
    // -------------------------------------------------------------
    if (action === "AUTO_PREFILL_FROM_SHEET") {
      const candidateShiftNames = getNormalizedShiftCandidates(shiftName);
      const sheet = await db.loomReadingSheet.findFirst({
        where: {
          date,
          shiftName: { in: candidateShiftNames },
        },
        include: {
          entries: {
            orderBy: [{ loomNumber: "asc" }, { rowSequence: "asc" }],
          },
        },
      });

      if (!sheet || sheet.entries.length === 0) {
        return NextResponse.json({
          success: false,
          message: "No 2-Hour Reading Sheet found for the selected date and shift.",
        });
      }

      let currentRollSequence = 14370;
      const prefilledEntries: LoomRollCuttingEntryItem[] = [];

      sheet.entries.forEach((e) => {
        const hasProd = (e.totalProduction || 0) > 0;
        const hasReadings = e.initialReading !== null && (e.r6Reading !== null || e.r5Reading !== null || e.r4Reading !== null || e.r3Reading !== null || e.r2Reading !== null || e.r1Reading !== null);
        
        if (hasProd || hasReadings) {
          const initRdg = e.initialReading ?? 0;
          const finalRdg = e.r6Reading ?? e.r5Reading ?? e.r4Reading ?? e.r3Reading ?? e.r2Reading ?? e.r1Reading ?? (initRdg + (e.totalProduction || 0));
          const meter = computeRollMeters(initRdg, finalRdg);
          const estGross = Math.round((meter * 0.16 + 1.2) * 100) / 100;
          const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(meter, estGross, 1.2);

          currentRollSequence += 1;
          const rollNumber = `CT-${currentRollSequence}`;

          prefilledEntries.push({
            sequence: prefilledEntries.length + 1,
            rollNumber,
            loomNumber: e.loomNumber,
            size: e.size || "490",
            qualityType: e.qualityType || "Mahal/LPP/W",
            initialReading: initRdg,
            finalReading: finalRdg,
            meter,
            grossWeightKg: estGross,
            tareWeightKg: 1.2,
            nettWeightKg,
            avgWeightPerMeter,
            supervisorSign: sheet.preparedBy || "",
            remarks: e.breakdownReason ? `Changeover / Note: ${e.breakdownReason}` : "",
          });
        }
      });

      return NextResponse.json({
        success: true,
        count: prefilledEntries.length,
        entries: prefilledEntries,
        message: `Generated ${prefilledEntries.length} roll cutting rows from 2-Hour Reading Sheet.`,
      });
    }

    // -------------------------------------------------------------
    // ACTION 3: DELETE_REPORT
    // -------------------------------------------------------------
    if (action === "DELETE_REPORT") {
      const existing = await db.loomRollCuttingReport.findUnique({
        where: { date_shiftName: { date, shiftName } },
      });

      if (existing) {
        await db.loomRollCuttingReport.delete({
          where: { id: existing.id },
        });

        await logAudit({
          action: "DELETE",
          module: "LOOM",
          entityId: existing.id,
          newValues: {
            details: `Deleted Daily Loom Roll Cutting Report for ${date} (${shiftName})`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Daily Loom Roll Cutting Report reset to clean blank state",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/production/loom/roll-cutting error:", error);
    return NextResponse.json({ error: error.message || "Failed to process Roll Cutting action" }, { status: 500 });
  }
}
