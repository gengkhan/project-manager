"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Reply,
  CheckCircle2,
  SmilePlus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MentionEditor, MentionReadOnly } from "../mention-editor";

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
  onResolve,
  onUnresolve,
  isReply = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editMentions, setEditMentions] = useState(comment.mentions || []);

  const handleEdit = () => {
    onEdit(comment._id, editContent, editMentions);
    setIsEditing(false);
  };

  const isAuthor =
    comment.authorId?._id === currentUserId ||
    comment.authorId === currentUserId;

  return (
    <div className={cn("flex gap-3 py-3 group", isReply && "pl-11")}>
      <Avatar className={cn("h-8 w-8 shrink-0", isReply && "h-6 w-6")}>
        <AvatarImage src={comment.authorId?.avatar} />
        <AvatarFallback className="text-[10px]">
          {comment.authorId?.name?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground">
              {comment.authorId?.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: id,
              })}
            </span>
            {comment.isEdited && (
              <span className="text-[10px] text-muted-foreground italic">
                (diedit)
              </span>
            )}
            {comment.isResolved && !isReply && (
              <Badge
                variant="secondary"
                className="h-4 text-[9px] px-1 gap-1 bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                Selesai
              </Badge>
            )}
          </div>

          {!comment.isDeleted && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onReply(comment._id)}
                >
                  <Reply className="h-3 w-3" />
                </Button>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <SmilePlus className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 border-none w-auto"
                  side="top"
                  align="center"
                >
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji) =>
                      onAddReaction(comment._id, emoji.native)
                    }
                    theme="light"
                    set="native"
                    previewPosition="none"
                    skinSelectionPosition="none"
                  />
                </PopoverContent>
              </Popover>

              {(isAuthor || !isReply) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    {isAuthor && (
                      <DropdownMenuItem
                        className="text-xs gap-2"
                        onClick={() => {
                          setIsEditing(true);
                          setEditContent(comment.content);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {!isReply &&
                      (comment.isResolved ? (
                        <DropdownMenuItem
                          className="text-xs gap-2"
                          onClick={() => onUnresolve(comment._id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Unresolve
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-xs gap-2 text-green-600"
                          onClick={() => onResolve(comment._id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Resolve
                        </DropdownMenuItem>
                      ))}
                    {isAuthor && (
                      <DropdownMenuItem
                        className="text-xs gap-2 text-destructive focus:text-destructive"
                        onClick={() => onDelete(comment._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Hapus
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1">
            <div className="bg-muted/30 rounded-md border min-h-[60px] relative z-10">
              <MentionEditor
                workspaceId={comment.workspaceId}
                initialContent={editContent}
                onChange={(val) => setEditContent(val)}
                onMentionsChange={(m) => setEditMentions(m)}
                minimal={true}
                className="blocknote-compact px-1 py-1"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px]"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                  setEditMentions(comment.mentions || []);
                }}
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="h-7 text-[10px]"
                onClick={handleEdit}
                disabled={!editContent || editContent === "[]"}
              >
                Simpan
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "text-xs leading-relaxed whitespace-pre-wrap break-words mt-1",
              comment.isDeleted
                ? "text-muted-foreground italic"
                : "text-foreground",
            )}
          >
            {!comment.isDeleted ? (
              <MentionReadOnly
                content={comment.content}
                className="-ml-12 mt-2"
              />
            ) : (
              comment.content
            )}
          </div>
        )}

        {/* Reactions */}
        {!comment.isDeleted && comment.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <TooltipProvider>
              {comment.reactions.map((r) => {
                const hasReacted = r.users.includes(currentUserId);
                return (
                  <Tooltip key={r.emoji}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() =>
                          hasReacted
                            ? onRemoveReaction(comment._id, r.emoji)
                            : onAddReaction(comment._id, r.emoji)
                        }
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors",
                          hasReacted
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted/50 border-transparent hover:border-muted-foreground/30",
                        )}
                      >
                        <span>{r.emoji}</span>
                        <span className="font-medium">{r.users.length}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] p-1 px-2">
                      {r.users.length} reaction
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}
