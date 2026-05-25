"use client";
import { motion } from "framer-motion";
import { Upload, FileText, Mic, Film } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Upload your avatar",
    description: "Drop in a photo or short video. Supports JPG, PNG, MP4, and MOV up to 200MB.",
    color: "from-avatar-purple to-avatar-purple-dark",
  },
  {
    step: "02",
    icon: FileText,
    title: "Write your script",
    description: "Type or paste your script into our editor. We'll show you estimated duration and word count.",
    color: "from-avatar-pink to-rose-700",
  },
  {
    step: "03",
    icon: Mic,
    title: "Choose a voice",
    description: "Browse our voice library, preview each one, or upload a sample for voice cloning.",
    color: "from-avatar-cyan to-cyan-700",
  },
  {
    step: "04",
    icon: Film,
    title: "Generate & download",
    description: "Hit generate and watch our AI build your video. Download it in 4K MP4 when ready.",
    color: "from-yellow-500 to-orange-600",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-avatar-purple/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-avatar-cyan/30 bg-avatar-cyan/10 text-avatar-cyan text-sm font-medium mb-4">
            Simple workflow
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            From script to video in{" "}
            <span className="gradient-text">4 easy steps</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No technical skills required. If you can type a sentence, you can create a professional AI video.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line */}
          <div className="absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-avatar-purple via-avatar-pink to-avatar-cyan hidden lg:block opacity-30" />

          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative text-center"
            >
              <div className="relative inline-flex mb-6">
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                  <step.icon size={36} className="text-white" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-avatar-dark border-2 border-avatar-dark-border flex items-center justify-center">
                  <span className="text-xs font-mono font-bold gradient-text">{step.step}</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
