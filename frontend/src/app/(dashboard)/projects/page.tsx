"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { PlusCircle, Search, Filter, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { projectsApi } from "@/lib/api";

const STATUS_FILTERS = ["all", "completed", "processing", "draft", "failed"] as const;

export default function ProjectsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", page],
    queryFn: () => projectsApi.list(page, 12),
  });

  const handleDelete = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const filtered = (data?.items ?? []).filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">All your AI avatar videos</p>
        </div>
        <Button variant="gradient" asChild>
          <Link href="/create">
            <PlusCircle size={16} className="mr-2" />
            New video
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? "bg-avatar-purple/20 text-avatar-purple-light border border-avatar-purple/30"
                  : "border border-avatar-dark-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-avatar-dark-card shimmer border border-avatar-dark-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 glass-card rounded-2xl">
          <Video size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No projects found</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {search ? "Try a different search term." : "Create your first AI avatar video."}
          </p>
          {!search && (
            <Button variant="gradient" asChild>
              <Link href="/create"><PlusCircle size={16} className="mr-2" />Create first video</Link>
            </Button>
          )}
        </motion.div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} onDelete={handleDelete} />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > 12 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(data.total / 12)}
              </span>
              <Button variant="outline" size="sm" disabled={!data.has_next} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
