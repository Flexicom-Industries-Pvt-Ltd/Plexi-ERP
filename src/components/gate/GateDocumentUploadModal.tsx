"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Loader2,
  FileText,
  AlertCircle,
  Truck,
  Scale,
  FileCheck2,
  Receipt,
  FileSignature,
  Lock,
  PackageCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage, isPdfFile, isImageFile } from "@/lib/images/compress-image";

export interface GateDocumentOption {
  value: string;
  label: string;
  category: "photo" | "document";
  icon: React.ComponentType<{ className?: string }>;
}

export const GATE_DOCUMENT_OPTIONS: GateDocumentOption[] = [
  { value: "Truck / Vehicle Photo", label: "Truck / Vehicle Photo", category: "photo", icon: Truck },
  { value: "Gross Weighbridge Slip", label: "Gross Weighbridge Slip", category: "document", icon: Scale },
  { value: "Tare Weighbridge Slip", label: "Tare Weighbridge Slip", category: "document", icon: Scale },
  { value: "Delivery Challan", label: "Delivery Challan", category: "document", icon: FileText },
  { value: "Invoice", label: "Tax Invoice", category: "document", icon: Receipt },
  { value: "E-Way Bill", label: "E-Way Bill", category: "document", icon: FileCheck2 },
  { value: "Driver ID / License Photo", label: "Driver ID / License Photo", category: "photo", icon: FileSignature },
  { value: "Container / Seal Photo", label: "Container / Seal Photo", category: "photo", icon: Lock },
  { value: "Purchase Order", label: "Purchase Order", category: "document", icon: PackageCheck },
  { value: "Other", label: "Other Document", category: "document", icon: FileText },
];

export interface LocalAttachedDoc {
  documentType: string;
  remarks: string;
  file?: File | null;
  dataUrl?: string | null;
  blob?: Blob | null;
  previewUrl?: string | null;
  sizeKb?: number;
  originalSizeKb?: number;
}

export interface GateDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId?: string;
  defaultDocumentType?: string;
  title?: string;
  onSuccess?: (newDoc?: any) => void;
  onAttachLocalDoc?: (doc: LocalAttachedDoc) => void;
}

export function GateDocumentUploadModal({
  isOpen,
  onClose,
  entryId,
  defaultDocumentType,
  title = "Attach Gate Document & Vehicle Photo",
  onSuccess,
  onAttachLocalDoc,
}: GateDocumentUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [documentType, setDocumentType] = useState<string>(defaultDocumentType || "Truck / Vehicle Photo");
  const [remarks, setRemarks] = useState<string>("");

  // Media state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [compressionStats, setCompressionStats] = useState<{
    originalKb: number;
    compressedKb: number;
    ratio: number;
  } | null>(null);

  // Camera / Webcam state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fileDragActive, setFileDragActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Reset modal state
  useEffect(() => {
    if (isOpen) {
      setDocumentType(defaultDocumentType || "Truck / Vehicle Photo");
      setRemarks("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsPdf(false);
      setCompressedBlob(null);
      setRotationAngle(0);
      setCompressionStats(null);
      setCameraError(null);

      // Default to camera for photo types, upload for document types
      const isPhoto = (defaultDocumentType || "").toLowerCase().includes("photo");
      setActiveTab(isPhoto ? "camera" : "upload");
    } else {
      stopCamera();
    }
  }, [isOpen, defaultDocumentType, stopCamera]);

  useEffect(() => {
    if (activeTab !== "camera") {
      stopCamera();
    }
  }, [activeTab, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Live webcam streaming (fallback when user wants desktop webcam or live viewfinder)
  const startLiveWebcam = async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Live webcam API not available. Please use the mobile camera button below.");
      }

      let stream: MediaStream | null = null;
      // Try environment / rear camera first (optimal for mobile & tablet vehicle scanning)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });
      } catch {
        // Fallback to default user-facing camera
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err: any) {
      console.warn("Could not start live webcam:", err);
      setCameraError(err.message || "Camera access denied. Please allow camera permissions or tap 1-Tap Camera below.");
    }
  };

  // Process and compress image file or snapshot
  const processImage = async (fileOrDataUrl: File | string) => {
    setIsCompressing(true);
    try {
      if (typeof fileOrDataUrl !== "string" && isPdfFile(fileOrDataUrl)) {
        setIsPdf(true);
        setSelectedFile(fileOrDataUrl);
        setPreviewUrl(URL.createObjectURL(fileOrDataUrl));
        setCompressedBlob(fileOrDataUrl);
        setCompressionStats(null);
        return;
      }

      setIsPdf(false);
      const result = await compressImage(fileOrDataUrl, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.70,
        preferWebP: true,
      });

      setPreviewUrl(result.dataUrl);
      setCompressedBlob(result.blob);
      setRotationAngle(0);
      setCompressionStats({
        originalKb: result.originalSizeKb,
        compressedKb: result.sizeKb,
        ratio: result.compressionRatio,
      });

      if (typeof fileOrDataUrl !== "string") {
        setSelectedFile(fileOrDataUrl);
      }
    } catch (err: any) {
      console.error("Compression failed:", err);
      toast.error("Failed to process image. Using original file.");
      if (typeof fileOrDataUrl !== "string") {
        setSelectedFile(fileOrDataUrl);
        setPreviewUrl(URL.createObjectURL(fileOrDataUrl));
        setCompressedBlob(fileOrDataUrl);
      }
    } finally {
      setIsCompressing(false);
      stopCamera();
    }
  };

  // Capture frame from live webcam
  const handleCaptureLiveWebcam = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.90);
    processImage(dataUrl);
  };

  // Rotate image by 90 degrees clockwise
  const handleRotateImage = () => {
    if (!previewUrl || isPdf) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = previewUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Swap width and height for 90 deg rotation
      canvas.width = img.height;
      canvas.height = img.width;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedDataUrl = canvas.toDataURL("image/webp", 0.75);
      canvas.toBlob((blob) => {
        if (blob) {
          setCompressedBlob(blob);
          setPreviewUrl(rotatedDataUrl);
          setRotationAngle((prev) => (prev + 90) % 360);
          if (compressionStats) {
            setCompressionStats({
              ...compressionStats,
              compressedKb: Math.round((blob.size / 1024) * 10) / 10,
            });
          }
        }
      }, "image/webp", 0.75);
    };
  };

  // Retake / Reset photo
  const handleResetMedia = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsPdf(false);
    setCompressedBlob(null);
    setRotationAngle(0);
    setCompressionStats(null);
  };

  // Save / Attach Document
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentType) {
      toast.error("Please select a document type");
      return;
    }

    if (!previewUrl && !selectedFile && !compressedBlob) {
      toast.error("Please take a photo or select a file to attach");
      return;
    }

    setIsSubmitting(true);
    try {
      // Case 1: Standalone / local attachment (e.g. on new-gate-client prior to entryId)
      if (onAttachLocalDoc) {
        onAttachLocalDoc({
          documentType,
          remarks,
          file: selectedFile,
          dataUrl: previewUrl,
          blob: compressedBlob,
          previewUrl,
          sizeKb: compressionStats?.compressedKb || (selectedFile ? Math.round(selectedFile.size / 1024) : 0),
          originalSizeKb: compressionStats?.originalKb,
        });
        toast.success(`${documentType} attached`);
        onClose();
        return;
      }

      // Case 2: Persist directly to backend API
      if (!entryId) {
        throw new Error("Missing Gate Entry ID for document upload");
      }

      const formData = new FormData();
      formData.append("documentType", documentType);
      if (remarks) formData.append("remarks", remarks);

      if (compressedBlob) {
        const ext = isPdf ? ".pdf" : compressedBlob.type.includes("webp") ? ".webp" : ".jpg";
        const filename = `${documentType.toLowerCase().replace(/[^a-z0-9]/g, "_")}${ext}`;
        formData.append("file", compressedBlob, filename);
      } else if (previewUrl && previewUrl.startsWith("data:")) {
        formData.append("base64", previewUrl);
      } else if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const res = await fetch(`/api/gate/${entryId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to attach document");
      }

      const createdDoc = await res.json();
      toast.success(`${documentType} attached successfully!`);
      onSuccess?.(createdDoc);
      onClose();
    } catch (err: any) {
      console.error("Document upload failed:", err);
      toast.error(err.message || "Failed to attach document");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">
                Optimized in-browser capture with 3-day retention policy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Document Type Selector with Quick Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Document / Evidence Type *
            </label>
            <select
              required
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              <optgroup label="Photos & Physical Evidence">
                {GATE_DOCUMENT_OPTIONS.filter((o) => o.category === "photo").map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Transport & Weighbridge Documents">
                {GATE_DOCUMENT_OPTIONS.filter((o) => o.category === "document").map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "camera"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Camera className="h-4 w-4" />
              <span>Camera & Snapshot</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "upload"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Upload File / PDF</span>
            </button>
          </div>

          {/* Hidden Inputs for Native File / Camera Triggers */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processImage(e.target.files[0]);
              }
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processImage(e.target.files[0]);
              }
            }}
          />

          {/* Media Capture & Preview Section */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
            {isCompressing ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs font-bold text-slate-700">Compressing & optimizing image...</p>
                <p className="text-[11px] text-slate-400">Reducing file size by up to 99%</p>
              </div>
            ) : previewUrl ? (
              /* PREVIEW STATE */
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center min-h-[200px] max-h-[300px]">
                  {isPdf ? (
                    <div className="p-8 text-center text-white flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-primary" />
                      <p className="text-sm font-bold truncate max-w-xs">{selectedFile?.name || "Document.pdf"}</p>
                      <span className="text-xs text-slate-400">PDF Document (Vector preserved)</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Captured Preview"
                      className="max-h-[300px] w-auto object-contain transition-transform duration-200"
                    />
                  )}

                  {/* Top-Right Control Buttons */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg backdrop-blur-xs">
                    {!isPdf && (
                      <button
                        type="button"
                        onClick={handleRotateImage}
                        className="p-1.5 text-white hover:text-amber-300 rounded hover:bg-white/10 transition-colors"
                        title="Rotate 90° Clockwise"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleResetMedia}
                      className="p-1.5 text-white hover:text-red-400 rounded hover:bg-white/10 transition-colors"
                      title="Remove / Retake"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Compression Analytics Badge */}
                {compressionStats && (
                  <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>In-Browser Ultra-Light Compression</span>
                    </div>
                    <span className="font-mono font-bold text-[11px]">
                      {compressionStats.originalKb} KB &rarr; {compressionStats.compressedKb} KB (-{compressionStats.ratio}%)
                    </span>
                  </div>
                )}
              </div>
            ) : activeTab === "camera" ? (
              /* CAMERA TAB */
              <div className="space-y-3">
                {cameraStream ? (
                  /* Live Camera Viewfinder */
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-3 inset-x-0 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleCaptureLiveWebcam}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Camera className="h-4 w-4" /> Capture Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-white font-medium text-xs rounded-full shadow-md transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Camera Selection / Launch Triggers */
                  <div className="text-center py-6 px-4 space-y-3">
                    <div className="p-3 bg-primary/10 text-primary rounded-full inline-flex">
                      <Camera className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">1-Tap Gate Camera Capture</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                        Instantly open device rear-camera for truck license plates, weighbridge slips, or seals.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Camera className="h-4 w-4" /> Open Device Camera
                      </button>

                      <button
                        type="button"
                        onClick={startLiveWebcam}
                        className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>Live Viewfinder</span>
                      </button>
                    </div>

                    {cameraError && (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                        {cameraError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* UPLOAD / DROPZONE TAB */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setFileDragActive(true);
                }}
                onDragLeave={() => setFileDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setFileDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processImage(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  fileDragActive
                    ? "border-primary bg-primary/5"
                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-100/50"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-slate-100 text-slate-500">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drag file here
                  </p>
                  <p className="text-[11px] text-slate-400">
                    PDF, JPG, PNG or WEBP (auto-compressed on select)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Remarks / Reference Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Remarks / Reference Details
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Gross 24,560 kg, Challan #CH-8821, or Front View"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Retention Notice */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/80 rounded-lg text-slate-600 text-[11px]">
            <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              <strong>Retention Policy:</strong> Temporary truck & evidence photos auto-purge after 3 days to conserve storage while preserving the audit verification trail.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!previewUrl && !selectedFile)}
              className="px-5 py-2.5 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Attaching...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Attach Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
