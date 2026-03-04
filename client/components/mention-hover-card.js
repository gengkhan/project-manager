import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getInitials } from "@/components/kanban/task-card";

export function MentionHoverCard({ user, children }) {
  if (!user) return <>{children}</>;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80 p-0 shadow-md">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 min-w-0">
              <h4 className="text-sm font-semibold truncate flex items-center gap-2">
                {user.name}
                {user.isOnline && (
                  <span
                    className="h-2 w-2 rounded-full bg-green-500 shrink-0"
                    title="Online"
                  />
                )}
              </h4>
              <Badge
                variant="outline"
                className="w-fit text-[10px] h-5 uppercase tracking-wider"
              >
                {user.role || "Member"}
              </Badge>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
