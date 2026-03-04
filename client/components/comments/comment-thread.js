"use client";

import { useState } from "react";
import {
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Hash,
  Reply,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useComments } from "@/hooks/use-comments";
import { CommentItem } from "./comment-item";
import { Loader2 } from "lucide-react";
import { MentionEditor } from "../mention-editor";

export function CommentThread({
  workspaceId,
  targetType,
  targetId,
  currentUserId,
  members = [],
}) {
  const {
    comments,
    loading,
    createComment,
    updateComment,
    deleteComment,
    addReaction,
    removeReaction,
    resolveThread,
    unresolveThread,
  } = useComments(workspaceId, targetType, targetId);

  const [newComment, setNewComment] = useState("");
  const [mentions, setMentions] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [showResolved, setShowResolved] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' = oldest first, 'desc' = newest first
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!newComment.trim() || newComment === "[]" || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment(newComment, replyTo, mentions);
      setNewComment("");
      setMentions([]);
      setReplyTo(null);
      setEditorKey((prev) => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  const activeComments = comments.filter((c) => !c.isResolved);
  const resolvedComments = comments.filter((c) => c.isResolved);

  const displayComments = [...(showResolved ? comments : activeComments)];

  if (sortOrder === "desc") {
    displayComments.reverse();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
        <p className="text-xs text-muted-foreground">Memuat komentar...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">
            {comments.length} Komentar
          </span>
        </div>

        <div className="flex items-center gap-1">
          {resolvedComments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-[10px] gap-1 px-2 rounded-full",
                showResolved
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground",
              )}
              onClick={() => setShowResolved(!showResolved)}
            >
              <CheckCircle2 className="h-3 w-3" />
              {showResolved
                ? "Sembunyikan Selesai"
                : `Tampilkan Selesai (${resolvedComments.length})`}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1 px-2 text-muted-foreground"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortOrder === "asc" ? "Terlama" : "Terbaru"}
          </Button>
        </div>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto px-4">
        {displayComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground">Belum ada komentar.</p>
            <p className="text-[10px] text-muted-foreground/60">
              Jadilah yang pertama berdiskusi!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {displayComments.map((comment) => (
              <div key={comment._id} className="py-2">
                <CommentItem
                  comment={comment}
                  currentUserId={currentUserId}
                  onReply={(id) => setReplyTo(id)}
                  onEdit={updateComment}
                  onDelete={deleteComment}
                  onAddReaction={addReaction}
                  onRemoveReaction={removeReaction}
                  onResolve={resolveThread}
                  onUnresolve={unresolveThread}
                />

                {/* Replies */}
                {comment.replies?.length > 0 && (
                  <div className="space-y-1">
                    {comment.replies.map((reply) => (
                      <CommentItem
                        key={reply._id}
                        comment={reply}
                        currentUserId={currentUserId}
                        onEdit={updateComment}
                        onDelete={deleteComment}
                        onAddReaction={addReaction}
                        onRemoveReaction={removeReaction}
                        isReply
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="border-t bg-background p-4 pt-3 pb-6 sticky bottom-0">
        {replyTo && (
          <div className="flex items-center justify-between bg-muted/40 rounded-t-lg px-3 py-1.5 border-x border-t text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Reply className="h-3 w-3 shrink-0" />
              <span>
                Membalas{" "}
                <span className="font-semibold text-foreground">
                  {comments.find((c) => c._id === replyTo)?.authorId?.name ||
                    "komentar"}
                </span>
              </span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="hover:text-foreground"
            >
              <XCircle className="h-3 w-3" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={cn(
            "relative group flex flex-col gap-2 rounded-xl border bg-card shadow-sm transition-all focus-within:ring-1 focus-within:ring-primary focus-within:border-primary",
            replyTo && "rounded-tl-none border-t-0",
          )}
        >
          <div className="min-h-[80px] w-full py-2 px-6 bg-transparent text-xs rounded-t-xl group-focus-within:bg-accent/10">
            <MentionEditor
              key={`comment-editor-${editorKey}`}
              workspaceId={workspaceId}
              initialContent={newComment}
              onChange={(val) => setNewComment(val)}
              onMentionsChange={(m) => setMentions(m)}
              className="blocknote-compact"
            />
          </div>

          <div className="flex items-center justify-end px-3 pb-3">
            <Button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
              className="h-8 gap-2 rounded-lg px-4"
            >
              {isSubmitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              <span className="text-xs">Kirim</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
