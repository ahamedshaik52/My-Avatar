"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ChevronLeft, Download, Play, Clock, CheckCircle,
  AlertCircle, Loader2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { projectsApi, videoApi } from "@/lib/api";
import { formatRelative, formatFileSize, getStatusColor, getStatusLabel, cn } from "@/lib/utils";
import type { GeneratedVideo } from "@/types";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [video, setVideo] = useState<GeneratedVideo | null>(null);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });

  // Load the generated video when project is completed
  useEffect(() => {
    if (project?.status === "completed" && project.generated_video_id && !video) {
      videoApi.get(project.generated_video_id).then(setVideo).catch(() => {});
    }
  }, [project?.status, project?.generated_video_id]);

  const handleDownload = async () => {
    if (!project?.generated_video_id) return;
    setDownloading(true);
    try {
      const { url } = await videoApi.getDownloadUrl(project.generated_video_id);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, "-")}.mp4`;
      a.click();
    } catch {
      toast.error("Could not generate download link. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="animate-spin text-avatar-purple-light" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Project not found</h2>
        <p className="text-muted-foreground text-sm mb-6">This project may have been deleted.</p>
        <Button variant="outline" asChild>
          <Link href="/projects">
            <ChevronLeft size={16} className="mr-2" />
            Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ChevronLeft size={16} className="mr-1" />
            Projects
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-foreground font-medium truncate max-w-xs">{project.title}</span>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
              getStatusColor(project.status),
              "bg-avatar-dark/60 border-avatar-dark-border"
            )}>
              {project.status === "completed" && <CheckCircle size={11} />}
              {project.status === "processing" && <Clock size={11} className="animate-pulse" />}
              {project.status === "failed" && <AlertCircle size={11} />}
              {getStatusLabel(project.status)}
            </span>
            <span className="text-xs text-muted-foreground">
              Updated {formatRelative(project.updated_at)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          {project.status === "completed" && (
            <Button
              variant="gradient"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading
                ? <><Loader2 size={16} className="animate-spin mr-2" />Preparing…</>
                : <><Download size={16} className="mr-2" />Download MP4</>}
            </Button>
          )}
          {(project.status === "draft" || project.status === "failed") && (
            <Button variant="gradient" asChild>
              <Link href="/create">
                <RefreshCw size={16} className="mr-2" />
                {project.status === "failed" ? "Retry" : "Continue editing"}
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Video player — completed */}
      {project.status === "completed" && video && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl overflow-hidden"
        >
          <div className="aspect-video bg-black">
            <video
              src={video.url}
              controls
              poster={video.thumbnail_url || project.thumbnail_url || undefined}
              className="w-full h-full"
            />
          </div>
          <div className="p-5 flex flex-wrap gap-6 text-sm text-muted-foreground border-t border-avatar-dark-border">
            <span><strong className="text-foreground">{video.resolution.toUpperCase()}</strong> resolution</span>
            <span><strong className="text-foreground">{Math.round(video.duration)}s</strong> duration</span>
            <span><strong className="text-foreground">{formatFileSize(video.file_size)}</strong> file size</span>
          </div>
        </motion.div>
      )}

      {/* Loading video data */}
      {project.status === "completed" && !video && (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-avatar-purple-light mr-3" />
          <span className="text-muted-foreground text-sm">Loading video…</span>
        </div>
      )}

      {/* Processing state */}
      {project.status === "processing" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-10 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-yellow-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Video is being generated</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Your video is being processed. This typically takes 2–5 minutes. Check back shortly or
            watch the progress live from the{" "}
            <Link href="/create" className="text-avatar-purple-light hover:underline">
              create page
            </Link>.
          </p>
        </motion.div>
      )}

      {/* Draft state */}
      {project.status === "draft" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-10 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-avatar-purple/10 flex items-center justify-center mx-auto mb-4">
            <Play size={32} className="text-avatar-purple-light" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Draft project</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
            This project hasn&apos;t been generated yet. Continue editing to finish your video.
          </p>
          <Button variant="gradient" asChild>
            <Link href="/create">Continue editing</Link>
          </Button>
        </motion.div>
      )}

      {/* Failed state */}
      {project.status === "failed" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-10 text-center border border-red-400/20"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Generation failed</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
            Something went wrong while generating this video. You can start a new video from scratch.
          </p>
          <Button variant="gradient" asChild>
            <Link href="/create">
              <RefreshCw size={16} className="mr-2" />
              Start new video
            </Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
