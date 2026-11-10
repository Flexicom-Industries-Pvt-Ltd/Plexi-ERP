import { describe, it, expect } from "vitest";
import { formatDiscreteCrates, computeNetProductionKg, computeBobbinStockCount, computeCrateStockCount } from "../tape-plant/bobbin-stock";

describe("Bobbin Stock Summary Helpers (BUG-015)", () => {
  describe("formatDiscreteCrates", () => {
    it("formats whole crate numbers cleanly", () => {
      expect(formatDiscreteCrates(500, 8, false)).toBe("500 crates");
      expect(formatDiscreteCrates(1, 8, false)).toBe("1 crate");
      expect(formatDiscreteCrates(500, 8, true)).toBe("500 cr");
      expect(formatDiscreteCrates(0, 8, false)).toBe("0 crates");
    });

    it("formats fractional crates into discrete whole crates + loose bobbins", () => {
      // 702.82 crates -> 702 crates + (0.82 * 8 = 6.56 ~ 7 bobbins)
      expect(formatDiscreteCrates(702.82, 8, false)).toBe("702 crates + 7 bobbins");
      expect(formatDiscreteCrates(702.82, 8, true)).toBe("702 cr + 7 bob");
    });

    it("handles 1 loose bobbin correctly", () => {
      // 10.125 crates -> 0.125 * 8 = 1 bobbin
      expect(formatDiscreteCrates(10.125, 8, false)).toBe("10 crates + 1 bobbin");
    });
  });

  describe("computeNetProductionKg", () => {
    it("correctly deducts waste from production done", () => {
      expect(computeNetProductionKg(1000, 50)).toBe(950);
      expect(computeNetProductionKg(100, 120)).toBe(0);
    });
  });

  describe("computeCrateStockCount", () => {
    it("computes crate stock based on 12.8 kg per crate", () => {
      expect(computeCrateStockCount(1280)).toBe(100);
    });
  });
});

