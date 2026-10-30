import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AttendanceImportService } from "@/lib/hr/attendance-import";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.HR, Module.SETTINGS, Module.DATA_CENTRE],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "commit"; // "validate" or "commit"

    if (!file) {
      return apiError("No file uploaded", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse and validate file
    const { records, validation } = AttendanceImportService.parseFile(buffer);

    if (mode === "validate") {
      return apiSuccess({ validation });
    }

    if (records.length === 0) {
      return apiError("No valid attendance rows found in the uploaded file", 400);
    }

    const result = await AttendanceImportService.commitImport(records);

    return apiSuccess({
      message: `Import successful: ${result.inserted} punches inserted across ${result.datesProcessed} days.`,
      result,
      validation,
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to process import file", 500);
  }
}
