import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import {
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
  computeNetProductionKg,
  computeBobbinStockCount,
  computeCrateStockCount,
} from "@/lib/tape-plant/bobbin-stock";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface BobbinTransactionEntry {
  id: string;
  type: "INWARD" | "OUTWARD";
  date: string;
  shiftId: string;
  shiftName: string;
  recipeQuality: string;
  referenceNo: string;
  loomNumber?: number | null;
  loomIdentifier?: string | null;
  loomAllocations?: any;
  grossKg?: number;
  wasteKg?: number;
  netKg: number;
  bobbins: number;
  crates: number;
  operator?: string;
  receiver?: string;
  remarks?: string;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftId = searchParams.get("shiftId");
  const recipeQuality = searchParams.get("recipeQuality");
  const type = searchParams.get("type") || "ALL"; // "ALL" | "INWARD" | "OUTWARD"
  const loomNumber = searchParams.get("loomNumber");
  const search = searchParams.get("search");

  try {
    const transactions: BobbinTransactionEntry[] = [];

    // 1. Fetch Inward Transactions (Post Production Receipts) if type includes INWARD
    if (type === "ALL" || type === "INWARD") {
      const postWhere: any = {};
      if (date) postWhere.date = date;
      else if (dateFrom && dateTo) postWhere.date = { gte: dateFrom, lte: dateTo };
      else if (dateFrom) postWhere.date = { gte: dateFrom };
      else if (dateTo) postWhere.date = { lte: dateTo };

      if (shiftId && shiftId.toUpperCase() !== "ALL") {
        postWhere.shiftId = shiftId;
      }

      const postProductions = await db.tapePlantPostProduction.findMany({
        where: postWhere,
        include: { shift: { select: { id: true, name: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });

      for (const record of postProductions) {
        const entries = Array.isArray(record.entries) ? (record.entries as any[]) : [];
        const shiftName = record.shift?.name || record.shiftId;
        const operator = record.operatorName || "—";

        if (entries.length > 0) {
          entries.forEach((e, idx) => {
            const rawQuality = (e.recipeQuality || record.recipeQuality || "").trim();
            if (!rawQuality) return;

            const gross = Number(e.productionDoneKg) || 0;
            const waste = Number(e.wasteKg) || 0;
            const net = computeNetProductionKg(gross, waste);
            if (net <= 0 && gross <= 0) return;

            const bobbins = computeBobbinStockCount(net);
            const crates = computeCrateStockCount(net);
            const ref = `TP-INW-${record.date.replace(/-/g, "")}-${record.shiftId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}-${idx + 1}`;

            transactions.push({
              id: `inward-${record.id}-${idx}`,
              type: "INWARD",
              date: record.date,
              shiftId: record.shiftId,
              shiftName,
              recipeQuality: rawQuality,
              referenceNo: ref,
              grossKg: gross,
              wasteKg: waste,
              netKg: net,
              bobbins,
              crates,
              operator,
              remarks: e.remarks || "",
              createdAt: record.createdAt.toISOString(),
            });
          });
        } else if (record.recipeQuality) {
          const rawQuality = record.recipeQuality.trim();
          const gross = Number(record.productionDoneKg) || 0;
          const waste = Number(record.wasteKg) || 0;
          const net = computeNetProductionKg(gross, waste);
          const bobbins = computeBobbinStockCount(net);
          const crates = computeCrateStockCount(net);
          const ref = `TP-INW-${record.date.replace(/-/g, "")}-${record.shiftId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;

          transactions.push({
            id: `inward-${record.id}`,
            type: "INWARD",
            date: record.date,
            shiftId: record.shiftId,
            shiftName,
            recipeQuality: rawQuality,
            referenceNo: ref,
            grossKg: gross,
            wasteKg: waste,
            netKg: net,
            bobbins,
            crates,
            operator,
            remarks: "",
            createdAt: record.createdAt.toISOString(),
          });
        }
      }
    }

    // 2. Fetch Outward Transactions (Bobbin Issues to Looms) if type includes OUTWARD
    if (type === "ALL" || type === "OUTWARD") {
      const issueWhere: any = {
        status: { not: "CANCELLED" },
      };

      if (date) issueWhere.date = date;
      else if (dateFrom && dateTo) issueWhere.date = { gte: dateFrom, lte: dateTo };
      else if (dateFrom) issueWhere.date = { gte: dateFrom };
      else if (dateTo) issueWhere.date = { lte: dateTo };

      if (shiftId && shiftId.toUpperCase() !== "ALL") {
        issueWhere.shiftId = shiftId;
      }

      if (loomNumber && !isNaN(Number(loomNumber))) {
        issueWhere.loomNumber = Number(loomNumber);
      }

      const issues = await db.tapePlantBobbinIssue.findMany({
        where: issueWhere,
        include: { shift: { select: { id: true, name: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });

      for (const i of issues) {
        transactions.push({
          id: i.id,
          type: "OUTWARD",
          date: i.date,
          shiftId: i.shiftId || "shift_day",
          shiftName: i.shift?.name || i.shiftName || i.shiftId || "General Shift",
          recipeQuality: i.recipeQuality,
          referenceNo: i.slipNumber,
          loomNumber: i.loomNumber,
          loomIdentifier: i.loomIdentifier,
          loomAllocations: i.loomAllocations || null,
          netKg: Number(i.weightKg),
          bobbins: Number(i.bobbinCount),
          crates: Number(i.crateCount),
          operator: i.issuedBy || "—",
          receiver: i.receivedBy || "—",
          remarks: i.remarks || "",
          createdAt: i.createdAt.toISOString(),
        });
      }
    }

    // 3. Filter by search or recipeQuality in memory if specified
    let filtered = transactions;
    if (recipeQuality && recipeQuality.trim() !== "") {
      const q = recipeQuality.trim().toLowerCase();
      filtered = filtered.filter((t) => t.recipeQuality.toLowerCase().includes(q));
    }

    if (search && search.trim() !== "") {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.referenceNo.toLowerCase().includes(q) ||
          t.recipeQuality.toLowerCase().includes(q) ||
          (t.operator && t.operator.toLowerCase().includes(q)) ||
          (t.receiver && t.receiver.toLowerCase().includes(q)) ||
          (t.loomIdentifier && t.loomIdentifier.toLowerCase().includes(q)) ||
          (t.remarks && t.remarks.toLowerCase().includes(q))
      );
    }

    // Sort chronologically descending (newest first)
    filtered.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 4. Compute Totals & Running Balances
    const totalInwardKg = filtered
      .filter((t) => t.type === "INWARD")
      .reduce((sum, t) => sum + t.netKg, 0);
    const totalInwardBobbins = filtered
      .filter((t) => t.type === "INWARD")
      .reduce((sum, t) => sum + t.bobbins, 0);
    const totalInwardCrates = filtered
      .filter((t) => t.type === "INWARD")
      .reduce((sum, t) => sum + t.crates, 0);

    const totalOutwardKg = filtered
      .filter((t) => t.type === "OUTWARD")
      .reduce((sum, t) => sum + t.netKg, 0);
    const totalOutwardBobbins = filtered
      .filter((t) => t.type === "OUTWARD")
      .reduce((sum, t) => sum + t.bobbins, 0);
    const totalOutwardCrates = filtered
      .filter((t) => t.type === "OUTWARD")
      .reduce((sum, t) => sum + t.crates, 0);

    return NextResponse.json({
      transactions: filtered,
      totals: {
        totalTransactions: filtered.length,
        inward: {
          totalKg: Number(totalInwardKg.toFixed(2)),
          totalBobbins: Number(totalInwardBobbins.toFixed(2)),
          totalCrates: Number(totalInwardCrates.toFixed(2)),
        },
        outward: {
          totalKg: Number(totalOutwardKg.toFixed(2)),
          totalBobbins: Number(totalOutwardBobbins.toFixed(2)),
          totalCrates: Number(totalOutwardCrates.toFixed(2)),
        },
        balance: {
          netKg: Number((totalInwardKg - totalOutwardKg).toFixed(2)),
          bobbins: Number((totalInwardBobbins - totalOutwardBobbins).toFixed(2)),
          crates: Number((totalInwardCrates - totalOutwardCrates).toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching bobbin transactions ledger:", error);
    return NextResponse.json(
      { error: "Failed to fetch bobbin transactions" },
      { status: 500 }
    );
  }
}
