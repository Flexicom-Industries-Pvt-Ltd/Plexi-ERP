import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Server-side Environment Variables
   * These are only available on the server and will throw an error if accessed on the client.
   */
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().url("A valid Database URL is required for Prisma"),
    // Add other server secrets here (e.g., NEXTAUTH_SECRET, API_KEYS)
  },

  /*
   * Client-side Environment Variables
   * These must be prefixed with `NEXT_PUBLIC_` to be exposed to the browser.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },

  /*
   * Runtime Mapping
   * You must explicitly map the process.env variables to the schema here.
   * This is required by Next.js edge runtimes.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  
  /*
   * Skip validation when building during CI/CD to prevent errors if secrets aren't injected yet.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  
  /*
   * Treat empty strings as undefined so Zod doesn't accept an empty string as a valid URL.
   */
  emptyStringAsUndefined: true,
});
