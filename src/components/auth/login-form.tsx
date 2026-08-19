"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/auth/actions";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock } from "lucide-react";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <div className="grid gap-6">
      <form action={formAction}>
        <div className="grid gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="grid gap-2"
          >
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                id="email"
                name="email"
                placeholder="name@plexierp.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                required
                className="flex h-11 w-full rounded-xl border border-input bg-white/50 pl-10 pr-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-2"
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
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
                className="flex h-11 w-full rounded-xl border border-input bg-white/50 pl-10 pr-3 py-2 text-sm shadow-sm backdrop-blur-sm transition-all focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </motion.div>

          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={isPending}
            className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-brand px-8 py-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-70"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </span>
            ) : (
              "Sign In to ERP"
            )}
          </motion.button>
        </div>
      </form>
      
      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive text-center border border-destructive/20"
        >
          {errorMessage}
        </motion.div>
      )}
    </div>
  );
}
