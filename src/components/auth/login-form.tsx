"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/auth/actions";
import { Loader2, Mail, Lock, Building } from "lucide-react";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <div className="grid gap-6">
      <form action={formAction}>
        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground" htmlFor="email">
              Corporate Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                id="email"
                name="email"
                placeholder="name@flexicom.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                required
                className="flex h-11 w-full rounded-md border border-input bg-white pl-10 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground" htmlFor="password">
                Password
              </label>
              <a href="#" className="text-xs font-medium text-primary hover:underline underline-offset-4">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                id="password"
                name="password"
                placeholder="••••••••"
                type="password"
                required
                className="flex h-11 w-full rounded-md border border-input bg-white pl-10 pr-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-1">
            <input 
              type="checkbox" 
              id="remember" 
              name="remember"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
            />
            <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground cursor-pointer">
              Remember me on this device
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isPending}
            className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-70"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </span>
            ) : (
              "Sign In to Flexicom ERP"
            )}
          </button>
        </div>
      </form>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <button 
        type="button" 
        className="inline-flex h-11 w-full items-center justify-center rounded-md border border-input bg-white px-8 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Building className="mr-2 h-4 w-4" />
        Single Sign-On (SSO)
      </button>

      {errorMessage && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600 text-center border border-red-200">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
