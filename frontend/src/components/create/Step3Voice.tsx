"use client";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Play, Square, Mic, Loader2, Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateVideoStore } from "@/lib/store";
import { voiceApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Voice } from "@/types";

export function Step3Voice() {
  const { selectedVoice, script, avatar, projectId, setVoice, setGeneratedAudio, setStep } = useCreateVideoStore();
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const { data: voices = [], isLoading } = useQuery({
    queryKey: ["voices"],
    queryFn: voiceApi.list,
    staleTime: 10 * 60 * 1000,
  });

  const filtered = voices.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.accent.toLowerCase().includes(search.toLowerCase());
    const matchGender = genderFilter === "all" || v.gender === genderFilter;
    return matchSearch && matchGender;
  });

  const playPreview = async (voice: Voice) => {
    // Stop if already playing this voice
    if (playingId === voice.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    // Don't start a new preview while one is loading
    if (previewingId) return;

    if (audioRef.current) audioRef.current.pause();
    setPreviewingId(voice.id);
    try {
      const { url } = await voiceApi.preview(
        voice.id,
        `Hello! I'm ${voice.name}. This is a preview of my voice.`
      );
      // Resolve relative URLs against the API base
      const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
      audioRef.current = new Audio(fullUrl);
      audioRef.current.play().catch(() => toast.error("Could not play preview"));
      setPlayingId(voice.id);
      audioRef.current.onended = () => setPlayingId(null);
    } catch {
      toast.error("Could not load voice preview");
    } finally {
      setPreviewingId(null);
    }
  };

  const generateAudio = async () => {
    if (!selectedVoice || !projectId) return;
    setGenerating(true);
    try {
      const audio = await voiceApi.generate(projectId, selectedVoice.id, script);
      setGeneratedAudio(audio);
      toast.success("Voice generated! Ready to create video.");
      setStep(4);
    } catch {
      toast.error("Voice generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const canContinue = selectedVoice !== null;

  return (
    <div className="space-y-6">
      {/* Search & filters */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search voices, accents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "female", "male"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                  genderFilter === g
                    ? "bg-avatar-purple/20 text-avatar-purple-light border border-avatar-purple/30"
                    : "border border-avatar-dark-border text-muted-foreground hover:text-foreground hover:border-avatar-purple/20"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Voice grid */}
      <div className="glass-card rounded-xl p-5">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-avatar-dark-card shimmer border border-avatar-dark-border" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Mic size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No voices match your search.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {filtered.map((voice, i) => {
              const selected = selectedVoice?.id === voice.id;
              const playing = playingId === voice.id;
              return (
                <motion.div
                  key={voice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setVoice(selected ? null : voice)}
                  className={cn(
                    "relative flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200",
                    selected
                      ? "border-avatar-purple bg-avatar-purple/10 glow-purple"
                      : "border-avatar-dark-border bg-avatar-dark/50 hover:border-avatar-purple/30"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                    voice.gender === "female" ? "bg-avatar-pink/20 text-avatar-pink-light" : "bg-avatar-cyan/20 text-avatar-cyan"
                  )}>
                    {voice.name[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{voice.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{voice.gender} · {voice.accent}</p>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); playPreview(voice); }}
                    disabled={previewingId === voice.id}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      playing
                        ? "bg-avatar-purple text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {previewingId === voice.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : playing
                        ? <Square size={12} fill="white" />
                        : <Play size={12} />}
                  </button>

                  {selected && (
                    <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-avatar-purple" />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected voice summary */}
      {selectedVoice && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 bg-avatar-purple/10 border border-avatar-purple/25 flex items-center gap-4"
        >
          <Mic size={20} className="text-avatar-purple-light shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{selectedVoice.name} selected</p>
            <p className="text-xs text-muted-foreground capitalize">{selectedVoice.gender} · {selectedVoice.accent} accent</p>
          </div>
          <button
            onClick={() => playPreview(selectedVoice)}
            disabled={!!previewingId}
            className="text-xs text-avatar-purple-light hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {previewingId === selectedVoice.id
              ? <Loader2 size={12} className="animate-spin" />
              : <Play size={12} />}
            {previewingId === selectedVoice.id ? "Loading…" : "Preview"}
          </button>
        </motion.div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" size="lg" onClick={() => setStep(2)}>
          <ChevronLeft size={18} className="mr-2" />
          Back
        </Button>
        <Button
          variant="gradient"
          size="lg"
          disabled={!canContinue || generating}
          onClick={generateAudio}
        >
          {generating ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              Generating voice…
            </>
          ) : (
            <>
              Generate & Continue
              <ChevronRight size={18} className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
