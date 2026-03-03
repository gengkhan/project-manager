"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useWorkspace } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  CalendarRange,
  Columns3,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History,
} from "lucide-react";

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

const ROLE_COLORS = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  member:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  guest: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

function StatCard({ icon: Icon, label, value, color, href, workspaceId }) {
  const content = (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${color} transition-transform group-hover:scale-110`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={`/workspace/${workspaceId}${href}`}>{content}</Link>;
  }
  return content;
}

function QuickAction({ icon: Icon, label, description, href, workspaceId }) {
  return (
    <Link href={`/workspace/${workspaceId}${href}`}>
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/20 transition-all duration-200 cursor-pointer group">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

export default function WorkspaceDashboardPage({ params }) {
  const { id } = use(params);
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  if (!currentWorkspace) return <></>;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat pagi";
    if (hour < 17) return "Selamat siang";
    if (hour < 21) return "Selamat sore";
    return "Selamat malam";
  };

  const isAdminOrOwner =
    currentWorkspace.role === "owner" || currentWorkspace.role === "admin";

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {greeting()}, {user?.name?.split(" ")[0]}!{" "}
            <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Berikut ringkasan workspace{" "}
            <span className="font-semibold text-foreground">
              {currentWorkspace.name}
            </span>
          </p>
        </div>
        <Badge
          className={`${ROLE_COLORS[currentWorkspace.role]} text-xs self-start sm:self-auto`}
        >
          {ROLE_LABELS[currentWorkspace.role]}
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Member"
          value={currentWorkspace.memberCount || 0}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          href="/settings"
          workspaceId={id}
        />
        <StatCard
          icon={CalendarRange}
          label="Event"
          value={0}
          color="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
          href="/events"
          workspaceId={id}
        />
        <StatCard
          icon={Columns3}
          label="Kolom Kanban"
          value={currentWorkspace.kanbanColumns?.length || 0}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
          href="/tasks/kanban"
          workspaceId={id}
        />
        <StatCard
          icon={Lightbulb}
          label="Brainstorming"
          value={0}
          color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
          href="/brainstorming"
          workspaceId={id}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction
              icon={Columns3}
              label="Lihat Kanban Board"
              description="Kelola task secara visual"
              href="/tasks/kanban"
              workspaceId={id}
            />
            <QuickAction
              icon={CalendarRange}
              label="Lihat Event"
              description="Jadwal & event workspace"
              href="/events"
              workspaceId={id}
            />
            <QuickAction
              icon={Lightbulb}
              label="Brainstorming"
              description="Catat ide & diskusi"
              href="/brainstorming"
              workspaceId={id}
            />
            <QuickAction
              icon={Users}
              label="Kelola Member"
              description="Undang & atur anggota"
              href="/settings"
              workspaceId={id}
            />
          </div>
        </div>

        {/* Workspace info sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Info Workspace
          </h2>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Nama
                </p>
                <p className="text-sm font-semibold mt-0.5">
                  {currentWorkspace.name}
                </p>
              </div>

              {currentWorkspace.description && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Deskripsi
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {currentWorkspace.description}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Kolom Kanban
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {currentWorkspace.kanbanColumns?.map((col) => (
                    <span
                      key={col._id}
                      className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                      {col.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Dibuat
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {new Date(currentWorkspace.createdAt).toLocaleDateString(
                    "id-ID",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </p>
              </div>

              {isAdminOrOwner && (
                <Link href={`/workspace/${id}/settings`}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Pengaturan Workspace
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Aktivitas Terakhir
        </h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <History className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Belum ada aktivitas
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Aktivitas workspace akan muncul di sini
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
