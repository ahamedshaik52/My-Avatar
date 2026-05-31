import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Resolve a stored media reference to a URL the browser can actually load.
 * Backend local-storage URLs are relative (`/media/...`); on a different host
 * (e.g. the Vercel frontend) those must be absolutized against the API origin
 * so preview/poster requests don't 404 against the frontend domain.
 * Absolute URLs (S3, http/https) and blob/data URLs pass through unchanged.
 */
export function toMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  if (path.startsWith("/media")) return `${API_BASE}${path}`;
  return path;
}

/** Trigger a browser "Save As" for an in-memory blob with the given filename. */
export function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Build a filesystem-safe `<base>.mp4` filename from a project title. */
export function safeVideoFilename(title: string | null | undefined, fallback = "my-avatar"): string {
  const base = (title || fallback).trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${(base || fallback).slice(0, 80)}.mp4`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export function estimateDuration(text: string): number {
  const wordsPerMinute = 140;
  const words = text.trim().split(/\s+/).length;
  return Math.max(15, Math.ceil((words / wordsPerMinute) * 60));
}

export function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: "text-gray-400",
    processing: "text-yellow-400",
    completed: "text-green-400",
    failed: "text-red-400",
    queued: "text-blue-400",
  };
  return map[status] ?? "text-gray-400";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    queued: "Queued",
    validating: "Validating",
    generating_audio: "Generating Audio",
    normalizing_audio: "Normalizing Audio",
    generating_lipsync: "Generating Lip Sync",
    interpolating_frames: "Interpolating Frames",
    upscaling: "Upscaling to 4K",
    color_grading: "Color Grading",
    noise_cleanup: "Noise Cleanup",
    exporting: "Exporting MP4",
  };
  return map[status] ?? status;
}

export function validateAvatarFile(file: File): string | null {
  const maxSizeMB = 200;
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ];
  if (!allowedTypes.includes(file.type)) {
    return "Please upload a JPG, PNG, WEBP image or MP4, MOV, WEBM video.";
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File must be under ${maxSizeMB}MB.`;
  }
  return null;
}

export function validateAudioFile(file: File): string | null {
  const maxSizeMB = 50;
  const allowedTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/mp4"];
  if (!allowedTypes.includes(file.type)) {
    return "Please upload an MP3, WAV, OGG, FLAC, or M4A audio file.";
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File must be under ${maxSizeMB}MB.`;
  }
  return null;
}
