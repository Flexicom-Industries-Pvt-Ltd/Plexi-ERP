"use client";

import React, { useMemo } from "react";
import { LaminationProductionReportData } from "@/lib/lamination/lamination-types";
import {
  generateLaminationReportHtml,
  printLaminationReport,
} from "@/lib/lamination/print-lamination-report";
import { exportLaminationReportExcel } from "@/lib/lamination/lamination-report-export";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileSpreadsheet, Eye } from "lucide-react";

interface LaminationReportPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LaminationProductionReportData;
}

export function LaminationReportPrintModal({
  open,
  onOpenChange,
  data,
}: LaminationReportPrintModalProps) {
  const htmlContent = useMemo(() => {
    if (!open) return "";
    return generateLaminationReportHtml(data);
  }, [open, data]);

  const handlePrint = () => {
    printLaminationReport(data);
  };

  const handleExportExcel = () => {
    exportLaminationReportExcel(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-6 font-sans">
        <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-sky-600" />
              Lamination Product Report Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Official company print layout for Date: {data.date} ({data.shiftName})
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 mr-6">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              className="h-8 text-xs border-slate-300 hover:bg-slate-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-600" />
              Export Excel
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Printer className="h-4 w-4 mr-1" />
              Print Report
            </Button>
          </div>
        </DialogHeader>

        {/* Live Preview Container */}
        <div className="flex-1 overflow-auto border border-slate-200 rounded-lg bg-white p-2 min-h-[460px]">
          <iframe
            srcDoc={htmlContent}
            title="Lamination Report Print Preview"
            className="w-full h-full min-h-[540px] border-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
