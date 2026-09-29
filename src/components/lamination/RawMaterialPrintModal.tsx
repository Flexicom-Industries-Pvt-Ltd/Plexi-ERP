"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import {
  generateRawMaterialReportHtml,
  printRawMaterialReport,
} from "@/lib/lamination/print-raw-material-report";
import { exportRawMaterialReportExcel } from "@/lib/lamination/raw-material-export";
import { LaminationRawMaterialReportData } from "@/lib/lamination/lamination-raw-material-types";

interface RawMaterialPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: LaminationRawMaterialReportData | null;
}

export function RawMaterialPrintModal({
  isOpen,
  onClose,
  reportData,
}: RawMaterialPrintModalProps) {
  if (!reportData) return null;

  const htmlContent = generateRawMaterialReportHtml(reportData);

  const handlePrint = () => {
    printRawMaterialReport(reportData);
  };

  const handleExcelExport = () => {
    exportRawMaterialReportExcel(reportData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold text-slate-900">
            Print Preview: Lamination Raw Material Consumption
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
              title="Lamination Raw Material Report Preview"
              className="w-full min-h-[600px] border-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
