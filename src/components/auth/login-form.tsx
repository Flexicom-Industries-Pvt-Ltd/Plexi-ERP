"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/auth/actions";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <div className="grid gap-6">
      <form action={formAction}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <label className="sr-only" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="grid gap-1 mt-2">
            <label className="sr-only" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              placeholder="••••••••"
              type="password"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <button 
            type="submit" 
            disabled={isPending}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </form>
      {errorMessage && (
        <div className="text-sm text-destructive text-center">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
