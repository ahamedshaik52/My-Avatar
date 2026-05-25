"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCTA() {
  return (
    <section className="py-24 relative">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden p-12 sm:p-16"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(6,182,212,0.1) 50%, rgba(236,72,153,0.15) 100%)",
            border: "1px solid rgba(124,58,237,0.3)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-avatar-purple/5 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-avatar-purple/20 blur-[80px] rounded-full" />

          <div className="relative">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-avatar-purple to-avatar-cyan flex items-center justify-center shadow-lg">
                <Sparkles size={32} className="text-white" />
              </div>
            </div>

            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Ready to create your{" "}
              <span className="gradient-text">first avatar video?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join 10,000+ creators who use My Avatar to produce professional videos in minutes.
              Free to start — no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gradient" size="xl" asChild>
                <Link href="/signup">
                  Get started free
                  <ArrowRight className="ml-2" size={18} />
                </Link>
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
