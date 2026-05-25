"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateVideoStore } from "@/lib/store";
import { StepIndicator } from "@/components/create/StepIndicator";
import { Step1Avatar } from "@/components/create/Step1Avatar";
import { Step2Script } from "@/components/create/Step2Script";
import { Step3Voice } from "@/components/create/Step3Voice";
import { Step4Generate } from "@/components/create/Step4Generate";

const STEPS = [
  { num: 1, label: "Avatar" },
  { num: 2, label: "Script" },
  { num: 3, label: "Voice" },
  { num: 4, label: "Generate" },
];

export default function CreatePage() {
  const step = useCreateVideoStore((s) => s.step);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Create New Video</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Follow the steps to generate your AI avatar video
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={step} />

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <Step1Avatar />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <Step2Script />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <Step3Voice />
          </motion.div>
        )}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <Step4Generate />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
