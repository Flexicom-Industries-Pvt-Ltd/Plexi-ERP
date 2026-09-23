import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

const SEED_OPERATORS = [
  // Tape Plant Operators
  { name: "Ramesh Kumar", code: "OP-TP-01", section: "TAPE_PLANT", sectionName: "Tape Plant", designation: "Senior Extrusion Operator", shiftPreference: "A" },
  { name: "Suresh Sharma", code: "OP-TP-02", section: "TAPE_PLANT", sectionName: "Tape Plant", designation: "Extrusion Line Operator", shiftPreference: "B" },
  { name: "Rajesh Patel", code: "OP-TP-03", section: "TAPE_PLANT", sectionName: "Tape Plant", designation: "Winder Operator", shiftPreference: "C" },
  { name: "Amit Verma", code: "OP-TP-04", section: "TAPE_PLANT", sectionName: "Tape Plant", designation: "Line Technician", shiftPreference: "GENERAL" },
  
  // Loom Operators
  { name: "Vikram Singh", code: "OP-LM-01", section: "LOOM", sectionName: "Circular Loom", designation: "Loom Master", shiftPreference: "A" },
  { name: "Manoj Yadav", code: "OP-LM-02", section: "LOOM", sectionName: "Circular Loom", designation: "Weaver / Loom Operator", shiftPreference: "B" },
  { name: "Deepak Chauhan", code: "OP-LM-03", section: "LOOM", sectionName: "Circular Loom", designation: "Beam Setter", shiftPreference: "C" },

  // Lamination Operators
  { name: "Sunil Gupta", code: "OP-LAM-01", section: "LAMINATION", sectionName: "Extrusion Lamination", designation: "Lamination Operator", shiftPreference: "A" },
  { name: "Pawan Joshi", code: "OP-LAM-02", section: "LAMINATION", sectionName: "Extrusion Lamination", designation: "Assistant Operator", shiftPreference: "B" },

  // Printing Operators
  { name: "Anil Kumar", code: "OP-PR-01", section: "PRINTING", sectionName: "Flexo Printing", designation: "Lead Printer", shiftPreference: "A" },
  { name: "Pankaj Roy", code: "OP-PR-02", section: "PRINTING", sectionName: "Flexo Printing", designation: "Plate Setter / Printer", shiftPreference: "B" },

  // Cutting & Stitching Operators
  { name: "Kishore Das", code: "OP-CS-01", section: "CUTTING", sectionName: "Cutting & Stitching", designation: "Cutting Machine Operator", shiftPreference: "A" },
  { name: "Santosh Kumar", code: "OP-CS-02", section: "CUTTING", sectionName: "Cutting & Stitching", designation: "Bale Press Operator", shiftPreference: "B" },

  // Quality Control
  { name: "Rohit Mehta", code: "OP-QC-01", section: "QUALITY_CONTROL", sectionName: "Quality Assurance", designation: "QC Inspector", shiftPreference: "GENERAL" },
  { name: "Vijay Malhotra", code: "OP-QC-02", section: "QUALITY_CONTROL", sectionName: "Quality Assurance", designation: "Lab Chemist", shiftPreference: "GENERAL" },

  // Recycling Plant
  { name: "Dinesh Prasad", code: "OP-RC-01", section: "RECYCLING_PLANT", sectionName: "Recycling / Reprocessing", designation: "Granulator Operator", shiftPreference: "A" },
  { name: "Shyam Sundar", code: "OP-RC-02", section: "RECYCLING_PLANT", sectionName: "Recycling / Reprocessing", designation: "Agglomerator Operator", shiftPreference: "B" },

  // Maintenance & Engineering
  { name: "Naresh Sharma", code: "OP-MT-01", section: "MAINTENANCE", sectionName: "Plant Maintenance", designation: "Maintenance Electrician", shiftPreference: "GENERAL" },
  { name: "Rakesh Thakur", code: "OP-MT-02", section: "MAINTENANCE", sectionName: "Plant Maintenance", designation: "Mechanical Fitter", shiftPreference: "GENERAL" },
];

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.SETTINGS],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of SEED_OPERATORS) {
      const existing = await db.operator.findUnique({
        where: { code: item.code },
      });

      if (!existing) {
        await db.operator.create({
          data: {
            ...item,
            isActive: true,
          },
        });
        createdCount++;
      } else {
        await db.operator.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            section: item.section,
            sectionName: item.sectionName,
            designation: item.designation,
            shiftPreference: item.shiftPreference,
            isActive: true,
          },
        });
        updatedCount++;
      }
    }

    await logEvent({
      action: "SEED_OPERATORS",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { createdCount, updatedCount },
      meta: { description: `Seeded ${createdCount} new and updated ${updatedCount} plant operators` },
      userId: auth.user?.id,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${createdCount} new operators and updated ${updatedCount} existing operators.`,
      createdCount,
      updatedCount,
      totalCatalog: SEED_OPERATORS.length,
    });
  } catch (error: any) {
    console.error("Error seeding operators:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to seed operators" },
      { status: 500 }
    );
  }
}
