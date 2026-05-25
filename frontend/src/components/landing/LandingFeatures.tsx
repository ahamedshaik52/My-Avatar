"use client";
import { motion } from "framer-motion";
import { Mic2, Video, Wand2, Download, Globe, Zap, Shield, Layers } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Upload Any Avatar",
    description: "Use a photo or short video clip as your avatar. Our AI handles the rest — no green screen needed.",
    color: "text-avatar-purple-light",
    bg: "bg-avatar-purple/10",
    border: "border-avatar-purple/20",
  },
  {
    icon: Mic2,
    title: "50+ AI Voices",
    description: "Choose from a library of natural-sounding voices across genders, accents, and languages.",
    color: "text-avatar-cyan",
    bg: "bg-avatar-cyan/10",
    border: "border-avatar-cyan/20",
  },
  {
    icon: Wand2,
    title: "Precise Lip Sync",
    description: "Industry-leading lip synchronization ensures your avatar's mouth matches every word perfectly.",
    color: "text-avatar-pink",
    bg: "bg-avatar-pink/10",
    border: "border-avatar-pink/20",
  },
  {
    icon: Zap,
    title: "4K Export",
    description: "Export cinematic quality 4K MP4 videos with AI upscaling, frame interpolation, and color grading.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/20",
  },
  {
    icon: Globe,
    title: "Multi-language",
    description: "Generate videos in 30+ languages. Perfect for global teams and international content creators.",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/20",
  },
  {
    icon: Layers,
    title: "Script Editor",
    description: "Built-in script editor with character count, reading time estimate, and formatting tools.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  {
    icon: Download,
    title: "Instant Download",
    description: "Download your finished video as an MP4 the moment it's ready. No waiting rooms.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    icon: Shield,
    title: "Your Data, Private",
    description: "Your avatars, scripts, and videos are encrypted and never shared or used for training.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/20",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-avatar-dark via-avatar-dark-card/20 to-avatar-dark" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-avatar-purple/30 bg-avatar-purple/10 text-avatar-purple-light text-sm font-medium mb-4">
            Everything you need
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Professional videos,{" "}
            <span className="gradient-text">zero effort</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every tool you need to create, customize, and export stunning avatar videos — all in one platform.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className={`group glass-card rounded-xl p-6 border ${feat.border} hover:border-opacity-60 transition-all duration-300 hover:-translate-y-1`}
            >
              <div className={`w-11 h-11 rounded-xl ${feat.bg} flex items-center justify-center mb-4`}>
                <feat.icon size={22} className={feat.color} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
