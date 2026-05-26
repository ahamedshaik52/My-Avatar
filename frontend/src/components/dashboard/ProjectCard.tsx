"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Play, MoreHorizontal, Download, Trash2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn, formatRelative, getStatusColor, getStatusLabel } from "@/lib/utils";
import { projectsApi, videoApi } from "@/lib/api";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  index?: number;
  onDelete?: (id: string) => void;
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "completed") return <CheckCircle size={12} className="text-green-400" />;
  if (status === "processing") return <Clock size={12} className="text-yellow-400 animate-pulse" />;
  if (status === "failed") return <AlertCircle size={12} className="text-red-400" />;
  return null;
};

export function ProjectCard({ project, index = 0, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!project.generated_video_id) {
      toast.error("No video available for download");
      return;
    }
    setDownloading(true);
    try {
      const { url } = await videoApi.getDownloadUrl(project.generated_video_id);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, "-")}.mp4`;
      a.click();
    } catch {
      toast.error("Could not generate download link");
    } finally {
      setDownloading(false);
      setMenuOpen(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectsApi.delete(project.id);
      toast.success("Project deleted");
      onDelete?.(project.id);
    } catch {
      toast.error("Could not delete project");
    } finally {
      setDeleting(false);
      setMenuOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group glass-card rounded-xl overflow-hidden hover:border-avatar-purple/30 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-avatar-dark-card to-avatar-dark">
        {project.thumbnail_url ? (
          <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-avatar-purple/20 flex items-center justify-center">
              <Play size={24} className="text-avatar-purple-light" />
            </div>
          </div>
        )}

        {/* Overlay on hover */}
        {project.status === "completed" && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Link href={`/projects/${project.id}`}>
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
                <Play size={24} className="text-white ml-1" />
              </div>
            </Link>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-avatar-dark/80 backdrop-blur-sm border border-avatar-dark-border",
            getStatusColor(project.status)
          )}>
            <StatusIcon status={project.status} />
            {getStatusLabel(project.status)}
          </div>
        </div>

        {/* Menu */}
        <div className="absolute top-2 right-2">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 rounded-lg bg-avatar-dark/80 backdrop-blur-sm border border-avatar-dark-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-avatar-dark-border bg-avatar-dark-card shadow-xl z-20">
                {project.status === "completed" && (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-t-xl transition-colors disabled:opacity-50"
                  >
                    <Download size={14} />
                    {downloading ? "Preparing…" : "Download"}
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/10 rounded-b-xl transition-colors"
                >
                  <Trash2 size={14} />
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <Link href={`/projects/${project.id}`}>
          <h3 className="font-semibold text-foreground text-sm hover:text-avatar-purple-light transition-colors truncate">
            {project.title}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">{formatRelative(project.updated_at)}</p>
      </div>
    </motion.div>
  );
}
