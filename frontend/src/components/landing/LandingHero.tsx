"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const badges = [
  { icon: Sparkles, label: "AI-Powered" },
  { icon: Zap, label: "4K Quality" },
  { icon: Shield, label: "Privacy First" },
];

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 bg-avatar-dark">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-avatar-purple/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-avatar-cyan/15 rounded-full blur-[120px]" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-avatar-pink/10 rounded-full blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(124,58,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Announcement badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-avatar-purple/30 bg-avatar-purple/10 text-avatar-purple-light text-sm font-medium mb-8"
        >
          <Sparkles size={14} />
          <span>Now with 4K AI video generation</span>
          <ArrowRight size={14} />
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
        >
          Create stunning{" "}
          <span className="gradient-text">AI avatar videos</span>
          <br />
          in minutes
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Upload your avatar, write your script, pick a voice — and watch My Avatar generate
          a professional, lip-synced video in cinematic 4K quality.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <Button variant="gradient" size="xl" asChild className="w-full sm:w-auto">
            <Link href="/signup">
              Start creating for free
              <ArrowRight className="ml-2" size={18} />
            </Link>
          </Button>
          <Button variant="glass" size="xl" className="w-full sm:w-auto group">
            <Play size={18} className="mr-2 text-avatar-cyan group-hover:text-avatar-cyan-light transition-colors" />
            Watch demo
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 mb-20"
        >
          {badges.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-avatar-dark-card border border-avatar-dark-border text-sm text-muted-foreground"
            >
              <Icon size={14} className="text-avatar-purple-light" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Hero video mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="relative max-w-5xl mx-auto"
        >
          <div className="glass-card rounded-2xl overflow-hidden shadow-2xl glow-purple">
            {/* Browser chrome mockup */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-avatar-dark-border bg-avatar-dark-card/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 bg-avatar-dark/60 rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                myavatar.ai/dashboard
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="bg-avatar-dark p-6 min-h-[400px] flex gap-4">
              {/* Sidebar */}
              <div className="hidden sm:flex flex-col gap-3 w-48">
                {["Dashboard", "Create Video", "Projects", "Settings"].map((item, i) => (
                  <div
                    key={item}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      i === 1
                        ? "bg-avatar-purple/20 text-avatar-purple-light border border-avatar-purple/30"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-40 bg-avatar-dark-card rounded-lg shimmer" />
                  <div className="h-8 w-28 bg-avatar-purple/30 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-video bg-avatar-dark-card rounded-xl border border-avatar-dark-border shimmer" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute -left-8 top-1/3 glass-card rounded-xl px-4 py-3 hidden lg:flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-avatar-purple/20 flex items-center justify-center">
              <Zap size={20} className="text-avatar-purple-light" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">2.4K+</div>
              <div className="text-xs text-muted-foreground">Videos generated</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="absolute -right-8 bottom-1/4 glass-card rounded-xl px-4 py-3 hidden lg:flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-avatar-cyan/20 flex items-center justify-center">
              <Shield size={20} className="text-avatar-cyan" />
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">99.9%</div>
              <div className="text-xs text-muted-foreground">Uptime SLA</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
