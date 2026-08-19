"use client";

import React from "react";
import { motion } from "framer-motion";
import { Construction, Sparkles } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({ 
  title = "Coming Soon", 
  description = "We are crafting something amazing. This module will be available in the upcoming updates." 
}: ComingSoonProps) {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-8">
      <div className="absolute inset-0 bg-dot-pattern opacity-50 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass relative z-10 flex max-w-md flex-col items-center rounded-3xl p-10 text-center"
      >
        <div className="relative mb-6">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary to-secondary opacity-20 blur-xl"
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-black/5">
            <Construction className="h-10 w-10 text-primary" />
            <motion.div 
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -right-2 -top-2"
            >
              <Sparkles className="h-6 w-6 text-secondary" />
            </motion.div>
          </div>
        </div>
        
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/20">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/2 bg-gradient-accent rounded-full"
            />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            In Development
          </span>
        </div>
      </motion.div>
    </div>
  );
}
