import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
