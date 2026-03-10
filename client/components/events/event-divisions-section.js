"use client";

import { useState, useCallback } from "react";
import { useEventDivisions } from "@/hooks/use-event-divisions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Crown,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DIVISION_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#F97316",
];

export function EventDivisionsSection({ event, workspaceId, members = [] }) {
  const {
    divisions,
    loading,
    createDivision,
    updateDivision,
    deleteDivision,
    addMember,
    updateMemberRole,
    removeMember,
    moveMember,
  } = useEventDivisions(workspaceId, event._id);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDivName, setNewDivName] = useState("");
  const [newDivColor, setNewDivColor] = useState(DIVISION_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const [editingDiv, setEditingDiv] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [addMemberDivId, setAddMemberDivId] = useState(null);
  const [memberSearch, setMemberSearch] = useState("");

  const [movingMember, setMovingMember] = useState(null);
  const [moveTargetDiv, setMoveTargetDiv] = useState("");

  const [openDivisions, setOpenDivisions] = useState({});

  const toggleDivision = (divId) => {
    setOpenDivisions((prev) => ({ ...prev, [divId]: !prev[divId] }));
  };

  const allDivisionMemberIds = divisions.flatMap((d) =>
    d.members.map((m) => (m.userId?._id || m.userId).toString()),
  );

  const handleCreate = async () => {
    if (!newDivName.trim()) return;
    setCreating(true);
    try {
      await createDivision({
        name: newDivName.trim(),
        color: newDivColor,
      });
      setNewDivName("");
      setNewDivColor(DIVISION_COLORS[0]);
      setShowCreateForm(false);
      toast.success("Divisi berhasil dibuat");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat divisi");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (divisionId) => {
    if (!editName.trim()) return;
    try {
      await updateDivision(divisionId, {
        name: editName.trim(),
        color: editColor,
      });
      setEditingDiv(null);
      toast.success("Divisi berhasil diperbarui");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui divisi");
    }
  };

  const handleDelete = async (divisionId) => {
    try {
      await deleteDivision(divisionId);
      toast.success("Divisi berhasil dihapus");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus divisi");
    }
  };

  const handleAddMember = async (divisionId, memberId) => {
    try {
      await addMember(divisionId, memberId);
      setMemberSearch("");
      toast.success("Anggota ditambahkan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menambahkan anggota");
    }
  };

  const handleRemoveMember = async (divisionId, userId) => {
    try {
      await removeMember(divisionId, userId);
      toast.success("Anggota dihapus dari divisi");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus anggota");
    }
  };

  const handleToggleRole = async (divisionId, userId, currentRole) => {
    const newRole = currentRole === "leader" ? "member" : "leader";
    try {
      await updateMemberRole(divisionId, userId, newRole);
      toast.success(`Role diubah menjadi ${newRole}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengubah role");
    }
  };

  const handleMoveMember = async () => {
    if (!movingMember || !moveTargetDiv) return;
    try {
      await moveMember(
        movingMember.divisionId,
        movingMember.userId,
        moveTargetDiv,
      );
      setMovingMember(null);
      setMoveTargetDiv("");
      toast.success("Anggota dipindahkan");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memindahkan anggota");
    }
  };

  const getAvailableMembers = useCallback(
    (divisionId) => {
      const divMemberIds =
        divisions
          .find((d) => d._id === divisionId)
          ?.members.map((m) => (m.userId?._id || m.userId).toString()) || [];

      return members.filter((m) => {
        const userId = typeof m.userId === "object" ? m.userId?._id : m.userId;
        const userName =
          typeof m.userId === "object" ? m.userId?.name : m.name;
        const userEmail =
          typeof m.userId === "object" ? m.userId?.email : m.email;

        return (
          !divMemberIds.includes(userId?.toString()) &&
          (userName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
            userEmail?.toLowerCase().includes(memberSearch.toLowerCase()))
        );
      });
    },
    [divisions, members, memberSearch],
  );

  const totalMembers = allDivisionMemberIds.length;
  const uniqueMembers = new Set(allDivisionMemberIds).size;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Divisi ({divisions.length})
              {uniqueMembers > 0 && (
                <span className="text-xs font-normal normal-case ml-1">
                  · {uniqueMembers} anggota
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Divisi
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Create form */}
          {showCreateForm && (
            <div className="space-y-3 pb-3 border-b">
              <Input
                placeholder="Nama divisi..."
                value={newDivName}
                onChange={(e) => setNewDivName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowCreateForm(false);
                }}
                className="h-8 text-sm"
                maxLength={100}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Warna:</span>
                <div className="flex gap-1">
                  {DIVISION_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewDivColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full transition-all border-2 flex items-center justify-center",
                        newDivColor === c
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCreate}
                  disabled={creating || !newDivName.trim()}
                >
                  {creating && (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  )}
                  Buat
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowCreateForm(false)}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}

          {/* Division list */}
          {divisions.length > 0 ? (
            <div className="space-y-2">
              {divisions.map((div) => {
                const isOpen = openDivisions[div._id] !== false;
                const isEditing = editingDiv === div._id;

                return (
                  <Collapsible
                    key={div._id}
                    open={isOpen}
                    onOpenChange={() => toggleDivision(div._id)}
                  >
                    <div className="rounded-lg border">
                      {/* Division header */}
                      <div className="flex items-center gap-2 p-2.5">
                        <CollapsibleTrigger asChild>
                          <button className="p-0.5 hover:bg-accent rounded transition-colors">
                            {isOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </CollapsibleTrigger>

                        {div.color && (
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: div.color }}
                          />
                        )}

                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleUpdate(div._id);
                                if (e.key === "Escape") setEditingDiv(null);
                              }}
                              className="h-7 text-sm flex-1"
                              maxLength={100}
                              autoFocus
                            />
                            <div className="flex gap-0.5">
                              {DIVISION_COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setEditColor(c)}
                                  className={cn(
                                    "h-4 w-4 rounded-full transition-all border",
                                    editColor === c
                                      ? "border-foreground scale-110"
                                      : "border-transparent",
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleUpdate(div._id)}
                            >
                              Simpan
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setEditingDiv(null)}
                            >
                              Batal
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium flex-1 truncate">
                              {div.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-5 px-1.5"
                            >
                              {div.members.length}
                            </Badge>
                          </>
                        )}

                        {!isEditing && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setAddMemberDivId(div._id);
                                  setMemberSearch("");
                                }}
                                className="gap-2 text-xs"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Tambah Anggota
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingDiv(div._id);
                                  setEditName(div.name);
                                  setEditColor(div.color || DIVISION_COLORS[0]);
                                }}
                                className="gap-2 text-xs"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit Divisi
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(div._id)}
                                className="gap-2 text-xs text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus Divisi
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Division content */}
                      <CollapsibleContent>
                        <Separator />
                        <div className="p-2.5 space-y-1.5">
                          {/* Add member inline */}
                          {addMemberDivId === div._id && (
                            <div className="space-y-1.5 pb-2 border-b mb-2">
                              <Input
                                placeholder="Cari member..."
                                value={memberSearch}
                                onChange={(e) =>
                                  setMemberSearch(e.target.value)
                                }
                                className="h-7 text-xs"
                                autoFocus
                              />
                              <div className="max-h-32 overflow-y-auto space-y-0.5">
                                {getAvailableMembers(div._id).length > 0 ? (
                                  getAvailableMembers(div._id)
                                    .slice(0, 8)
                                    .map((m) => {
                                      const uid =
                                        typeof m.userId === "object"
                                          ? m.userId?._id
                                          : m.userId;
                                      const uname =
                                        typeof m.userId === "object"
                                          ? m.userId?.name
                                          : m.name;
                                      return (
                                        <button
                                          key={uid}
                                          onClick={() =>
                                            handleAddMember(div._id, uid)
                                          }
                                          className="flex items-center gap-2 w-full px-1.5 py-1 rounded text-left hover:bg-accent transition-colors"
                                        >
                                          <Avatar className="h-5 w-5">
                                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                              {uname?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-xs truncate flex-1">
                                            {uname}
                                          </span>
                                          <Plus className="h-3 w-3 text-muted-foreground" />
                                        </button>
                                      );
                                    })
                                ) : (
                                  <p className="text-[10px] text-muted-foreground text-center py-1">
                                    {memberSearch
                                      ? "Tidak ditemukan"
                                      : "Semua member sudah ditambahkan"}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] w-full"
                                onClick={() => setAddMemberDivId(null)}
                              >
                                Tutup
                              </Button>
                            </div>
                          )}

                          {/* Member list */}
                          {div.members.length > 0 ? (
                            div.members.map((m) => {
                              const user = m.userId;
                              const uid = user?._id || user;
                              const name = user?.name || "Unknown";
                              const email = user?.email || "";

                              return (
                                <div
                                  key={uid}
                                  className="flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-accent/50 group transition-colors"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                      {name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-medium truncate">
                                        {name}
                                      </p>
                                      {m.role === "leader" && (
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Leader
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                    {email && (
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {email}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() =>
                                            handleToggleRole(
                                              div._id,
                                              uid,
                                              m.role,
                                            )
                                          }
                                          className="p-1 rounded hover:bg-accent transition-colors"
                                        >
                                          <Crown
                                            className={cn(
                                              "h-3 w-3",
                                              m.role === "leader"
                                                ? "text-amber-500"
                                                : "text-muted-foreground",
                                            )}
                                          />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {m.role === "leader"
                                          ? "Jadikan Member"
                                          : "Jadikan Leader"}
                                      </TooltipContent>
                                    </Tooltip>

                                    {divisions.length > 1 && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() =>
                                              setMovingMember({
                                                divisionId: div._id,
                                                userId: uid,
                                                name,
                                                divisionName: div.name,
                                              })
                                            }
                                            className="p-1 rounded hover:bg-accent transition-colors"
                                          >
                                            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Pindah Divisi
                                        </TooltipContent>
                                      </Tooltip>
                                    )}

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() =>
                                            handleRemoveMember(div._id, uid)
                                          }
                                          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        >
                                          <UserMinus className="h-3 w-3" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Hapus dari divisi
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex flex-col items-center py-3 gap-1.5">
                              <p className="text-xs text-muted-foreground">
                                Belum ada anggota
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] gap-1"
                                onClick={() => {
                                  setAddMemberDivId(div._id);
                                  setMemberSearch("");
                                }}
                              >
                                <UserPlus className="h-3 w-3" />
                                Tambah Anggota
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <Users className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Belum ada divisi. Buat divisi untuk mengelompokkan anggota
                event.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Buat Divisi Pertama
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move member dialog */}
      <Dialog
        open={!!movingMember}
        onOpenChange={(open) => {
          if (!open) {
            setMovingMember(null);
            setMoveTargetDiv("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Pindah Anggota</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Pindahkan <strong>{movingMember?.name}</strong> dari{" "}
              <strong>{movingMember?.divisionName}</strong> ke:
            </p>
            <Select value={moveTargetDiv} onValueChange={setMoveTargetDiv}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Pilih divisi tujuan..." />
              </SelectTrigger>
              <SelectContent>
                {divisions
                  .filter((d) => d._id !== movingMember?.divisionId)
                  .map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      <span className="flex items-center gap-2">
                        {d.color && (
                          <span
                            className="h-2 w-2 rounded-full inline-block"
                            style={{ backgroundColor: d.color }}
                          />
                        )}
                        {d.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMovingMember(null)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleMoveMember}
              disabled={!moveTargetDiv}
            >
              Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
