"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import {
  generateWastageReportHtml,
  printWastageReport,
} from "@/lib/lamination/print-wastage-report";
import { exportWastageReportExcel } from "@/lib/lamination/wastage-export";
import { LaminationWastageReportData } from "@/lib/lamination/lamination-wastage-types";

interface WastagePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: LaminationWastageReportData | null;
}

export function WastagePrintModal({
  isOpen,
  onClose,
  reportData,
}: WastagePrintModalProps) {
  if (!reportData) return null;

  const htmlContent = generateWastageReportHtml(reportData);

  const handlePrint = () => {
    printWastageReport(reportData);
  };

  const handleExcelExport = () => {
    exportWastageReportExcel(reportData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold text-slate-900">
            Print Preview: Lamination Wastage Report
          </DialogTitle>
          <div className="flex items-center gap-2 mr-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelExport}
              className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export Excel
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print Report
            </Button>
          </div>
        </DialogHeader>

        {/* Embedded Iframe Preview */}
        <div className="flex-1 p-4 bg-slate-100/70 overflow-auto">
          <div className="bg-white mx-auto shadow-md rounded border border-slate-200 p-6 min-h-[500px]">
            <iframe
              srcDoc={htmlContent}
              title="Lamination Wastage Report Preview"
              className="w-full min-h-[600px] border-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
