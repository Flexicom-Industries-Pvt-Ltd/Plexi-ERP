import { db } from "@/lib/db";

export interface RollTraceResult {
  rollNumber: string;
  found: boolean;
  currentStage: "LOOM" | "LAMINATION" | "PRINTING" | "CONVERTEX" | "VALVOMATIC" | "UNKNOWN";
  currentStageLabel: string;
  stageBadgeColor: string;
  specs: {
    qualityType: string;
    widthMm?: string | number | null;
    initialMeters?: number;
    initialNettWeightKg?: number;
    avgWeightPerMeter?: number | null;
  };
  stages: {
    loom?: {
      date?: string | null;
      shiftName?: string | null;
      supervisorName?: string | null;
      loomNumber: number;
      sequence: number;
      qualityType: string;
      size?: string | null;
      initialReading: number;
      finalReading: number;
      meter: number;
      grossWeightKg: number;
      tareWeightKg: number;
      nettWeightKg: number;
      avgWeightPerMeter?: number | null;
      supervisorSign?: string | null;
      contractor?: string | null;
      photoUrl?: string | null;
      remarks?: string | null;
      createdAt: string;
    } | null;
    lamination?: {
      date?: string | null;
      shiftName?: string | null;
      supervisorName?: string | null;
      quality: string;
      size?: string | null;
      loomNumber: number;
      rollMeter: number;
      netWeightBefore: number;
      avgWeightBefore: number;
      productionMeter: number;
      netWeightAfter: number;
      avgWeightAfter: number;
      coating: number;
      remarks?: string | null;
      createdAt: string;
    } | null;
    printing?: {
      date?: string | null;
      shiftName?: string | null;
      supervisorName?: string | null;
      companyName?: string | null;
      unitName?: string | null;
      grade?: string | null;
      quality: string;
      loomNumber: string;
      drumSize?: string | null;
      productionMeter: number;
      netWeight: number;
      avgWeight: number;
      printMeter: number;
      remarks?: string | null;
      createdAt: string;
    } | null;
    conversion?: {
      type: "CONVERTEX" | "VALVOMATIC";
      date?: string | null;
      shiftName?: string | null;
      supervisorName?: string | null;
      companyName?: string | null;
      unitName?: string | null;
      grade?: string | null;
      quality?: string | null;
      productionPcs: number;
      productionKg?: number | null;
      loomFabricWasteKg: number;
      lamFabricWasteKg: number;
      printFabricWasteKg: number;
      coverPatchOs?: number | null;
      coverPatchDs?: number | null;
      valvePatch?: number | null;
      remarks?: string | null;
      createdAt: string;
    } | null;
    productionRoll?: {
      id: string;
      rollType: string;
      qualityStatus: string;
      characteristics?: any;
      weight?: number | null;
      length?: number | null;
      consumedAt?: string | null;
      locationName?: string | null;
      remarks?: string | null;
    } | null;
  };
  timeline: Array<{
    stage: string;
    title: string;
    date?: string;
    shift?: string;
    operatorOrSupervisor?: string;
    status: "COMPLETED" | "CURRENT" | "PENDING";
    details: Record<string, any>;
  }>;
}

export async function traceRollByNumber(rawRollNumber: string): Promise<RollTraceResult> {
  const clean = (rawRollNumber || "").trim();
  if (!clean) {
    return {
      rollNumber: "",
      found: false,
      currentStage: "UNKNOWN",
      currentStageLabel: "Not Found",
      stageBadgeColor: "bg-slate-100 text-slate-700",
      specs: { qualityType: "—" },
      stages: {},
      timeline: [],
    };
  }

  // Parallel lookup across all production stages
  const [
    loomEntry,
    lamEntry,
    printEntry,
    convertexEntry,
    valvomaticEntry,
    centralRoll,
  ] = await Promise.all([
    db.loomRollCuttingEntry.findFirst({
      where: { rollNumber: { equals: clean, mode: "insensitive" } },
      include: { report: true },
    }),
    db.laminationProductionEntry.findFirst({
      where: { rollNumber: { equals: clean, mode: "insensitive" } },
      include: { report: true },
    }),
    db.printingDailyReportEntry.findFirst({
      where: { rollNumber: { equals: clean, mode: "insensitive" } },
      include: { report: true },
    }),
    db.convertexDailyReportEntry.findFirst({
      where: { rollNumber: { equals: clean, mode: "insensitive" } },
      include: { report: true },
    }),
    db.valvomaticDailyReportEntry.findFirst({
      where: { rollNumber: { equals: clean, mode: "insensitive" } },
      include: { report: true },
    }),
    db.productionRoll.findFirst({
      where: { rollNumber: { equals: clean, mode: "insensitive" } },
      include: { location: true },
    }),
  ]);

  const hasAnyRecord =
    Boolean(loomEntry) ||
    Boolean(lamEntry) ||
    Boolean(printEntry) ||
    Boolean(convertexEntry) ||
    Boolean(valvomaticEntry) ||
    Boolean(centralRoll);

  if (!hasAnyRecord) {
    return {
      rollNumber: clean,
      found: false,
      currentStage: "UNKNOWN",
      currentStageLabel: "Roll Not Found",
      stageBadgeColor: "bg-slate-100 text-slate-700",
      specs: { qualityType: "—" },
      stages: {},
      timeline: [],
    };
  }

  // Determine current lifecycle stage
  let currentStage: RollTraceResult["currentStage"] = "UNKNOWN";
  let currentStageLabel = "In Production";
  let stageBadgeColor = "bg-amber-100 text-amber-800 border-amber-300";

  if (valvomaticEntry) {
    currentStage = "VALVOMATIC";
    currentStageLabel = "Converted to Valve Bags";
    stageBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
  } else if (convertexEntry) {
    currentStage = "CONVERTEX";
    currentStageLabel = "Converted to Bags";
    stageBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
  } else if (printEntry) {
    currentStage = "PRINTING";
    currentStageLabel = "Printed (Ready for Conversion)";
    stageBadgeColor = "bg-purple-100 text-purple-800 border-purple-300";
  } else if (lamEntry) {
    currentStage = "LAMINATION";
    currentStageLabel = "Laminated (Ready for Print / Conversion)";
    stageBadgeColor = "bg-blue-100 text-blue-800 border-blue-300";
  } else if (loomEntry) {
    currentStage = "LOOM";
    currentStageLabel = "Loom Roll (Roll Stock)";
    stageBadgeColor = "bg-sky-100 text-sky-800 border-sky-300";
  }

  // Specs extraction
  const qualityType =
    loomEntry?.qualityType ||
    lamEntry?.quality ||
    printEntry?.quality ||
    convertexEntry?.quality ||
    valvomaticEntry?.quality ||
    "—";

  const widthMm = loomEntry?.size || lamEntry?.size || null;
  const initialMeters = loomEntry?.meter || lamEntry?.rollMeter || printEntry?.productionMeter || 0;
  const initialNettWeightKg = loomEntry?.nettWeightKg || lamEntry?.netWeightBefore || 0;
  const avgWeightPerMeter = loomEntry?.avgWeightPerMeter || lamEntry?.avgWeightBefore || null;

  // Conversion data consolidation
  const conversionEntry = convertexEntry
    ? {
        type: "CONVERTEX" as const,
        date: convertexEntry.report?.date,
        shiftName: convertexEntry.report?.shiftName,
        supervisorName: convertexEntry.report?.supervisorName,
        companyName: convertexEntry.companyName,
        unitName: convertexEntry.unitName,
        grade: convertexEntry.grade,
        quality: convertexEntry.quality,
        productionPcs: convertexEntry.productionPcs,
        productionKg: convertexEntry.productionKg,
        loomFabricWasteKg: convertexEntry.loomFabricWasteKg,
        lamFabricWasteKg: convertexEntry.lamFabricWasteKg,
        printFabricWasteKg: convertexEntry.printFabricWasteKg,
        coverPatchOs: convertexEntry.coverPatchOs,
        coverPatchDs: convertexEntry.coverPatchDs,
        valvePatch: convertexEntry.valvePatch,
        createdAt: convertexEntry.createdAt.toISOString(),
      }
    : valvomaticEntry
    ? {
        type: "VALVOMATIC" as const,
        date: valvomaticEntry.report?.date,
        shiftName: valvomaticEntry.report?.shiftName,
        supervisorName: valvomaticEntry.report?.supervisorName,
        companyName: valvomaticEntry.companyName,
        unitName: valvomaticEntry.unitName,
        grade: valvomaticEntry.grade,
        quality: valvomaticEntry.quality,
        productionPcs: valvomaticEntry.productionPcs,
        productionKg: valvomaticEntry.productionKg,
        loomFabricWasteKg: valvomaticEntry.loomFabricWasteKg,
        lamFabricWasteKg: valvomaticEntry.lamFabricWasteKg,
        printFabricWasteKg: valvomaticEntry.printFabricWasteKg,
        coverPatchOs: valvomaticEntry.coverPatchOs,
        coverPatchDs: valvomaticEntry.coverPatchDs,
        valvePatch: valvomaticEntry.valvePatch,
        createdAt: valvomaticEntry.createdAt.toISOString(),
      }
    : null;

  // Build sequential timeline
  const timeline: RollTraceResult["timeline"] = [];

  // Stage 1: Loom Weaving & Cutting
  timeline.push({
    stage: "LOOM",
    title: "Loom Section",
    date: loomEntry?.report?.date,
    shift: loomEntry?.report?.shiftName,
    operatorOrSupervisor: loomEntry?.supervisorSign || loomEntry?.report?.supervisorName || loomEntry?.contractor || undefined,
    status: loomEntry ? "COMPLETED" : "PENDING",
    details: loomEntry
      ? {
          loomNumber: loomEntry.loomNumber,
          cutSequence: loomEntry.sequence,
          metersCut: `${loomEntry.meter} m`,
          netWeight: `${loomEntry.nettWeightKg} kg`,
          grossWeight: `${loomEntry.grossWeightKg} kg`,
          tareWeight: `${loomEntry.tareWeightKg} kg`,
          avgGsmOrWtM: loomEntry.avgWeightPerMeter ? `${loomEntry.avgWeightPerMeter.toFixed(2)} g/m` : "—",
          contractor: loomEntry.contractor || "—",
          photoAvailable: Boolean(loomEntry.photoUrl),
          photoUrl: loomEntry.photoUrl,
        }
      : {},
  });

  // Stage 2: Lamination
  const isLamCurrent = currentStage === "LAMINATION";
  timeline.push({
    stage: "LAMINATION",
    title: "Lamination",
    date: lamEntry?.report?.date,
    shift: lamEntry?.report?.shiftName,
    operatorOrSupervisor: lamEntry?.report?.supervisorName || undefined,
    status: lamEntry ? (isLamCurrent ? "CURRENT" : "COMPLETED") : "PENDING",
    details: lamEntry
      ? {
          quality: lamEntry.quality,
          metersLaminated: `${lamEntry.productionMeter} m`,
          netWeightAfter: `${lamEntry.netWeightAfter} kg`,
          coatingApplied: `${lamEntry.coating} g/m`,
          weightGainKg: (lamEntry.netWeightAfter - lamEntry.netWeightBefore).toFixed(2) + " kg",
          remarks: lamEntry.remarks || "—",
        }
      : {},
  });

  // Stage 3: Printing
  const isPrintCurrent = currentStage === "PRINTING";
  timeline.push({
    stage: "PRINTING",
    title: "Printing",
    date: printEntry?.report?.date,
    shift: printEntry?.report?.shiftName,
    operatorOrSupervisor: printEntry?.report?.supervisorName || undefined,
    status: printEntry ? (isPrintCurrent ? "CURRENT" : "COMPLETED") : "PENDING",
    details: printEntry
      ? {
          brand: printEntry.companyName || "—",
          unit: printEntry.unitName || "—",
          grade: printEntry.grade || "—",
          drumSize: printEntry.drumSize || "—",
          printedMeters: `${printEntry.printMeter || printEntry.productionMeter} m`,
          netWeight: `${printEntry.netWeight} kg`,
          remarks: printEntry.remarks || "—",
        }
      : {},
  });

  // Stage 4: Conversion / Bag Making
  const isConverted = Boolean(conversionEntry);
  timeline.push({
    stage: "CONVERSION",
    title: conversionEntry ? `${conversionEntry.type} (Bag Conversion)` : "Convertex / Valvomatic",
    date: conversionEntry?.date,
    shift: conversionEntry?.shiftName,
    operatorOrSupervisor: conversionEntry?.supervisorName || undefined,
    status: isConverted ? "COMPLETED" : "PENDING",
    details: conversionEntry
      ? {
          machineType: conversionEntry.type,
          bagsProduced: `${conversionEntry.productionPcs.toLocaleString()} pcs`,
          productionKg: conversionEntry.productionKg ? `${conversionEntry.productionKg} kg` : "—",
          brand: conversionEntry.companyName || "—",
          grade: conversionEntry.grade || "—",
          loomFabricWaste: `${conversionEntry.loomFabricWasteKg} kg`,
          lamFabricWaste: `${conversionEntry.lamFabricWasteKg} kg`,
          printFabricWaste: `${conversionEntry.printFabricWasteKg} kg`,
          totalWaste: `${(conversionEntry.loomFabricWasteKg + conversionEntry.lamFabricWasteKg + conversionEntry.printFabricWasteKg).toFixed(2)} kg`,
        }
      : {},
  });

  return {
    rollNumber: clean,
    found: true,
    currentStage,
    currentStageLabel,
    stageBadgeColor,
    specs: {
      qualityType,
      widthMm,
      initialMeters,
      initialNettWeightKg,
      avgWeightPerMeter,
    },
    stages: {
      loom: loomEntry
        ? {
            date: loomEntry.report?.date,
            shiftName: loomEntry.report?.shiftName,
            supervisorName: loomEntry.report?.supervisorName,
            loomNumber: loomEntry.loomNumber,
            sequence: loomEntry.sequence,
            qualityType: loomEntry.qualityType,
            size: loomEntry.size,
            initialReading: loomEntry.initialReading,
            finalReading: loomEntry.finalReading,
            meter: loomEntry.meter,
            grossWeightKg: loomEntry.grossWeightKg,
            tareWeightKg: loomEntry.tareWeightKg,
            nettWeightKg: loomEntry.nettWeightKg,
            avgWeightPerMeter: loomEntry.avgWeightPerMeter,
            supervisorSign: loomEntry.supervisorSign,
            contractor: loomEntry.contractor,
            photoUrl: loomEntry.photoUrl,
            remarks: loomEntry.remarks,
            createdAt: loomEntry.createdAt.toISOString(),
          }
        : null,
      lamination: lamEntry
        ? {
            date: lamEntry.report?.date,
            shiftName: lamEntry.report?.shiftName,
            supervisorName: lamEntry.report?.supervisorName,
            quality: lamEntry.quality,
            size: lamEntry.size,
            loomNumber: lamEntry.loomNumber,
            rollMeter: lamEntry.rollMeter,
            netWeightBefore: lamEntry.netWeightBefore,
            avgWeightBefore: lamEntry.avgWeightBefore,
            productionMeter: lamEntry.productionMeter,
            netWeightAfter: lamEntry.netWeightAfter,
            avgWeightAfter: lamEntry.avgWeightAfter,
            coating: lamEntry.coating,
            remarks: lamEntry.remarks,
            createdAt: lamEntry.createdAt.toISOString(),
          }
        : null,
      printing: printEntry
        ? {
            date: printEntry.report?.date,
            shiftName: printEntry.report?.shiftName,
            supervisorName: printEntry.report?.supervisorName,
            companyName: printEntry.companyName,
            unitName: printEntry.unitName,
            grade: printEntry.grade,
            quality: printEntry.quality,
            loomNumber: printEntry.loomNumber,
            drumSize: printEntry.drumSize,
            productionMeter: printEntry.productionMeter,
            netWeight: printEntry.netWeight,
            avgWeight: printEntry.avgWeight,
            printMeter: printEntry.printMeter,
            remarks: printEntry.remarks,
            createdAt: printEntry.createdAt.toISOString(),
          }
        : null,
      conversion: conversionEntry,
      productionRoll: centralRoll
        ? {
            id: centralRoll.id,
            rollType: centralRoll.rollType,
            qualityStatus: centralRoll.qualityStatus,
            characteristics: centralRoll.characteristics,
            weight: centralRoll.weight,
            length: centralRoll.length,
            consumedAt: centralRoll.consumedAt?.toISOString() || null,
            locationName: centralRoll.location?.name || null,
            remarks: centralRoll.remarks,
          }
        : null,
    },
    timeline,
  };
}

export async function listRecentRolls(limit: number = 25) {
  const rolls = await db.loomRollCuttingEntry.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      report: {
        select: {
          date: true,
          shiftName: true,
          supervisorName: true,
        },
      },
    },
  });

  return rolls.map((r) => ({
    id: r.id,
    rollNumber: r.rollNumber,
    loomNumber: r.loomNumber,
    size: r.size,
    qualityType: r.qualityType,
    meter: r.meter,
    nettWeightKg: r.nettWeightKg,
    date: r.report?.date,
    shiftName: r.report?.shiftName,
    supervisor: r.supervisorSign || r.report?.supervisorName || "—",
    hasPhoto: Boolean(r.photoUrl),
    createdAt: r.createdAt.toISOString(),
  }));
}
