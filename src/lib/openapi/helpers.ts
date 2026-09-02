import { registry } from "@/lib/openapi";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

const SEC = [{ cookieAuth: [] }];

const STD = {
  400: { description: "Bad request" },
  401: { description: "Unauthorized" },
  403: { description: "Forbidden" },
  404: { description: "Not found" },
  500: { description: "Internal server error" },
};

function defaultSuccess(method: HttpMethod): Record<number, { description: string }> {
  if (method === "post") return { 201: { description: "Created" } };
  if (method === "delete") return { 200: { description: "Deleted" } };
  return { 200: { description: "Success" } };
}

export function reg(opts: {
  method: HttpMethod;
  path: string;
  summary: string;
  tags: string[];
  description?: string;
  responses?: Record<number, { description: string }>;
  security?: boolean;
}) {
  const success = defaultSuccess(opts.method);
  registry.registerPath({
    method: opts.method,
    path: opts.path,
    summary: opts.summary,
    description: opts.description,
    tags: opts.tags,
    security: opts.security === false ? [] : SEC,
    responses: {
      ...success,
      ...STD,
      ...(opts.responses ?? {}),
    },
  });
}
