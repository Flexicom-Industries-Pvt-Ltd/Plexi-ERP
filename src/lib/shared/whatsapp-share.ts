import { toast } from "sonner";
import { isElectron } from "@/lib/pwa/pwa-utils";

export type ReportOrientation = "portrait" | "landscape";

export interface WhatsAppPdfBridge {
  generatePdfFromHtml?: (
    html: string,
    fileName: string
  ) => Promise<{ ok: boolean; filePath?: string; fileName?: string; error?: string }>;
  openWhatsAppUrl?: (url: string) => Promise<boolean>;
}

export interface ShareReportViaWhatsAppOptions {
  getHtml: () => string;
  fileName: string;
  title: string;
  message?: string;
}

export type ShareOutcome = "shared" | "electron" | "downloaded" | "cancelled";

/**
 * Infers A4 orientation from @page CSS rule in generated print HTML.
 */
export function detectA4Orientation(html: string): ReportOrientation {
  return /@page\s*\{[^}]*size:\s*A4\s+landscape/i.test(html)
    ? "landscape"
    : "portrait";
}

/**
 * Sanitizes report filename and ensures a `.pdf` extension.
 */
export function sanitizePdfFileName(rawName: string): string {
  const cleaned = (rawName || "report")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = cleaned || "report";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

/**
 * Builds an official WhatsApp launcher URL that opens the native app on mobile/desktop
 * when installed and falls back cleanly to WhatsApp Web in browsers on PC.
 */
export function buildWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Sanitizes print HTML for isolated off-screen PDF rendering:
 * removes script tags and resolves root-relative URLs so assets like /logo.png load reliably.
 */
export function prepareIsolatedPrintHtml(html: string, origin: string): string {
  const withoutScripts = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  if (!origin) return withoutScripts;
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return withoutScripts.replace(/src=(["'])\/(?!\/)/gi, `src=$1${normalizedOrigin}/`);
}

/**
 * Strictly detects touch mobile/tablet user agents where OS Share Sheet includes WhatsApp.
 * Narrow desktop browser windows remain on the desktop path so Windows doesn't trap files.
 */
export function isMobileShareEnvironment(win?: Window): boolean {
  if (typeof window === "undefined" && !win) return false;
  const w = win || window;
  if (isElectron(w)) return false;
  const nav = w.navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (nav?.userAgentData?.mobile === true) return true;
  const ua = nav?.userAgent || "";
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

async function waitForIframeAssets(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) return;

  await Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          img.complete ||
          new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          })
      )
    ),
    new Promise<void>((resolve) => setTimeout(resolve, 1500)),
  ]);
}

/**
 * Lazily renders standalone print HTML into an A4 PDF File using off-screen iframe + html2canvas + jsPDF.
 * Dynamic imports ensure 0 KB impact on initial page load bundles.
 */
export async function generatePdfFileFromHtml(
  html: string,
  fileName: string
): Promise<File> {
  const safeName = sanitizePdfFileName(fileName);
  const orientation = detectA4Orientation(html);
  const viewportWidthPx = orientation === "landscape" ? 1123 : 794;
  const viewportHeightPx = orientation === "landscape" ? 794 : 1123;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${viewportWidthPx}px`;
  iframe.style.height = `${viewportHeightPx}px`;
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error("Unable to initialize print frame");
    }

    const preparedHtml = prepareIsolatedPrintHtml(html, window.location.origin);
    iframeDoc.open();
    iframeDoc.write(preparedHtml);
    iframeDoc.close();

    await waitForIframeAssets(iframeDoc);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const targetBody = iframeDoc.body;
    targetBody.style.margin = "0";
    targetBody.style.background = "#ffffff";

    const contentHeight = Math.max(targetBody.scrollHeight, viewportHeightPx);
    iframe.style.height = `${contentHeight}px`;

    const canvas = await html2canvas(targetBody, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: viewportWidthPx,
      windowWidth: viewportWidthPx,
      logging: false,
    });

    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();
    const marginMm = 4;
    const printableWidthMm = pageWidthMm - marginMm * 2;
    const printableHeightMm = pageHeightMm - marginMm * 2;

    const renderedHeightMm = (canvas.height * printableWidthMm) / canvas.width;

    // Fit cleanly on 1 A4 page if within tolerance; otherwise paginate slices cleanly.
    if (renderedHeightMm <= printableHeightMm * 1.03) {
      const imgData = canvas.toDataURL("image/png");
      const targetHeightMm = Math.min(renderedHeightMm, printableHeightMm);
      const targetWidthMm = (canvas.width * targetHeightMm) / canvas.height;
      const offsetX = marginMm + Math.max(0, (printableWidthMm - targetWidthMm) / 2);
      pdf.addImage(imgData, "PNG", offsetX, marginMm, targetWidthMm, targetHeightMm, undefined, "FAST");
    } else {
      const pxPerMm = canvas.width / printableWidthMm;
      const sliceHeightPx = Math.floor(printableHeightMm * pxPerMm);
      let offsetY = 0;
      let pageIndex = 0;

      while (offsetY < canvas.height) {
        const chunkPx = Math.min(sliceHeightPx, canvas.height - offsetY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = chunkPx;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, offsetY, canvas.width, chunkPx, 0, 0, canvas.width, chunkPx);
        }

        if (pageIndex > 0) pdf.addPage();
        const chunkHeightMm = chunkPx / pxPerMm;
        pdf.addImage(
          sliceCanvas.toDataURL("image/png"),
          "PNG",
          marginMm,
          marginMm,
          printableWidthMm,
          chunkHeightMm,
          undefined,
          "FAST"
        );

        offsetY += chunkPx;
        pageIndex += 1;
      }
    }

    const pdfBlob = pdf.output("blob");
    return new File([pdfBlob], safeName, { type: "application/pdf" });
  } finally {
    iframe.remove();
  }
}

function triggerBrowserDownload(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Generates an A4 PDF for any ERP print report and routes to WhatsApp optimally:
 * - Electron: crisp vector Chromium printToPDF -> Downloads (+ Explorer reveal) + WhatsApp Desktop/Web.
 * - Mobile / PWA: native OS Share Sheet with the PDF File attached directly to WhatsApp chat picker.
 * - PC Browser: downloads PDF + opens WhatsApp (Desktop app prompt with Web fallback).
 */
export async function shareReportPdfViaWhatsApp(
  options: ShareReportViaWhatsAppOptions
): Promise<ShareOutcome> {
  const html = options.getHtml();
  const safeName = sanitizePdfFileName(options.fileName);
  const caption =
    options.message?.trim() || `${options.title} — Flexicom Industries Pvt. Ltd.`;
  const waUrl = buildWhatsAppShareUrl(caption);

  const electronBridge =
    typeof window !== "undefined"
      ? (window as unknown as { electron?: WhatsAppPdfBridge }).electron
      : undefined;

  if (isElectron() && electronBridge?.generatePdfFromHtml) {
    const result = await electronBridge.generatePdfFromHtml(html, safeName);
    if (!result?.ok) {
      throw new Error(result?.error || "Failed to export PDF");
    }

    if (electronBridge.openWhatsAppUrl) {
      await electronBridge.openWhatsAppUrl(waUrl);
    } else {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }

    toast.success(`PDF saved (${result.fileName || safeName})`, {
      description: "WhatsApp opened — select your chat and drop/attach the PDF.",
    });
    return "electron";
  }

  const pdfFile = await generatePdfFileFromHtml(html, safeName);

  if (
    isMobileShareEnvironment() &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: options.title,
        text: caption,
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      // Fall through cleanly if the OS blocks file sharing
    }
  }

  triggerBrowserDownload(pdfFile);
  window.open(waUrl, "_blank", "noopener,noreferrer");

  toast.success(`PDF downloaded (${pdfFile.name})`, {
    description: "Select your WhatsApp chat and attach the downloaded PDF.",
  });
  return "downloaded";
}
