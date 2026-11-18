"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  X,
  Check,
  RotateCcw,
  Trash2,
  Loader2,
  Eye,
  AlertCircle,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface PhotoEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  timeSlot?: string;
  currentPhotoUrl?: string;
  onSavePhoto: (photoUrl: string) => void;
  onRemovePhoto?: () => void;
  disabled?: boolean;
  allowUpload?: boolean;
  allowCapture?: boolean;
}

export function PhotoEvidenceModal({
  isOpen,
  onClose,
  title = "Telemetry Evidence Photo",
  timeSlot,
  currentPhotoUrl,
  onSavePhoto,
  onRemovePhoto,
  disabled = false,
  allowUpload = true,
  allowCapture = true,
}: PhotoEvidenceModalProps) {
  const resolveDefaultTab = (hasPhoto: boolean, uploadAllowed: boolean, captureAllowed: boolean): "view" | "upload" | "camera" => {
    if (hasPhoto) return "view";
    if (uploadAllowed) return "upload";
    if (captureAllowed) return "camera";
    return "view";
  };

  const [activeTab, setActiveTab] = useState<"view" | "upload" | "camera">(() =>
    resolveDefaultTab(Boolean(currentPhotoUrl), allowUpload, allowCapture)
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up camera on unmount or tab switch
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Sync internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentPhotoUrl || null);
      setSelectedFile(null);
      setCameraError(null);
      setActiveTab(resolveDefaultTab(Boolean(currentPhotoUrl), allowUpload, allowCapture));
    } else {
      stopCamera();
    }
  }, [isOpen, currentPhotoUrl, allowUpload, allowCapture, stopCamera]);

  useEffect(() => {
    if (activeTab !== "camera") {
      stopCamera();
    }
  }, [activeTab, stopCamera]);

  // Initialize camera when camera tab is active with tiered constraint negotiation
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser. Please tap 'Open Device Camera' below.");
      }

      let stream: MediaStream | null = null;
      // Tier 1: Try environment / rear camera (ideal for mobile / tablet telemetry scanning)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (firstErr: any) {
        // If permission explicitly denied by user or browser, do not retry constraints
        if (
          firstErr.name === "NotAllowedError" ||
          firstErr.name === "PermissionDeniedError" ||
          String(firstErr.message).toLowerCase().includes("permission denied")
        ) {
          throw firstErr;
        }
        // Tier 2: Fall back to user-facing or default webcam (laptops, desktops, single-camera devices)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        } catch {
          // Tier 3: Simplest bare video constraints
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          console.warn("Camera auto-play deferred:", playErr);
        });
      }
    } catch (err: any) {
      console.warn("Could not start live webcam:", err);
      const isDenied =
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        String(err.message).toLowerCase().includes("permission denied");

      if (isDenied) {
        setCameraError(
          "Browser Camera Blocked: Tap the lock or tune icon in your browser address bar → Site Settings / Permissions → Allow Camera, then click Retry. You can also tap 'Open Device Camera' below."
        );
      } else {
        setCameraError(
          err.message || "Could not access device camera. Please tap 'Open Device Camera' below or upload an image file."
        );
      }
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "camera" && !cameraStream) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const handleCaptureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCameraError(null);
    setPreviewUrl(dataUrl);
    stopCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WebP)");
      return;
    }

    setCameraError(null); // CRITICAL: Reset camera error so preview displays immediately!
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    stopCamera();
  };

  const handleSave = async () => {
    if (!previewUrl) return;

    // If viewing the already saved photo without edits
    if (previewUrl === currentPhotoUrl) {
      onClose();
      return;
    }

    setUploading(true);
    try {
      let finalPhotoUrl = previewUrl;

      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
      } else if (previewUrl.startsWith("data:")) {
        formData.append("base64", previewUrl);
      }

      try {
        const res = await fetch("/api/production/tape-plant/photos", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.photoUrl) {
            finalPhotoUrl = data.photoUrl;
          }
        } else {
          // If serverless upload returned non-200, fallback to local base64 data URL
          if (selectedFile) {
            finalPhotoUrl = await fileToDataUrl(selectedFile);
          }
        }
      } catch (uploadErr) {
        console.warn("Photo upload API failed, falling back to client data URL:", uploadErr);
        if (selectedFile) {
          finalPhotoUrl = await fileToDataUrl(selectedFile);
        }
      }

      onSavePhoto(finalPhotoUrl);
      toast.success("Telemetry evidence photo saved successfully");
      onClose();
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      toast.error(err.message || "Failed to save photo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    if (onRemovePhoto) {
      onRemovePhoto();
      toast.info("Photo removed from this reading");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-200 shrink-0">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              {timeSlot && (
                <p className="text-[11px] text-slate-500 font-mono">Slot Interval: {timeSlot}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 gap-2 shrink-0">
          {currentPhotoUrl && (
            <button
              type="button"
              onClick={() => setActiveTab("view")}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "view"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Current Photo</span>
            </button>
          )}
          {!disabled && (
            <>
              {allowUpload && (
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "upload"
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload File</span>
                </button>
              )}
              {allowCapture && (
                <button
                  type="button"
                  onClick={() => setActiveTab("camera")}
                  className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "camera"
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Live Camera</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[260px] bg-slate-50/50">
          {!allowUpload && allowCapture && activeTab === "camera" && (
            <div className="w-full mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-800">
              <Camera className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>Live Capture Policy:</strong> Operator physical presence is required. Take a direct snapshot at the station scale/panel.
              </span>
            </div>
          )}
          {disabled && !previewUrl && (
            <div className="w-full py-10 flex flex-col items-center justify-center text-center px-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-full mb-3">
                <Lock className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Telemetry Interval Locked</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                This time interval has expired and is locked. To attach or change evidence photos, please request a supervisor to unlock this slot.
              </p>
            </div>
          )}
          {!allowUpload && !allowCapture && !previewUrl && !disabled && (
            <div className="w-full py-10 flex flex-col items-center justify-center text-center px-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Photo Attachment Restricted</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Your user role does not have permission to upload files or capture live photos. Please contact your system administrator to request access in Settings → Roles.
              </p>
            </div>
          )}

          {/* 1. View Tab */}
          {activeTab === "view" && previewUrl && (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full max-h-[360px] rounded-xl overflow-hidden border border-slate-200 bg-black flex items-center justify-center shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Telemetry Reading"
                  className="max-h-[360px] w-auto object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {/* 2. Upload File Tab */}
          {activeTab === "upload" && (
            <div className="w-full flex flex-col items-center">
              {previewUrl && previewUrl !== currentPhotoUrl ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-black flex items-center justify-center shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Upload Preview"
                      className="max-h-[300px] w-auto object-contain rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="mt-2 text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Choose different file
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-slate-300 hover:border-primary/60 rounded-xl bg-white hover:bg-slate-50 transition-all flex flex-col items-center justify-center cursor-pointer text-center group"
                >
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-full group-hover:scale-105 transition-transform mb-3">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to select machine telemetry photo
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WebP up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3. Live Camera Tab */}
          {activeTab === "camera" && (
            <div className="w-full flex flex-col items-center">
              {/* If user took a snapshot or picked a photo via native camera, show preview! */}
              {previewUrl && !cameraStream ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-black flex items-center justify-center shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Captured Telemetry"
                      className="max-h-[300px] w-auto object-contain rounded-lg"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setSelectedFile(null);
                        setCameraError(null);
                        startCamera();
                      }}
                      className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retake Live Stream
                    </button>
                    <label className="text-xs text-slate-600 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer">
                      <Camera className="h-3.5 w-3.5" /> Retake via Device Camera
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : cameraError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center max-w-sm">
                  <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-rose-800">Browser Camera Blocked</p>
                  <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">{cameraError}</p>

                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraError(null);
                        startCamera();
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition-colors cursor-pointer shadow-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Retry Camera Permission</span>
                    </button>

                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs">
                      <Camera className="h-3.5 w-3.5" />
                      <span>Open Device Camera App</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-h-[320px] rounded-xl overflow-hidden border border-slate-300 bg-black flex items-center justify-center shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-[320px] object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCaptureFrame}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Snap Telemetry Photo</span>
                    </button>
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-semibold transition-all cursor-pointer">
                      <Camera className="h-3.5 w-3.5 text-slate-500" />
                      <span>Device Camera App</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <div>
            {currentPhotoUrl && onRemovePhoto && !disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {!disabled && previewUrl && previewUrl !== currentPhotoUrl && (
              <button
                type="button"
                disabled={uploading}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Photo…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Attach Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhotoEvidenceModal;
