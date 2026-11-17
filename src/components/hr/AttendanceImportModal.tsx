"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AttendanceImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function AttendanceImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: AttendanceImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setValidationResult(null);

    // Validate preview
    setIsValidating(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("mode", "validate");

    try {
      const res = await fetch("/api/hr/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setValidationResult(json.data.validation);
      } else {
        toast.error(json.error || "Failed to parse file");
      }
    } catch (err: any) {
      toast.error("Error validating file: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setIsCommitting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", "commit");

    try {
      const res = await fetch("/api/hr/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.data.message || "Attendance records imported successfully!");
        onImportComplete();
        onOpenChange(false);
        setFile(null);
        setValidationResult(null);
      } else {
        toast.error(json.error || "Failed to commit import");
      }
    } catch (err: any) {
      toast.error("Error importing file: " + err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = "/api/hr/template";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Biometric Attendance Sheet
          </DialogTitle>
          <DialogDescription>
            Upload an offline export sheet (.xlsx, .xls, .csv) from TimeWatch biometric devices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Top helper with Download Template button */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Need the standard column format?</span>
              <p className="text-xs text-slate-500">Download our pre-formatted template with sample rows.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 bg-white shadow-xs"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-primary/70 bg-slate-50/50 hover:bg-slate-50 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {file ? file.name : "Click to browse or drag & drop attendance file"}
            </p>
            <p className="text-xs text-slate-500">Supports .xlsx, .xls, and .csv files</p>
          </div>

          {/* Loading validation */}
          {isValidating && (
            <div className="flex items-center justify-center gap-2 p-4 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Validating columns and rows...
            </div>
          )}

          {/* Validation Result Preview */}
          {validationResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium">
                <div className="p-2.5 bg-slate-100 rounded-md">
                  <span className="text-slate-500 block">Total Rows</span>
                  <span className="text-sm font-bold text-slate-800">{validationResult.totalRows}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                  <span className="text-emerald-600 block flex items-center justify-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Valid Rows
                  </span>
                  <span className="text-sm font-bold">{validationResult.validRows}</span>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-md">
                  <span className="text-rose-600 block flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Error Rows
                  </span>
                  <span className="text-sm font-bold">{validationResult.errorRows}</span>
                </div>
              </div>

              {/* Error messages if any */}
              {validationResult.errors?.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 max-h-28 overflow-y-auto space-y-1">
                  <span className="font-semibold block">Issues Detected:</span>
                  {validationResult.errors.slice(0, 5).map((e: any, idx: number) => (
                    <p key={idx}>Row {e.row}: {e.error}</p>
                  ))}
                  {validationResult.errors.length > 5 && (
                    <p className="font-medium">...and {validationResult.errors.length - 5} more errors.</p>
                  )}
                </div>
              )}

              {/* Preview Table */}
              {validationResult.preview?.length > 0 && (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-100 text-xs font-semibold text-slate-700">
                    Preview of first {validationResult.preview.length} valid rows:
                  </div>
                  <div className="max-h-40 overflow-y-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b text-slate-500">
                        <tr>
                          <th className="px-3 py-1.5">ID</th>
                          <th className="px-3 py-1.5">Name</th>
                          <th className="px-3 py-1.5">Punch Time</th>
                          <th className="px-3 py-1.5">Dir</th>
                          <th className="px-3 py-1.5">Device</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {validationResult.preview.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-medium">{p.employeeCode}</td>
                            <td className="px-3 py-1.5">{p.employeeName}</td>
                            <td className="px-3 py-1.5">{p.punchTime}</td>
                            <td className="px-3 py-1.5 font-semibold text-slate-900">{p.direction}</td>
                            <td className="px-3 py-1.5 truncate max-w-[120px]">{p.deviceName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCommitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCommit}
            disabled={!file || !validationResult || validationResult.validRows === 0 || isCommitting}
            className="gap-2"
          >
            {isCommitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Commit Import ({validationResult?.validRows || 0} Rows)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

