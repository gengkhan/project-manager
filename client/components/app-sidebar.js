"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  CalendarRange,
  Columns3,
  Calendar,
  Lightbulb,
  History,
  Settings,
  ChevronsUpDown,
  Plus,
  ChevronLeft,
  ListTodo,
  Sparkles,
} from "lucide-react";

// ─── Navigation structure ────────────────────────────
const NAV_MAIN = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "",
  },
  {
    label: "Event",
    icon: CalendarRange,
    href: "/events",
  },
  {
    label: "Brainstorming",
    icon: Lightbulb,
    href: "/brainstorming",
  },
  // {
  //   label: "AI Chat",
  //   icon: Sparkles,
  //   href: "/ai-chat",
  // },
];

const NAV_TASKS = [
  {
    label: "Kanban Board",
    icon: Columns3,
    href: "/tasks/kanban",
  },
  {
    label: "Kalender",
    icon: Calendar,
    href: "/tasks/calendar",
  },
];

const NAV_OTHER = [
  {
    label: "Activity Log",
    icon: History,
    href: "/activity",
  },
  {
    label: "Pengaturan",
    icon: Settings,
    href: "/settings",
  },
];

// ─── Helper: check if a nav item is active ───────────
function isActive(pathname, basePath, href) {
  const full = basePath + href;
  if (href === "") {
    return pathname === basePath || pathname === basePath + "/";
  }
  return pathname === full || pathname.startsWith(full + "/");
}

// ─── Workspace Switcher ──────────────────────────────
function WorkspaceSwitcher({ workspaceId, workspace }) {
  const router = useRouter();
  const { workspaces } = useWorkspace();

  const initials =
    workspace?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "WS";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                {initials}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {workspace?.name || "Workspace"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {workspace?.memberCount || 0} member
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Workspace
            </div>
            {workspaces?.active?.map((ws) => (
              <DropdownMenuItem
                key={ws._id}
                onClick={() => router.push(`/workspace/${ws._id}`)}
                className={
                  ws._id === workspaceId ? "bg-accent font-medium" : ""
                }
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-bold mr-2">
                  {ws.name
                    ?.split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <span className="truncate">{ws.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/workspaces")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Semua Workspace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/workspaces/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Workspace Baru
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ─── Nav Group renderer ──────────────────────────────
function NavGroup({ items, basePath, pathname }) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const active = isActive(pathname, basePath, item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
              <Link href={`${basePath}${item.href}`}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

// ─── Main AppSidebar component ───────────────────────
export function AppSidebar({ workspaceId, workspace, ...props }) {
  const pathname = usePathname();
  const basePath = `/workspace/${workspaceId}`;

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header: Workspace Switcher */}
      <SidebarHeader>
        <WorkspaceSwitcher workspaceId={workspaceId} workspace={workspace} />
      </SidebarHeader>

      {/* Content: Navigation */}
      <SidebarContent>
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup
              items={NAV_MAIN}
              basePath={basePath}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Task navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <ListTodo className="mr-1" />
            Task
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup
              items={NAV_TASKS}
              basePath={basePath}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Other navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Lainnya</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavGroup
              items={NAV_OTHER}
              basePath={basePath}
              pathname={pathname}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <div className="px-2 py-1 text-[11px] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
          YukNgaji Surabaya
        </div>
      </SidebarFooter>

      {/* Rail for collapsing */}
      <SidebarRail />
    </Sidebar>
  );
}
