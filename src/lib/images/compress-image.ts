/**
 * Ultra-Light In-Browser Image Compressor & Media Utilities
 *
 * Downscales images to max dimensions (default 1280x1280px) and compresses to WebP/JPEG (0.70 quality).
 * Reduces 4-12 MB mobile camera captures down to ~35-60 KB (up to 99% size reduction)
 * while preserving high legibility for documents, number plates, and weighbridge slips.
 */

export interface CompressionResult {
  dataUrl: string;
  blob: Blob;
  sizeKb: number;
  originalSizeKb: number;
  width: number;
  height: number;
  compressionRatio: number; // percentage saved, e.g. 95.2
  mimeType: string;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  preferWebP?: boolean;
}

/**
 * Checks if a file or URL represents an image
 */
export function isImageFile(fileOrUrl: File | string | null | undefined): boolean {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl === "string") {
    if (fileOrUrl.startsWith("data:image/")) return true;
    return /\.(jpg|jpeg|png|webp|gif|bmp|heic|svg)(\?.*)?$/i.test(fileOrUrl);
  }
  return fileOrUrl.type.startsWith("image/");
}

/**
 * Checks if a file or URL represents a PDF document
 */
export function isPdfFile(fileOrUrl: File | string | null | undefined): boolean {
  if (!fileOrUrl) return false;
  if (typeof fileOrUrl === "string") {
    if (fileOrUrl.startsWith("data:application/pdf")) return true;
    return /\.pdf(\?.*)?$/i.test(fileOrUrl);
  }
  return fileOrUrl.type === "application/pdf" || fileOrUrl.name.toLowerCase().endsWith(".pdf");
}

/**
 * Converts File or Blob to Data URL
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image file, blob, or data URL in the browser using HTML5 Canvas.
 */
export async function compressImage(
  fileOrBlobOrDataUrl: File | Blob | string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.70,
    preferWebP = true,
  } = options;

  let originalSizeKb = 0;
  if (typeof fileOrBlobOrDataUrl === "string") {
    if (fileOrBlobOrDataUrl.startsWith("data:")) {
      originalSizeKb = Math.round((fileOrBlobOrDataUrl.length * 3) / 4 / 1024);
    }
  } else {
    originalSizeKb = Math.round(fileOrBlobOrDataUrl.size / 1024);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    let urlToRevoke: string | null = null;
    if (typeof fileOrBlobOrDataUrl === "string") {
      img.src = fileOrBlobOrDataUrl;
    } else {
      urlToRevoke = URL.createObjectURL(fileOrBlobOrDataUrl);
      img.src = urlToRevoke;
    }

    img.onload = () => {
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down dimensions if exceeding target bounding box
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Could not initialize 2D canvas context for compression"));
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Try image/webp first; fallback to image/jpeg if webp not supported
      let mimeType = preferWebP ? "image/webp" : "image/jpeg";
      let dataUrl = canvas.toDataURL(mimeType, quality);
      if (preferWebP && !dataUrl.startsWith("data:image/webp")) {
        mimeType = "image/jpeg";
        dataUrl = canvas.toDataURL(mimeType, quality);
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback manual blob creation from base64 data URL
            const byteString = atob(dataUrl.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([ab], { type: mimeType });
          }

          const sizeKb = Math.round((blob.size / 1024) * 10) / 10;
          const origSize = originalSizeKb || sizeKb;
          const compressionRatio =
            origSize > 0 ? Math.max(0, Math.round(((origSize - sizeKb) / origSize) * 1000) / 10) : 0;

          resolve({
            dataUrl,
            blob,
            sizeKb,
            originalSizeKb: origSize,
            width,
            height,
            compressionRatio,
            mimeType,
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = (err) => {
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
      reject(err);
    };
  });
}
