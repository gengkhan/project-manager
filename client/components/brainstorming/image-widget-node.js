"use client";

import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Link,
  Loader2,
  ImageIcon,
  X,
  ZoomIn,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_CAPTION_LENGTH = 500;

// ── Helper: Upload image via ImgBB API ────────────────
async function uploadImage(file) {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;

  if (apiKey) {
    // Convert file to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Remove data:image/...;base64, prefix
        const result = e.target.result.split(",")[1];
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", base64);
    formData.append("name", file.name.replace(/\.[^.]+$/, ""));

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("ImgBB upload failed");
    }

    const data = await response.json();
    if (data.success) {
      return data.data.url;
    }
    throw new Error(data.error?.message || "ImgBB upload failed");
  }

  // Fallback: base64 data URL (stored in DB directly)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Helper: Validate file ──
function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Format tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Ukuran file maksimal 1MB.";
  }
  return null;
}

// ══════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════
export function ImageWidgetNode({ widgetId, widgetData, onUpdateWidget }) {
  const {
    imageUrl,
    imageSource,
    caption,
    originalFileName,
    objectFit = "contain",
  } = widgetData || {};

  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(caption || "");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // URL embed state
  const [urlInput, setUrlInput] = useState("");
  const [urlPreview, setUrlPreview] = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState(false);

  const fileInputRef = useRef(null);
  const captionInputRef = useRef(null);

  // ── Upload handler ──────────────────────────────────
  const handleFileSelect = useCallback(
    async (file) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setUploading(true);
      try {
        const url = await uploadImage(file);
        onUpdateWidget(widgetId, {
          data: {
            ...widgetData,
            imageUrl: url,
            imageSource: "upload",
            originalFileName: file.name,
            title: file.name,
          },
        });
        setShowAddDialog(false);
        toast.success("Gambar berhasil diupload");
      } catch (err) {
        console.error("Upload error:", err);
        toast.error("Gagal mengupload gambar");
      } finally {
        setUploading(false);
      }
    },
    [widgetId, widgetData, onUpdateWidget],
  );

  const handleFileInput = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      // Reset input so same file can be re-selected
      if (e.target) e.target.value = "";
    },
    [handleFileSelect],
  );

  // ── Drop handler (inside widget) ────────────────────
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file && ALLOWED_TYPES.includes(file.type)) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // ── URL embed handler ───────────────────────────────
  const handleUrlPreview = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlLoading(true);
    setUrlError(false);
    setUrlPreview(url);
  }, [urlInput]);

  const handleUrlConfirm = useCallback(() => {
    if (!urlPreview) return;
    onUpdateWidget(widgetId, {
      data: {
        ...widgetData,
        imageUrl: urlPreview,
        imageSource: "url",
        originalFileName: null,
        title: "Gambar",
      },
    });
    setShowAddDialog(false);
    setUrlInput("");
    setUrlPreview(null);
    toast.success("Gambar dari URL berhasil ditambahkan");
  }, [widgetId, widgetData, onUpdateWidget, urlPreview]);

  // ── Caption save ────────────────────────────────────
  const handleSaveCaption = useCallback(() => {
    const trimmed = captionText.trim().slice(0, MAX_CAPTION_LENGTH);
    onUpdateWidget(widgetId, {
      data: { ...widgetData, caption: trimmed || null },
    });
    setCaptionText(trimmed);
    setEditingCaption(false);
  }, [widgetId, widgetData, onUpdateWidget, captionText]);

  // ── Replace image ───────────────────────────────────
  const handleReplaceImage = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  // ── Download image ──────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = originalFileName || "image";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl, originalFileName]);

  // ══════════════════════════════════════════════════
  // RENDER: Empty state (no image)
  // ══════════════════════════════════════════════════
  if (!imageUrl) {
    return (
      <>
        <div
          className="flex flex-col items-center justify-center p-6 h-full min-h-[150px] bg-muted/20 text-center nodrag nowheel"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <ImageIcon className="h-6 w-6 text-green-500/60" />
            </div>
            <p className="text-xs text-muted-foreground">
              Seret gambar ke sini atau
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => setShowAddDialog(true)}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Tambah Gambar
            </Button>
          </div>
        </div>

        {/* Add image dialog */}
        <AddImageDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          uploading={uploading}
          onFileSelect={handleFileSelect}
          fileInputRef={fileInputRef}
          handleFileInput={handleFileInput}
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          urlPreview={urlPreview}
          setUrlPreview={setUrlPreview}
          urlLoading={urlLoading}
          setUrlLoading={setUrlLoading}
          urlError={urlError}
          setUrlError={setUrlError}
          onUrlPreview={handleUrlPreview}
          onUrlConfirm={handleUrlConfirm}
        />
      </>
    );
  }

  // ══════════════════════════════════════════════════
  // RENDER: Image present
  // ══════════════════════════════════════════════════
  return (
    <>
      <div
        className="flex flex-col h-full bg-background rounded-b-lg overflow-hidden nodrag nowheel"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Image container */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden bg-muted/10 relative group/img cursor-pointer min-h-[80px]"
          onClick={() => setPreviewOpen(true)}
        >
          <img
            src={imageUrl}
            alt={widgetData?.title || "Gambar"}
            className="w-full h-full transition-transform duration-200"
            style={{ objectFit: objectFit || "contain" }}
            draggable={false}
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-background/90 rounded-full p-2 shadow-md">
              <ZoomIn className="h-4 w-4 text-foreground" />
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="px-3 py-2 border-t bg-background min-h-[32px]">
          {editingCaption ? (
            <div className="flex items-center gap-1.5">
              <Input
                ref={captionInputRef}
                value={captionText}
                onChange={(e) =>
                  setCaptionText(e.target.value.slice(0, MAX_CAPTION_LENGTH))
                }
                placeholder="Tambah caption..."
                className="text-xs h-7 flex-1"
                maxLength={MAX_CAPTION_LENGTH}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCaption();
                  if (e.key === "Escape") {
                    setCaptionText(caption || "");
                    setEditingCaption(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleSaveCaption}
              >
                <span className="text-xs text-primary font-medium">OK</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => {
                  setCaptionText(caption || "");
                  setEditingCaption(false);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 cursor-pointer group/caption hover:bg-muted/30 rounded px-1 py-0.5 -mx-1 transition-colors"
              onClick={() => {
                setCaptionText(caption || "");
                setEditingCaption(true);
              }}
            >
              {caption ? (
                <p className="text-xs line-clamp-2 flex-1">{caption}</p>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic flex-1">
                  Klik untuk menambah caption...
                </p>
              )}
              <Pencil className="h-3 w-3 text-muted-foreground/30 group-hover/caption:text-muted-foreground transition-colors shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Full-size preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden bg-black/50 border-none">
          <DialogTitle className="sr-only">Preview Gambar</DialogTitle>
          <div className="flex items-center justify-center w-full h-full p-4">
            <img
              src={imageUrl}
              alt={widgetData?.title || "Gambar"}
              className="max-w-full max-h-[85vh] object-contain rounded"
              draggable={false}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Replace image dialog */}
      <AddImageDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        uploading={uploading}
        onFileSelect={handleFileSelect}
        fileInputRef={fileInputRef}
        handleFileInput={handleFileInput}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        urlPreview={urlPreview}
        setUrlPreview={setUrlPreview}
        urlLoading={urlLoading}
        setUrlLoading={setUrlLoading}
        urlError={urlError}
        setUrlError={setUrlError}
        onUrlPreview={handleUrlPreview}
        onUrlConfirm={handleUrlConfirm}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════
// ADD IMAGE DIALOG (Upload / URL tabs)
// ══════════════════════════════════════════════════════
function AddImageDialog({
  open,
  onOpenChange,
  uploading,
  onFileSelect,
  fileInputRef,
  handleFileInput,
  urlInput,
  setUrlInput,
  urlPreview,
  setUrlPreview,
  urlLoading,
  setUrlLoading,
  urlError,
  setUrlError,
  onUrlPreview,
  onUrlConfirm,
}) {
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogTitle className="text-base font-semibold">
          Tambah Gambar
        </DialogTitle>

        <Tabs defaultValue="upload" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs gap-1.5">
              <Link className="h-3.5 w-3.5" />
              Dari URL
            </TabsTrigger>
          </TabsList>

          {/* Upload tab */}
          <TabsContent value="upload" className="mt-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Mengupload gambar...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                    <ImageIcon className="h-7 w-7 text-green-500/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Klik atau seret file ke sini
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, GIF, WebP · Maks 1MB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileInput}
            />
          </TabsContent>

          {/* URL tab */}
          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlError(false);
                  setUrlPreview(null);
                }}
                placeholder="https://example.com/gambar.png"
                className="text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onUrlPreview();
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={onUrlPreview}
                disabled={!urlInput.trim()}
                className="text-xs shrink-0"
              >
                Preview
              </Button>
            </div>

            {/* URL Preview */}
            {urlPreview && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/30 flex items-center justify-center p-4 min-h-[150px]">
                  {urlLoading && !urlError && (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  )}
                  <img
                    src={urlPreview}
                    alt="Preview"
                    className={`max-w-full max-h-[200px] object-contain rounded ${urlLoading && !urlError ? "hidden" : ""}`}
                    onLoad={() => {
                      setUrlLoading(false);
                      setUrlError(false);
                    }}
                    onError={() => {
                      setUrlLoading(false);
                      setUrlError(true);
                    }}
                    draggable={false}
                  />
                  {urlError && (
                    <div className="flex flex-col items-center gap-2 text-destructive">
                      <X className="h-6 w-6" />
                      <p className="text-xs">
                        Gagal memuat gambar. Periksa URL.
                      </p>
                    </div>
                  )}
                </div>
                {!urlError && !urlLoading && (
                  <div className="p-3 border-t flex justify-end">
                    <Button
                      size="sm"
                      onClick={onUrlConfirm}
                      className="text-xs"
                    >
                      Gunakan Gambar Ini
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
