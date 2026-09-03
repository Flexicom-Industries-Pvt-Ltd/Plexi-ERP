import { describe, expect, it } from "vitest";

import { generateOpenApiSpec } from "../openapi";

function resolveRequestUrl(serverUrl: string, path: string) {
  const base = serverUrl.endsWith("/") ? serverUrl.slice(0, -1) : serverUrl;
  return `${base}${path}`;
}

describe("generateOpenApiSpec", () => {
  it("does not double the /api prefix when resolving request URLs", () => {
    const spec = generateOpenApiSpec();
    const serverUrl = spec.servers?.[0]?.url ?? "/";

    expect(serverUrl).toBe("/");

    const paths = Object.keys(spec.paths ?? {});
    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      expect(path.startsWith("/api/") || path === "/api/swagger" || path.startsWith("/api/auth")).toBe(true);

      const resolved = resolveRequestUrl(serverUrl, path);
      expect(resolved).not.toMatch(/\/api\/api\//);
      expect(resolved).toBe(path);
    }
  });
});
