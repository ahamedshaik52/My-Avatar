"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  num: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
                currentStep > step.num
                  ? "bg-avatar-purple border-avatar-purple text-white"
                  : currentStep === step.num
                  ? "border-avatar-purple text-avatar-purple-light bg-avatar-purple/10"
                  : "border-avatar-dark-border text-muted-foreground bg-transparent"
              )}
            >
              {currentStep > step.num ? <Check size={16} /> : step.num}
            </div>
            <span
              className={cn(
                "text-xs mt-1.5 font-medium transition-colors",
                currentStep >= step.num ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-3 mt-[-1rem] transition-all duration-500",
                currentStep > step.num
                  ? "bg-gradient-to-r from-avatar-purple to-avatar-cyan"
                  : "bg-avatar-dark-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
