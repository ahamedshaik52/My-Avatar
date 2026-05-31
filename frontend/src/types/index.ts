// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan: "free" | "pro" | "enterprise";
  credits: number;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: "bearer";
}

// ─── Projects ─────────────────────────────────────────────────────────────────
export type ProjectStatus = "draft" | "processing" | "completed" | "failed";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  status: ProjectStatus;
  avatar_id?: string;
  script_id?: string;
  voice_id?: string;
  generated_video_id?: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
export interface Avatar {
  id: string;
  user_id: string;
  filename: string;
  url: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  duration?: number;
  file_size?: number;
  created_at: string;
}

// ─── Script ────────────────────────────────────────────────────────────────────
export interface Script {
  id: string;
  project_id: string;
  content: string;
  language: string;
  word_count: number;
  estimated_duration: number;
  created_at: string;
}

// ─── Voice ─────────────────────────────────────────────────────────────────────
export type VoiceGender = "male" | "female" | "neutral";
export type VoiceAccent =
  | "american"
  | "british"
  | "australian"
  | "indian"
  | "canadian"
  | "neutral";

export interface Voice {
  id: string;
  name: string;
  gender: VoiceGender;
  accent: VoiceAccent;
  language: string;
  preview_url: string;
  description: string;
  tags: string[];
  is_cloneable: boolean;
}

export interface GeneratedAudio {
  id: string;
  project_id: string;
  voice_id: string;
  url: string;
  duration: number;
  created_at: string;
}

// ─── Video Jobs ────────────────────────────────────────────────────────────────
export type JobStep =
  | "queued"
  | "validating"
  | "generating_audio"
  | "normalizing_audio"
  | "generating_lipsync"
  | "interpolating_frames"
  | "upscaling"
  | "color_grading"
  | "noise_cleanup"
  | "exporting"
  | "completed"
  | "failed";

export interface VideoJob {
  id: string;
  project_id: string;
  status: JobStep;
  progress: number;
  current_step: string;
  error_message?: string;
  video_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GeneratedVideo {
  id: string;
  project_id: string;
  job_id: string;
  url: string;
  download_url: string;
  thumbnail_url: string;
  duration: number;
  resolution: "1080p" | "2k" | "4k";
  file_size: number;
  created_at: string;
}

// ─── API Responses ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
}

// ─── Forms ─────────────────────────────────────────────────────────────────────
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface CreateVideoForm {
  title: string;
  avatar_id: string;
  script: string;
  voice_id: string;
  resolution: "1080p" | "2k" | "4k";
}

// ─── Store Types ───────────────────────────────────────────────────────────────
export interface CreateVideoState {
  step: 1 | 2 | 3 | 4;
  title: string;
  avatar: Avatar | null;
  script: string;
  selectedVoice: Voice | null;
  generatedAudio: GeneratedAudio | null;
  videoJob: VideoJob | null;
  generatedVideo: GeneratedVideo | null;
  resolution: "1080p" | "2k" | "4k";
}
