import { db } from "@/lib/db";
import { format } from "date-fns";
import path from "path";
import { unlink } from "fs/promises";

let lastGatePruneTimestamp = 0;
const PRUNE_INTERVAL_MS = 4 * 60 * 60 * 1000; // Run at most once every 4 hours per server instance

const PHOTO_DOCUMENT_TYPES = [
  "truck photo",
  "vehicle photo",
  "truck / vehicle photo",
  "driver photo",
  "driver id / license photo",
  "container photo",
  "seal photo",
  "cargo photo",
  "physical condition photo",
  "inspection photo",
];

function isPhotoDocument(documentType: string, fileUrl: string | null): boolean {
  const normType = (documentType || "").toLowerCase().trim();
  if (PHOTO_DOCUMENT_TYPES.some((pt) => normType.includes(pt))) {
    return true;
  }
  if (normType.endsWith("photo") || normType.includes("photo") || normType.includes("image")) {
    return true;
  }
  if (fileUrl) {
    return /\.(jpg|jpeg|png|webp|gif|heic)(\?.*)?$/i.test(fileUrl);
  }
  return false;
}

/**
 * Prunes temporary gate entry evidence photos older than retentionDays (default 3 days)
 * from both physical server storage and the database.
 * Preserves the document verification record, timestamps, and audit trail.
 */
export async function pruneExpiredGatePhotos(retentionDays: number = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    // Find documents older than cutoffDate that have an uploaded fileUrl
    const candidateDocs = await db.gateDocument.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        fileUrl: { not: null },
      },
      select: {
        id: true,
        documentType: true,
        fileUrl: true,
        remarks: true,
      },
    });

    // Filter to temporary inspection/truck photos
    const docsToPrune = candidateDocs.filter((doc) =>
      isPhotoDocument(doc.documentType, doc.fileUrl)
    );

    let deletedFilesCount = 0;

    for (const doc of docsToPrune) {
      if (doc.fileUrl && doc.fileUrl.startsWith("/uploads/gate-documents/")) {
        try {
          const filePath = path.join(process.cwd(), "public", doc.fileUrl);
          await unlink(filePath).catch(() => {});
          deletedFilesCount++;
        } catch (unlinkErr) {
          console.warn(`Could not delete physical gate document file for ID ${doc.id}:`, unlinkErr);
        }
      }
    }

    if (docsToPrune.length > 0) {
      const ids = docsToPrune.map((d) => d.id);
      await db.gateDocument.updateMany({
        where: { id: { in: ids } },
        data: {
          fileUrl: null,
        },
      });
    }

    return {
      success: true,
      totalPruned: docsToPrune.length,
      deletedFilesCount,
      cutoffDate: format(cutoffDate, "yyyy-MM-dd HH:mm:ss"),
    };
  } catch (error: any) {
    console.error("Failed to prune expired gate photos:", error);
    return {
      success: false,
      totalPruned: 0,
      deletedFilesCount: 0,
      error: error.message,
    };
  }
}

/**
 * Non-blocking opportunistic trigger for gate photo pruning.
 * Executes at most once every 4 hours per server container without impeding API response times.
 */
export function triggerOpportunisticGatePhotoPrune(): void {
  const now = Date.now();
  if (now - lastGatePruneTimestamp < PRUNE_INTERVAL_MS) {
    return;
  }
  lastGatePruneTimestamp = now;

  // Run in next tick asynchronously
  setTimeout(() => {
    pruneExpiredGatePhotos(3)
      .then((res) => {
        if (res.totalPruned > 0) {
          console.info(`[Gate Photo Retention] Pruned ${res.totalPruned} expired photos (>3 days old).`);
        }
      })
      .catch((err) => {
        console.warn("[Gate Photo Retention] Opportunistic prune error:", err);
      });
  }, 100);
}
