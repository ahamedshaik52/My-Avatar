"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, Image, Video, X, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateVideoStore } from "@/lib/store";
import { avatarApi, projectsApi } from "@/lib/api";
import { validateAvatarFile, formatFileSize } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Step1Avatar() {
  const { title, avatar, setTitle, setAvatar, setProjectId: setStoreProjectId, setStep } = useCreateVideoStore();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const err = validateAvatarFile(file);
    if (err) { toast.error(err); return; }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreview(url);

    setUploading(true);
    setUploadProgress(0);
    try {
      let pid = projectId;
      if (!pid) {
        const project = await projectsApi.create(title || "Untitled Video");
        pid = project.id; setStoreProjectId(pid);
        setProjectId(pid);
      }
      const uploadedAvatar = await avatarApi.upload(pid, file, setUploadProgress);
      setAvatar(uploadedAvatar);
      toast.success("Avatar uploaded successfully!");
    } catch {
      toast.error("Upload failed. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [projectId, title, setAvatar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [], "image/png": [], "image/webp": [],
      "video/mp4": [], "video/quicktime": [], "video/webm": [],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const removeAvatar = () => {
    setAvatar(null);
    setPreview(null);
    setProjectId(null);
  };

  const canContinue = avatar !== null && title.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Project title */}
      <div className="glass-card rounded-xl p-6">
        <label className="text-sm font-semibold text-foreground block mb-2">Project title *</label>
        <Input
          placeholder="e.g., Product Demo Q3 2024"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-base"
        />
        <p className="text-xs text-muted-foreground mt-1.5">Give your video project a memorable name.</p>
      </div>

      {/* Avatar upload */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Upload avatar *</h3>
        <p className="text-xs text-muted-foreground mb-5">
          Upload a clear photo or short video (5-30s). Face must be clearly visible.
        </p>

        {avatar && preview ? (
          <div className="relative">
            <div className="aspect-video rounded-xl overflow-hidden bg-avatar-dark-card border border-avatar-dark-border">
              {avatar.type === "video" ? (
                <video src={preview} className="w-full h-full object-contain" muted loop autoPlay playsInline />
              ) : (
                <img src={preview} alt="Avatar preview" className="w-full h-full object-contain" />
              )}
            </div>
            <button
              onClick={removeAvatar}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
            <div className="flex items-center gap-3 mt-3 p-3 rounded-lg bg-green-400/10 border border-green-400/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-400 font-medium">Avatar ready</span>
              <span className="text-xs text-muted-foreground ml-auto">{formatFileSize(avatar.file_size ?? 0)}</span>
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300",
              isDragActive
                ? "border-avatar-purple bg-avatar-purple/10 upload-zone-active"
                : "border-avatar-dark-border hover:border-avatar-purple/50 hover:bg-avatar-dark-card/50",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={40} className="text-avatar-purple animate-spin" />
                <p className="text-sm font-medium text-foreground">Uploading… {uploadProgress}%</p>
                <div className="w-full max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-avatar-purple to-avatar-cyan transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-avatar-purple/10 border border-avatar-purple/20 flex items-center justify-center">
                  {isDragActive ? (
                    <Upload size={32} className="text-avatar-purple-light animate-bounce" />
                  ) : (
                    <Upload size={32} className="text-avatar-purple-light" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground mb-1">
                    {isDragActive ? "Drop your file here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-sm text-muted-foreground">JPG, PNG, WEBP, MP4, MOV · Max 200MB</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Image size={14} />
                    Photo avatar
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Video size={14} />
                    Video avatar
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="glass-card rounded-xl p-5">
        <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Tips for best results</h4>
        <ul className="space-y-2">
          {[
            "Use a well-lit, front-facing photo or video",
            "Ensure your face takes up at least 40% of the frame",
            "Avoid heavy filters or distortions",
            "For video: keep it 5–30 seconds, stable camera",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-avatar-purple-light mt-0.5">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end">
        <Button
          variant="gradient"
          size="lg"
          disabled={!canContinue}
          onClick={() => setStep(2)}
        >
          Continue to Script
          <ChevronRight size={18} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
