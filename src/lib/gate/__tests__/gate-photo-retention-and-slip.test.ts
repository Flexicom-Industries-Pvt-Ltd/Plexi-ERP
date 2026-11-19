import { describe, it, expect, vi, beforeEach } from "vitest";
import { pruneExpiredGatePhotos } from "../gate-photo-retention";
import { generateTransportSlipHtml, GatePrintEntry } from "../print-transport-slip";
import { isImageFile, isPdfFile } from "@/lib/images/compress-image";
import { db } from "@/lib/db";
import * as fsPromises from "fs/promises";

// Mock DB
vi.mock("@/lib/db", () => ({
  db: {
    gateDocument: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock fs/promises
vi.mock("fs/promises", () => {
  const mockUnlink = vi.fn().mockResolvedValue(undefined);
  return {
    default: {
      unlink: mockUnlink,
    },
    unlink: mockUnlink,
  };
});

describe("Gate Entry Photo Compression & Retention Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Image & PDF File Type Classification", () => {
    it("correctly identifies image formats", () => {
      expect(isImageFile("photo.jpg")).toBe(true);
      expect(isImageFile("truck.png")).toBe(true);
      expect(isImageFile("scan.webp")).toBe(true);
      expect(isImageFile("data:image/jpeg;base64,12345")).toBe(true);
      expect(isImageFile("invoice.pdf")).toBe(false);
      expect(isImageFile(null)).toBe(false);
    });

    it("correctly identifies PDF documents", () => {
      expect(isPdfFile("invoice.pdf")).toBe(true);
      expect(isPdfFile("e-way-bill.PDF")).toBe(true);
      expect(isPdfFile("data:application/pdf;base64,12345")).toBe(true);
      expect(isPdfFile("photo.jpg")).toBe(false);
      expect(isPdfFile(null)).toBe(false);
    });
  });

  describe("Gate Photo 3-Day Auto-Purge & Retention", () => {
    it("prunes expired truck and inspection photos older than 3 days and cleans up disk files", async () => {
      const mockCandidateDocs = [
        {
          id: "doc-1",
          documentType: "Truck / Vehicle Photo",
          fileUrl: "/uploads/gate-documents/truck-123.jpg",
          remarks: "Front license plate",
        },
        {
          id: "doc-2",
          documentType: "Driver ID / License Photo",
          fileUrl: "/uploads/gate-documents/driver-456.webp",
          remarks: "DL scan",
        },
        {
          id: "doc-3",
          documentType: "Gross Weighbridge Slip",
          fileUrl: "/uploads/gate-documents/weighbridge-789.pdf",
          remarks: "Gross: 24,560 kg",
        },
      ];

      (db.gateDocument.findMany as any).mockResolvedValue(mockCandidateDocs);
      (db.gateDocument.updateMany as any).mockResolvedValue({ count: 2 });

      const result = await pruneExpiredGatePhotos(3);

      expect(result.success).toBe(true);
      expect(result.totalPruned).toBe(2); // Only doc-1 and doc-2 (photos), not doc-3 (slip/PDF)
      expect(db.gateDocument.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["doc-1", "doc-2"] } },
        data: { fileUrl: null },
      });
      expect(fsPromises.unlink).toHaveBeenCalledTimes(2);
    });

    it("handles database exceptions gracefully without crashing", async () => {
      (db.gateDocument.findMany as any).mockRejectedValue(new Error("Database connection dropped"));

      const result = await pruneExpiredGatePhotos(3);

      expect(result.success).toBe(false);
      expect(result.totalPruned).toBe(0);
      expect(result.error).toBe("Database connection dropped");
    });
  });

  describe("Transport Slip & Gate Pass Truck Photo Embedding", () => {
    const baseEntry: GatePrintEntry = {
      id: "ge-1",
      entryNumber: "GE-20261119-001",
      truckNumber: "JK02-AB-9988",
      driverName: "Surinder Kumar",
      driverContact: "9876543210",
      driverLicenseNumber: "DL-JK02-2019-0012",
      transporter: "Northern Express Logistics",
      supplierCustomer: "Supreme Polymers",
      purpose: "LOADING",
      status: "ARRIVED",
      arrivalTime: new Date("2026-11-19T08:30:00Z"),
      exitTime: null,
      stockDetails: [
        {
          id: "st-1",
          materialName: "PP Granules",
          materialType: "RAW_MATERIALS",
          quantity: 24000,
          unit: "kg",
          expectedQuantity: 24000,
          actualQuantity: null,
        },
      ],
      documents: [],
      statusLogs: [],
    };

    it("renders printable transport slip with embedded truck photo when truck photo exists", () => {
      const entryWithTruckPhoto: GatePrintEntry = {
        ...baseEntry,
        documents: [
          {
            id: "doc-photo",
            documentType: "Truck / Vehicle Photo",
            fileUrl: "/uploads/gate-documents/truck-jk02.webp",
            status: "VERIFIED",
            remarks: "Clear front license plate",
            verifier: { name: "Security Desk" },
            verifiedAt: new Date("2026-11-19T08:35:00Z"),
          },
        ],
      };

      const html = generateTransportSlipHtml(entryWithTruckPhoto);

      expect(html).toContain("Vehicle Photo");
      expect(html).toContain("/uploads/gate-documents/truck-jk02.webp");
      expect(html).toContain("Truck JK02-AB-9988");
      expect(html).toContain("JK02-AB-9988");
      expect(html).toContain("Surinder Kumar");
      expect(html).toContain("GE-20261119-001");
    });

    it("renders clean fallback table layout when no truck photo document is attached", () => {
      const html = generateTransportSlipHtml(baseEntry);

      expect(html).toContain("1. Vehicle & Movement Overview");
      expect(html).toContain("JK02-AB-9988");
      expect(html).toContain("Surinder Kumar");
      expect(html).not.toContain("Vehicle Photo</div>");
    });
  });
});
