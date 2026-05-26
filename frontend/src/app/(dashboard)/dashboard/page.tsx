"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { PlusCircle, Video, Clock, CheckCircle, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { projectsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data } = useQuery({
    queryKey: ["projects", 1],
    queryFn: () => projectsApi.list(1, 6),
  });

  const { data: stats } = useQuery({
    queryKey: ["project-stats"],
    queryFn: projectsApi.stats,
  });

  const statCards = [
    {
      label: "Total Videos",
      value: stats?.total ?? 0,
      icon: Video,
      color: "text-avatar-purple-light",
      bg: "bg-avatar-purple/10",
    },
    {
      label: "This Month",
      value: stats?.this_month ?? 0,
      icon: TrendingUp,
      color: "text-avatar-cyan",
      bg: "bg-avatar-cyan/10",
    },
    {
      label: "In Progress",
      value: stats?.processing ?? 0,
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    {
      label: "Completed",
      value: stats?.completed ?? 0,
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Good day, {user?.name?.split(" ")[0] ?? "Creator"} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatDate(new Date().toISOString())}
          </p>
        </div>
        <Button variant="gradient" asChild>
          <Link href="/create">
            <PlusCircle size={16} className="mr-2" />
            Create new video
          </Link>
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-xl p-5"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Recent projects</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              View all <ArrowRight size={14} />
            </Link>
          </Button>
        </div>

        {!data ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video rounded-xl bg-avatar-dark-card shimmer border border-avatar-dark-border" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 glass-card rounded-2xl"
          >
            <Video size={48} className="mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Create your first AI avatar video to get started.</p>
            <Button variant="gradient" asChild>
              <Link href="/create">
                <PlusCircle size={16} className="mr-2" />
                Create first video
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
