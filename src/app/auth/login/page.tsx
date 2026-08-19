"use client";

import { LoginForm } from "@/components/auth/login-form";
import { motion } from "framer-motion";
import { Sparkles, Building2 } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex items-center justify-center">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      {/* Decorative Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-[10%] top-[20%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-[10%] bottom-[10%] h-[600px] w-[600px] rounded-full bg-secondary/20 blur-[120px]"
      />

      <div className="container relative z-10 mx-auto flex min-h-screen flex-col items-center justify-center p-4">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-5xl"
        >
          <div className="glass overflow-hidden rounded-[2.5rem] shadow-2xl ring-1 ring-white/20">
            <div className="flex flex-col lg:flex-row">
              
              {/* Left Panel: Branding */}
              <div className="relative hidden w-full overflow-hidden bg-gradient-brand p-12 lg:flex lg:w-1/2 flex-col justify-between text-white">
                <div className="absolute inset-0 bg-grid-pattern-light opacity-20" />
                
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="relative z-10 flex items-center gap-3 text-2xl font-bold tracking-tight"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  Plexi-ERP
                </motion.div>

                <div className="relative z-10 mt-auto mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-md ring-1 ring-white/20">
                      <Sparkles className="h-4 w-4 text-white" />
                      <span>Next Generation Central ERP</span>
                    </div>
                    <h1 className="mb-4 text-4xl font-bold leading-tight">
                      Streamlining Production to Perfection
                    </h1>
                    <p className="text-lg text-white/80 leading-relaxed">
                      "A unified platform from the bobbin plant all the way to finished goods dispatch. Empowering our management team with real-time insights."
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Right Panel: Login Form */}
              <div className="w-full bg-white/50 p-8 sm:p-12 lg:w-1/2 backdrop-blur-xl">
                <div className="mx-auto w-full max-w-sm flex flex-col justify-center space-y-8 min-h-[500px]">
                  
                  <div className="flex flex-col space-y-2 text-center lg:text-left">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                      Welcome back
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Enter your credentials to securely sign in to your account.
                    </p>
                  </div>

                  <LoginForm />
                  
                  <p className="px-2 text-center text-xs text-muted-foreground">
                    By clicking continue, you agree to our{" "}
                    <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">Terms of Service</a>{" "}
                    and{" "}
                    <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">Privacy Policy</a>.
                  </p>
                </div>
              </div>
              
            </div>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}
