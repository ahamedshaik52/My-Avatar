"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, FileText, Clock, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateVideoStore } from "@/lib/store";
import { countWords, estimateDuration, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MAX_CHARS = 5000;

const sampleScripts = [
  {
    label: "Product intro",
    text: "Hi there! I'm excited to introduce our latest product that's going to change the way you work. With our innovative AI-powered solution, you'll save hours every week while producing better results than ever before. Let me show you how it works.",
  },
  {
    label: "Training intro",
    text: "Welcome to this training module. Today we're going to cover the fundamentals of customer communication. By the end of this session, you'll have the tools and confidence to handle any customer interaction professionally and effectively.",
  },
  {
    label: "Marketing",
    text: "Are you tired of spending hours creating videos? Imagine generating professional, studio-quality avatar videos in just minutes. With AI-powered lip sync and cinematic 4K quality, your message will always look polished and compelling.",
  },
];

export function Step2Script() {
  const { script, setScript, setStep } = useCreateVideoStore();
  const [focused, setFocused] = useState(false);
  const wordCount = countWords(script);
  const charCount = script.length;
  const duration = estimateDuration(script);
  const pctFull = Math.min(100, (charCount / MAX_CHARS) * 100);

  const canContinue = script.trim().length > 20;

  return (
    <div className="space-y-6">
      {/* Script editor */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText size={16} className="text-avatar-purple-light" />
              Your script *
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Write what your avatar will say. Min 20 characters.
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Type size={12} />
              {wordCount} words
            </span>
            <span className="flex items-center gap-1 text-avatar-cyan">
              <Clock size={12} />
              ~{formatDuration(duration)}
            </span>
          </div>
        </div>

        <div className={cn("relative rounded-xl transition-all duration-200", focused ? "ring-2 ring-avatar-purple/50" : "")}>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value.slice(0, MAX_CHARS))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Write your script here. Your avatar will speak these words exactly…"
            rows={10}
            className="w-full rounded-xl border border-avatar-dark-border bg-avatar-dark p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed font-mono"
          />
        </div>

        {/* Character counter */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                pctFull > 90 ? "bg-red-400" : pctFull > 70 ? "bg-yellow-400" : "bg-gradient-to-r from-avatar-purple to-avatar-cyan"
              )}
              style={{ width: `${pctFull}%` }}
            />
          </div>
          <span className={cn("text-xs font-mono", pctFull > 90 ? "text-red-400" : "text-muted-foreground")}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {/* Sample scripts */}
      <div className="glass-card rounded-xl p-5">
        <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Quick start templates</h4>
        <div className="grid sm:grid-cols-3 gap-3">
          {sampleScripts.map((s) => (
            <motion.button
              key={s.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setScript(s.text); toast.success(`Template "${s.label}" loaded`); }}
              className="text-left p-3 rounded-lg border border-avatar-dark-border hover:border-avatar-purple/40 bg-avatar-dark/50 transition-colors"
            >
              <p className="text-xs font-semibold text-avatar-purple-light mb-1">{s.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">{s.text}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Language hint */}
      <div className="rounded-lg p-4 bg-avatar-cyan/5 border border-avatar-cyan/20">
        <p className="text-xs text-avatar-cyan">
          <span className="font-semibold">Tip:</span> Scripts work in 30+ languages. Write in your target language and select a matching voice in the next step.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="lg" onClick={() => setStep(1)}>
          <ChevronLeft size={18} className="mr-2" />
          Back
        </Button>
        <Button
          variant="gradient"
          size="lg"
          disabled={!canContinue}
          onClick={() => setStep(3)}
        >
          Continue to Voice
          <ChevronRight size={18} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
