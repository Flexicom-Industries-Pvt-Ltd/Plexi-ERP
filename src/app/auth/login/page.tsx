import { LoginForm } from "@/components/auth/login-form";
import { Sparkles, Globe, HeadphonesIcon, ShieldCheck } from "lucide-react";
import Image from "next/image";

import logoImg from "../../../../public/logo.png";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left Panel: Enterprise Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between bg-gradient-brand p-12 text-white relative overflow-hidden">
        {/* Subtle grid pattern for depth */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:24px_30px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-md">
              <Image src={logoImg} alt="Flexicom Logo" className="h-12 w-12 object-contain" />
            </div>
            <span className="text-3xl font-bold tracking-tight">Flexicom ERP</span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg mb-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-md ring-1 ring-white/20">
            <Sparkles className="h-4 w-4 text-white" />
            <span>Next Generation Central ERP</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-6 leading-tight">
            Streamlining Production to Perfection
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            A unified, high-performance platform for end-to-end production tracking, inventory management, and dispatch control.
          </p>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col p-8 sm:p-12 lg:p-16 bg-white relative">
        {/* Top Right Actions */}
        <div className="absolute top-8 right-8 hidden sm:flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <button className="flex items-center gap-2 hover:text-primary transition-colors">
            <Globe className="h-4 w-4" />
            <span>EN</span>
          </button>
          <div className="h-4 w-px bg-border"></div>
          <button className="flex items-center gap-2 hover:text-primary transition-colors">
            <HeadphonesIcon className="h-4 w-4" />
            <span>IT Support</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Mobile Header - Only visible on small screens */}
          <div className="flex lg:hidden flex-col items-center gap-4 mb-10 w-full max-w-[400px]">
            <div className="flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-md p-4 ring-1 ring-black/5">
              <Image src={logoImg} alt="Flexicom Logo" className="h-16 w-16 object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-primary">Flexicom ERP</span>
          </div>

          <div className="w-full max-w-[400px] space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your corporate credentials to securely sign in.
              </p>
            </div>

            <LoginForm />
            
            <p className="text-center text-xs text-muted-foreground pt-4">
              By clicking continue, you agree to our{" "}
              <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">Privacy Policy</a>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-emerald-600 font-medium">All systems operational</span>
          </div>
          <div className="mt-4 sm:mt-0">
            &copy; {new Date().getFullYear()} Flexicom Group. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
