"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  LogOut,
  ChevronLeft,
  Loader2,
  Settings,
  User,
} from "lucide-react";

// ─── Topbar Component ───────────────────────────────
function Topbar({ workspace, workspaceId }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const id = workspaceId;

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsHook = useNotifications();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      {/* Sidebar trigger (hamburger on mobile, collapse toggle on desktop) */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Archived badge */}
      {workspace?.isArchived && (
        <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
          Diarsipkan
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Notification bell */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 relative"
              onClick={() => setIsNotificationsOpen(true)}
            >
              <Bell className="h-4 w-4" />
              {notificationsHook.unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifikasi</TooltipContent>
        </Tooltip>

        <NotificationPanel
          open={isNotificationsOpen}
          onOpenChange={setIsNotificationsOpen}
          notificationsHook={notificationsHook}
        />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 ml-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings/account")}>
              <Settings className="h-4 w-4 mr-2" />
              Pengaturan Akun
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/workspace/${id}/members/${user?._id}`)
              }
            >
              <User className="h-4 w-4 mr-2" />
              Lihat Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/workspaces")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Semua Workspace
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ─── Layout ─────────────────────────────────────────
export default function WorkspaceLayout({ children, params }) {
  const { id } = use(params);
  const { currentWorkspace, setCurrentWorkspace, workspaces, loading } =
    useWorkspace();
  const [initialLoading, setInitialLoading] = useState(true);

  // Load workspace and connect socket
  useEffect(() => {
    async function load() {
      await setCurrentWorkspace(id);
      setInitialLoading(false);
    }
    load();
  }, [id, setCurrentWorkspace]);

  // Initialize socket connection for presence
  useEffect(() => {
    if (!currentWorkspace) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const socket = connectSocket(token);
    if (socket) {
      socket.emit("workspace:join", id);
    }

    return () => {
      const s = getSocket();
      if (s) {
        s.emit("workspace:leave", id);
      }
    };
  }, [id, currentWorkspace]);

  if (initialLoading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!currentWorkspace) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen flex-col items-center justify-center p-4">
          <h2 className="text-xl font-semibold mb-2">
            Workspace tidak ditemukan
          </h2>
          <p className="text-muted-foreground mb-6">
            Workspace ini mungkin sudah dihapus atau kamu tidak memiliki akses.
          </p>
          <Link href="/workspaces">
            <Button>Kembali ke Daftar Workspace</Button>
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar workspaceId={id} workspace={currentWorkspace} />
        <SidebarInset>
          <Topbar workspace={currentWorkspace} workspaceId={id} />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
