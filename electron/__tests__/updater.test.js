import { describe, it, expect } from "vitest";
const { parseSemver, isNewerVersion } = require("../updater");

describe("Electron Auto-Updater Semver Engine", () => {
  it("parses semantic version strings accurately", () => {
    expect(parseSemver("0.1.0")).toEqual([0, 1, 0]);
    expect(parseSemver("v0.1.0")).toEqual([0, 1, 0]);
    expect(parseSemver("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseSemver("2.0")).toEqual([2, 0, 0]);
    expect(parseSemver("")).toEqual([0, 0, 0]);
  });

  it("correctly identifies newer remote versions", () => {
    expect(isNewerVersion("0.1.1", "0.1.0")).toBe(true);
    expect(isNewerVersion("v0.2.0", "0.1.9")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.9.9")).toBe(true);
    expect(isNewerVersion("0.1.0", "0.1.0")).toBe(false);
    expect(isNewerVersion("0.0.9", "0.1.0")).toBe(false);
    expect(isNewerVersion("v0.1.0", "0.1.0")).toBe(false);
  });
});
