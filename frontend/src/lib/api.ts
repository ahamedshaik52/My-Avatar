import axios, { AxiosError, AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  ApiResponse,
  AuthTokens,
  User,
  Project,
  Avatar,
  Script,
  Voice,
  GeneratedAudio,
  VideoJob,
  GeneratedVideo,
  PaginatedResponse,
  LoginForm,
  SignupForm,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? "";
    // Never redirect from auth endpoints themselves — they return 401/400 as
    // normal business errors (wrong credentials, expired token, etc.)
    const isAuthEndpoint = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
    ].some((path) => url.includes(path));

    if (error.response?.status === 401 && !isAuthEndpoint) {
      Cookies.remove("access_token");
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (data: LoginForm): Promise<AuthTokens> => {
    const form = new URLSearchParams();
    form.append("username", data.email);
    form.append("password", data.password);
    const res = await api.post<AuthTokens>("/api/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data;
  },

  register: async (data: SignupForm): Promise<ApiResponse<User>> => {
    const res = await api.post<ApiResponse<User>>("/api/auth/register", data);
    return res.data;
  },

  me: async (): Promise<User> => {
    const res = await api.get<User>("/api/auth/me");
    return res.data;
  },

  logout: () => {
    Cookies.remove("access_token");
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>("/api/auth/forgot-password", { email });
    return res.data;
  },

  resetPassword: async (
    token: string,
    password: string,
    confirm_password: string
  ): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>("/api/auth/reset-password", {
      token,
      password,
      confirm_password,
    });
    return res.data;
  },

  validateResetToken: async (token: string): Promise<{ valid: boolean }> => {
    const res = await api.get<{ valid: boolean }>("/api/auth/reset-password/validate", {
      params: { token },
    });
    return res.data;
  },
};

// ─── Projects ─────────────────────────────────────────────────────────────────
export interface ProjectStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  this_month: number;
}

export const projectsApi = {
  list: async (page = 1, limit = 12): Promise<PaginatedResponse<Project>> => {
    const res = await api.get<PaginatedResponse<Project>>("/api/projects", {
      params: { page, limit },
    });
    return res.data;
  },

  get: async (id: string): Promise<Project> => {
    const res = await api.get<Project>(`/api/projects/${id}`);
    return res.data;
  },

  create: async (title: string): Promise<Project> => {
    const res = await api.post<Project>("/api/projects", { title });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/projects/${id}`);
  },

  stats: async (): Promise<ProjectStats> => {
    const res = await api.get<ProjectStats>("/api/projects/stats");
    return res.data;
  },
};

// ─── Avatar ────────────────────────────────────────────────────────────────────
export const avatarApi = {
  upload: async (
    projectId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<Avatar> => {
    const form = new FormData();
    form.append("file", file);
    form.append("project_id", projectId);
    const res = await api.post<Avatar>("/api/avatar/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
    return res.data;
  },

  get: async (id: string): Promise<Avatar> => {
    const res = await api.get<Avatar>(`/api/avatar/${id}`);
    return res.data;
  },
};

// ─── Script ────────────────────────────────────────────────────────────────────
export const scriptApi = {
  save: async (projectId: string, content: string, language = "en"): Promise<Script> => {
    const res = await api.post<Script>("/api/script/save", {
      project_id: projectId,
      content,
      language,
    });
    return res.data;
  },
};

// ─── Voice ─────────────────────────────────────────────────────────────────────
export const voiceApi = {
  list: async (): Promise<Voice[]> => {
    const res = await api.get<Voice[]>("/api/voices");
    return res.data;
  },

  preview: async (voiceId: string, text: string): Promise<{ url: string }> => {
    const res = await api.post<{ url: string }>("/api/voices/preview", {
      voice_id: voiceId,
      text,
    });
    return res.data;
  },

  generate: async (
    projectId: string,
    voiceId: string,
    text: string
  ): Promise<GeneratedAudio> => {
    const res = await api.post<GeneratedAudio>("/api/voices/generate", {
      project_id: projectId,
      voice_id: voiceId,
      text,
    });
    return res.data;
  },

  uploadSample: async (
    projectId: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<{ sample_id: string }> => {
    const form = new FormData();
    form.append("file", file);
    form.append("project_id", projectId);
    const res = await api.post<{ sample_id: string }>("/api/voices/upload-sample", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
    return res.data;
  },
};

// ─── Video ─────────────────────────────────────────────────────────────────────
export const videoApi = {
  generate: async (params: {
    project_id: string;
    avatar_id: string;
    audio_id: string;
    resolution: "1080p" | "2k" | "4k";
  }): Promise<VideoJob> => {
    const res = await api.post<VideoJob>("/api/video/generate", params);
    return res.data;
  },

  status: async (jobId: string): Promise<VideoJob> => {
    const res = await api.get<VideoJob>(`/api/video/status/${jobId}`);
    return res.data;
  },

  get: async (id: string): Promise<GeneratedVideo> => {
    const res = await api.get<GeneratedVideo>(`/api/video/${id}`);
    return res.data;
  },

  getDownloadUrl: async (id: string): Promise<{ url: string; expires_at: string }> => {
    const res = await api.get<{ url: string; expires_at: string }>(
      `/api/video/download/${id}`
    );
    return res.data;
  },
};

export default api;
