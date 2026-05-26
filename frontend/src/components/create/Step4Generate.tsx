"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Play, Download, CheckCircle, AlertCircle,
  Loader2, Zap, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCreateVideoStore } from "@/lib/store";
import { videoApi } from "@/lib/api";
import { getStatusLabel, formatFileSize } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { JobStep } from "@/types";

const PIPELINE_STEPS: { key: JobStep; label: string; icon: string }[] = [
  { key: "validating", label: "Validating inputs", icon: "🔍" },
  { key: "generating_audio", label: "Generating speech", icon: "🎙️" },
  { key: "normalizing_audio", label: "Normalizing audio", icon: "🎚️" },
  { key: "generating_lipsync", label: "Rendering lip sync", icon: "👄" },
  { key: "interpolating_frames", label: "Frame interpolation", icon: "🎬" },
  { key: "upscaling", label: "Upscaling to 4K", icon: "✨" },
  { key: "color_grading", label: "Cinematic color grade", icon: "🎨" },
  { key: "noise_cleanup", label: "Noise cleanup", icon: "🔊" },
  { key: "exporting", label: "Exporting MP4", icon: "📦" },
];

export function Step4Generate() {
  const {
    avatar, generatedAudio, resolution, videoJob, generatedVideo,
    projectId, setVideoJob, setGeneratedVideo, setResolution, setStep,
  } = useCreateVideoStore();

  const [starting, setStarting] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startGeneration = async () => {
    if (!avatar || !generatedAudio || !projectId) {
      toast.error("Avatar, audio, and project are required");
      return;
    }
    setStarting(true);
    try {
      const job = await videoApi.generate({
        project_id: projectId,
        avatar_id: avatar.id,
        audio_id: generatedAudio.id,
        resolution,
      });
      setVideoJob(job);
    } catch {
      toast.error("Could not start video generation");
    } finally {
      setStarting(false);
    }
  };

  // Poll job status
  useEffect(() => {
    if (!videoJob || videoJob.status === "completed" || videoJob.status === "failed") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const updated = await videoApi.status(videoJob.id);
        setVideoJob(updated);
        if (updated.status === "completed") {
          const video = await videoApi.get(updated.video_id!);
          setGeneratedVideo(video);
          toast.success("Your video is ready!");
          clearInterval(pollRef.current!);
        }
        if (updated.status === "failed") {
          toast.error(`Generation failed: ${updated.error_message}`);
          clearInterval(pollRef.current!);
        }
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [videoJob?.id, videoJob?.status]);

  const handleDownload = async () => {
    if (!generatedVideo) return;
    try {
      const { url } = await videoApi.getDownloadUrl(generatedVideo.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-avatar-${Date.now()}.mp4`;
      a.click();
    } catch {
      toast.error("Download link expired. Please refresh.");
    }
  };

  const currentStepIdx = PIPELINE_STEPS.findIndex((s) => s.key === videoJob?.status) ?? -1;

  return (
    <div className="space-y-6">
      {/* Resolution selector (before generation) */}
      {!videoJob && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" />
            Export quality
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {(["1080p", "2k", "4k"] as const).map((res) => (
              <button
                key={res}
                onClick={() => setResolution(res)}
                className={cn(
                  "py-4 px-3 rounded-xl border text-center transition-all",
                  resolution === res
                    ? "border-avatar-purple bg-avatar-purple/10 text-avatar-purple-light"
                    : "border-avatar-dark-border text-muted-foreground hover:border-avatar-purple/30"
                )}
              >
                <div className="text-lg font-bold">{res.toUpperCase()}</div>
                <div className="text-xs mt-0.5">
                  {res === "1080p" ? "Full HD" : res === "2k" ? "2K QHD" : "4K Ultra HD"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary before generation */}
      {!videoJob && (
        <div className="glass-card rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-foreground mb-3">Generation summary</h3>
          {[
            { label: "Avatar", value: avatar ? `${avatar.type === "image" ? "Image" : "Video"} uploaded` : "—" },
            { label: "Audio", value: generatedAudio ? `${Math.round(generatedAudio.duration)}s generated` : "—" },
            { label: "Quality", value: resolution.toUpperCase() },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Processing pipeline */}
      {videoJob && videoJob.status !== "completed" && videoJob.status !== "failed" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Generating your video…</h3>
            <span className="text-sm font-bold text-avatar-purple-light">{videoJob.progress}%</span>
          </div>
          <Progress value={videoJob.progress} className="h-2" />

          <div className="space-y-2">
            {PIPELINE_STEPS.map((step, i) => {
              const done = i < currentStepIdx;
              const active = i === currentStepIdx;
              return (
                <div key={step.key} className={cn(
                  "flex items-center gap-3 py-2 px-3 rounded-lg transition-all",
                  active ? "bg-avatar-purple/10 border border-avatar-purple/20" : ""
                )}>
                  <span className="text-lg">{step.icon}</span>
                  <span className={cn(
                    "text-sm flex-1",
                    active ? "text-avatar-purple-light font-medium" : done ? "text-muted-foreground line-through" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                  {done && <CheckCircle size={14} className="text-green-400" />}
                  {active && <Loader2 size={14} className="text-avatar-purple-light animate-spin" />}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            This typically takes 2–5 minutes depending on video length and quality settings.
          </p>
        </motion.div>
      )}

      {/* Completed */}
      {videoJob?.status === "completed" && generatedVideo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-5"
        >
          <div className="glass-card rounded-xl p-5 flex items-center gap-3 border border-green-400/30 bg-green-400/5">
            <CheckCircle size={24} className="text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Video ready!</p>
              <p className="text-xs text-muted-foreground">
                {resolution.toUpperCase()} · {Math.round(generatedVideo.duration)}s · {formatFileSize(generatedVideo.file_size)}
              </p>
            </div>
          </div>

          {/* Video preview */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="aspect-video bg-black">
              <video
                src={generatedVideo.url}
                controls
                className="w-full h-full"
                poster={generatedVideo.thumbnail_url}
              />
            </div>
          </div>

          <Button variant="gradient" size="xl" className="w-full" onClick={handleDownload}>
            <Download size={20} className="mr-2" />
            Download MP4 ({resolution.toUpperCase()})
          </Button>
        </motion.div>
      )}

      {/* Failed */}
      {videoJob?.status === "failed" && (
        <div className="glass-card rounded-xl p-6 text-center border border-red-400/20">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">Generation failed</p>
          <p className="text-xs text-muted-foreground mb-4">{videoJob.error_message}</p>
          <Button variant="outline" onClick={startGeneration}>
            <RefreshCw size={16} className="mr-2" />
            Try again
          </Button>
        </div>
      )}

      <div className="flex justify-between">
        {!videoJob && (
          <Button variant="outline" size="lg" onClick={() => setStep(3)}>
            <ChevronLeft size={18} className="mr-2" />
            Back
          </Button>
        )}

        {!videoJob && (
          <Button
            variant="gradient"
            size="xl"
            disabled={starting || !avatar || !generatedAudio || !projectId}
            onClick={startGeneration}
            className="ml-auto"
          >
            {starting ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Starting…
              </>
            ) : (
              <>
                <Zap size={18} className="mr-2" />
                Generate Video
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
