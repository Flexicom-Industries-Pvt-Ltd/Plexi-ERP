import type { ZodType } from "zod";
import { registry } from "@/lib/openapi";
import { ErrorSchema } from "./schemas";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

const SEC = [{ cookieAuth: [] }];

const ERROR_RESPONSES = {
  400: { description: "Bad request", content: { "application/json": { schema: ErrorSchema } } },
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  403: { description: "Forbidden", content: { "application/json": { schema: ErrorSchema } } },
  404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  500: { description: "Internal server error", content: { "application/json": { schema: ErrorSchema } } },
};

export function reg(opts: {
  method: HttpMethod;
  path: string;
  summary: string;
  tags: string[];
  description?: string;
  query?: ZodType;
  params?: ZodType;
  body?: ZodType;
  response?: ZodType;
  responses?: Record<number, { description: string; schema?: ZodType }>;
  security?: boolean;
}) {
  const extra: Record<string, { description: string; content?: { "application/json": { schema: ZodType } } }> = {};
  if (opts.responses) {
    for (const [code, r] of Object.entries(opts.responses)) {
      extra[code] = {
        description: r.description,
        ...(r.schema ? { content: { "application/json": { schema: r.schema } } } : {}),
      };
    }
  }

  const request: Record<string, unknown> = {};
  if (opts.query) request.query = opts.query;
  if (opts.params) request.params = opts.params;
  if (opts.body) request.body = { content: { "application/json": { schema: opts.body } } };

  const responses: Record<string, { description: string; content?: { "application/json": { schema: ZodType } } }> = {
    ...ERROR_RESPONSES,
    ...extra,
  };

  const successCode = opts.method === "post" ? "201" : "200";
  responses[successCode] = {
    description: opts.method === "post" ? "Created" : opts.method === "delete" ? "Deleted" : "Success",
    ...(opts.response ? { content: { "application/json": { schema: opts.response } } } : {}),
  };

  registry.registerPath({
    method: opts.method,
    path: opts.path,
    summary: opts.summary,
    description: opts.description,
    tags: opts.tags,
    security: opts.security === false ? [] : SEC,
    ...(Object.keys(request).length ? { request } : {}),
    responses,
  });
}
