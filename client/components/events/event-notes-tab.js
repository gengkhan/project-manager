"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEventNotes } from "@/hooks/use-event-notes";
import { MentionEditor, MentionReadOnly } from "@/components/mention-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  StickyNote,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

function NoteForm({
  workspaceId,
  initialTitle,
  initialContent,
  onSave,
  onCancel,
  saving,
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [content, setContent] = useState(initialContent || "");
  const [mentions, setMentions] = useState([]);

  const handleSave = () => {
    if (
      !content ||
      content === "[]" ||
      content === '[{"type":"paragraph","content":[]}]'
    ) {
      toast.error("Isi catatan tidak boleh kosong");
      return;
    }
    onSave({ title, content, mentions });
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <Input
          placeholder="Judul catatan (opsional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="font-medium"
        />
        <div className="min-h-[240px] border rounded-md py-2 px-6">
          <MentionEditor
            workspaceId={workspaceId}
            initialContent={initialContent}
            onChange={setContent}
            onMentionsChange={setMentions}
            editable={true}
            placeholder="Tulis catatan... gunakan '@' untuk mention"
            minimal={false}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1" />
            Batal
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NoteCard({
  note,
  workspaceId,
  currentUserId,
  memberRole,
  onEdit,
  onDelete,
}) {
  const isAuthor = note.authorId?._id === currentUserId;
  const canModify = isAuthor || ["owner", "admin"].includes(memberRole);
  const authorName = note.authorId?.name || "Unknown";
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="group">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(note.createdAt), {
                    addSuffix: true,
                    locale: localeId,
                  })}
                </span>
                {note.updatedAt !== note.createdAt && (
                  <span className="text-xs text-muted-foreground italic">
                    (diedit)
                  </span>
                )}
              </div>
              {note.title && (
                <h4 className="text-sm font-semibold mt-1">{note.title}</h4>
              )}
              <div className="mt-1.5 text-sm">
                <MentionReadOnly
                  content={note.content}
                  className="[&_.bn-editor]:p-0! [&_.bn-block-group]:p-0!"
                />
              </div>
            </div>
          </div>

          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onEdit(note)}
                  className="gap-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(note)}
                  className="text-destructive focus:text-destructive gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EventNotesTab({ event, workspaceId, members, memberRole }) {
  const { user } = useAuth();
  const { notes, loading, createNote, updateNote, deleteNote } = useEventNotes(
    workspaceId,
    event._id,
  );

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deletingNote, setDeletingNote] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = useCallback(
    async ({ title, content }) => {
      setSaving(true);
      try {
        await createNote({ title, content });
        setShowCreateForm(false);
        toast.success("Catatan berhasil ditambahkan");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal menambahkan catatan");
      } finally {
        setSaving(false);
      }
    },
    [createNote],
  );

  const handleUpdate = useCallback(
    async ({ title, content }) => {
      if (!editingNote) return;
      setSaving(true);
      try {
        await updateNote(editingNote._id, { title, content });
        setEditingNote(null);
        toast.success("Catatan berhasil diperbarui");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal memperbarui catatan");
      } finally {
        setSaving(false);
      }
    },
    [editingNote, updateNote],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingNote) return;
    try {
      await deleteNote(deletingNote._id);
      setDeletingNote(null);
      toast.success("Catatan berhasil dihapus");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus catatan");
    }
  }, [deletingNote, deleteNote]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {notes.length} catatan
        </h3>
        {!showCreateForm && !editingNote && memberRole !== "guest" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Catatan
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreateForm && (
        <NoteForm
          workspaceId={workspaceId}
          onSave={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          saving={saving}
        />
      )}

      {/* Notes list */}
      {notes.length === 0 && !showCreateForm ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <StickyNote className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium mb-1">Belum ada catatan</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Tambahkan catatan untuk event ini
              </p>
              {memberRole !== "guest" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateForm(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Catatan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) =>
            editingNote?._id === note._id ? (
              <NoteForm
                key={note._id}
                workspaceId={workspaceId}
                initialTitle={note.title}
                initialContent={note.content}
                onSave={handleUpdate}
                onCancel={() => setEditingNote(null)}
                saving={saving}
              />
            ) : (
              <NoteCard
                key={note._id}
                note={note}
                workspaceId={workspaceId}
                currentUserId={user?._id}
                memberRole={memberRole}
                onEdit={setEditingNote}
                onDelete={setDeletingNote}
              />
            ),
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingNote}
        onOpenChange={(open) => !open && setDeletingNote(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Catatan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus catatan
              {deletingNote?.title ? ` "${deletingNote.title}"` : " ini"}?
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
