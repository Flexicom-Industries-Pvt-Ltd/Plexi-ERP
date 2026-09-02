import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { loadAllRouteRegistrations } from "./openapi/routes/index";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Define authentication security scheme globally
const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

const cookieAuth = registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "next-auth.session-token",
});

export function generateOpenApiSpec() {
  loadAllRouteRegistrations();

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Flexicom ERP API",
      description:
        "Complete API reference for Flexicom ERP — Gate, Inventory, Production, Data Centre, Settings, Profile, and Audit modules.",
    },
    servers: [
      {
        url: "/api",
        description: "API Base URL",
      },
    ],
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  });
}
