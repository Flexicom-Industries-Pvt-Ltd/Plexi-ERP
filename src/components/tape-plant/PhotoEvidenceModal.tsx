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
} from "lucide-react";
import { toast } from "sonner";

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
  const defaultTab = currentPhotoUrl ? "view" : allowUpload ? "upload" : "camera";
  const [activeTab, setActiveTab] = useState<"view" | "upload" | "camera">(defaultTab);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentPhotoUrl || null);
      setSelectedFile(null);
      setCameraError(null);
      setActiveTab(currentPhotoUrl ? "view" : allowUpload ? "upload" : "camera");
    } else {
      stopCamera();
    }
  }, [isOpen, currentPhotoUrl, allowUpload]);

  // Clean up camera on unmount or tab switch
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  useEffect(() => {
    if (activeTab !== "camera") {
      stopCamera();
    }
  }, [activeTab, stopCamera]);

  // Initialize camera when camera tab is active
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Could not start live webcam:", err);
      setCameraError(err.message || "Could not access device camera. Please upload an image file instead.");
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

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
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
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
      } else if (previewUrl.startsWith("data:")) {
        formData.append("base64", previewUrl);
      }

      const res = await fetch("/api/production/tape-plant/photos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload photo");
      }

      const data = await res.json();
      onSavePhoto(data.photoUrl);
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
              {cameraError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center max-w-sm">
                  <AlertCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-rose-800">Camera Unavailable</p>
                  <p className="text-[11px] text-rose-600 mt-1">{cameraError}</p>
                  <div className="mt-3">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer">
                      <Camera className="h-3.5 w-3.5" />
                      <span>Take Photo via Mobile Camera</span>
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
              ) : previewUrl && !cameraStream ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-h-[300px] rounded-xl overflow-hidden border border-slate-200 bg-black flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Captured Telemetry"
                      className="max-h-[300px] w-auto object-contain rounded-lg"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      startCamera();
                    }}
                    className="mt-2 text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Retake Photo
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-h-[320px] rounded-xl overflow-hidden border border-slate-300 bg-black flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-[320px] object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureFrame}
                    className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Snap Telemetry Photo</span>
                  </button>
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
