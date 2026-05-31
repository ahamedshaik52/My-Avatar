import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, CreateVideoState, Avatar, Voice, GeneratedAudio, VideoJob, GeneratedVideo } from "@/types";

// ─── Auth Store ────────────────────────────────────────────────────────────────
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "auth-store", partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }) }
  )
);

// ─── Create Video Store ────────────────────────────────────────────────────────
// projectId tracks the server-side Project record created in Step 1.
// It must remain separate from avatar.id — passing avatar.id as project_id
// to the video API causes a 404 and breaks generation completely.
interface CreateVideoStoreState extends CreateVideoState {
  projectId: string | null;
}

interface CreateVideoStore extends CreateVideoStoreState {
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setTitle: (title: string) => void;
  setProjectId: (id: string) => void;
  setAvatar: (avatar: Avatar | null) => void;
  setScript: (script: string) => void;
  setVoice: (voice: Voice | null) => void;
  setGeneratedAudio: (audio: GeneratedAudio | null) => void;
  setVideoJob: (job: VideoJob | null) => void;
  setGeneratedVideo: (video: GeneratedVideo | null) => void;
  setResolution: (res: "1080p" | "2k" | "4k") => void;
  reset: () => void;
}

const initialState: CreateVideoStoreState = {
  step: 1,
  title: "",
  projectId: null,
  avatar: null,
  script: "",
  selectedVoice: null,
  generatedAudio: null,
  videoJob: null,
  generatedVideo: null,
  resolution: "1080p",
};

export const useCreateVideoStore = create<CreateVideoStore>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setTitle: (title) => set({ title }),
      setProjectId: (id) => set({ projectId: id }),
      setAvatar: (avatar) => set({ avatar }),
      setScript: (script) => set({ script }),
      setVoice: (voice) => set({ selectedVoice: voice }),
      setGeneratedAudio: (audio) => set({ generatedAudio: audio }),
      setVideoJob: (job) => set({ videoJob: job }),
      setGeneratedVideo: (video) => set({ generatedVideo: video }),
      setResolution: (resolution) => set({ resolution }),
      reset: () => set(initialState),
    }),
    {
      name: "create-video-store",
      storage: {
        getItem: (key) => {
          if (typeof window === "undefined") return null;
          const v = sessionStorage.getItem(key);
          return v ? JSON.parse(v) : null;
        },
        setItem: (key, value) => {
          if (typeof window !== "undefined") sessionStorage.setItem(key, JSON.stringify(value));
        },
        removeItem: (key) => {
          if (typeof window !== "undefined") sessionStorage.removeItem(key);
        },
      },
      // Exclude functions from persistence — only persist data fields.
      // Cast because zustand's persist types partialize as returning the full
      // store, but we intentionally drop the action functions.
      partialize: (state) =>
        ({
          step: state.step,
          title: state.title,
          projectId: state.projectId,
          avatar: state.avatar,
          script: state.script,
          selectedVoice: state.selectedVoice,
          generatedAudio: state.generatedAudio,
          videoJob: state.videoJob,
          generatedVideo: state.generatedVideo,
          resolution: state.resolution,
        }) as CreateVideoStore,
    }
  )
);
