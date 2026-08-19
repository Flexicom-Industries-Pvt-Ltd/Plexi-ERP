"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, Users, Factory, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { motion, Variants } from "framer-motion";
import Link from "next/link";

const stats = [
  {
    title: "Total Revenue",
    value: "₹1,245,231",
    change: "+20.1%",
    trend: "up",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Active Production Orders",
    value: "14",
    change: "+3 since yesterday",
    trend: "up",
    icon: Factory,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    title: "Pending Gate Entries",
    value: "5",
    change: "Requires attention",
    trend: "neutral",
    icon: AlertTriangle,
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    title: "Active Users",
    value: "128",
    change: "+12 this month",
    trend: "up",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
];

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 w-full">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Overview</h2>
          <p className="text-muted-foreground mt-1">Welcome to the Plexi-ERP central command center.</p>
        </div>
      </div>
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card className="glass hover-lift border-0 ring-1 ring-black/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 grid gap-4 md:grid-cols-2"
      >
        <Card className="glass flex flex-col h-full border-0 ring-1 ring-black/5">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest operations across the factory floor.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-center p-6 relative overflow-hidden rounded-xl">
             <div className="absolute inset-0 bg-dot-pattern opacity-30" />
             <div className="relative z-10 flex flex-col items-center">
               <div className="mb-4 rounded-full bg-primary/10 p-3 ring-1 ring-primary/20">
                 <Building2 className="h-6 w-6 text-primary" />
               </div>
               <h3 className="text-lg font-medium text-foreground mb-1">No Recent Activity</h3>
               <p className="text-sm text-muted-foreground max-w-[250px] mb-4">
                 Your timeline is currently empty. Production and dispatch events will appear here.
               </p>
             </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-brand text-white border-0 shadow-lg relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 bg-grid-pattern-light opacity-20" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-white/70">
              Jump straight to important modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/dashboard/gate" className="flex items-center justify-between rounded-xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/20 transition-all hover:bg-white/20 hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-white" />
                <span className="font-medium text-sm">Gate Entry</span>
              </div>
              <ArrowRight className="h-4 w-4 text-white/50" />
            </Link>
            <Link href="/dashboard/production" className="flex items-center justify-between rounded-xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/20 transition-all hover:bg-white/20 hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <Factory className="h-5 w-5 text-white" />
                <span className="font-medium text-sm">Production</span>
              </div>
              <ArrowRight className="h-4 w-4 text-white/50" />
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
