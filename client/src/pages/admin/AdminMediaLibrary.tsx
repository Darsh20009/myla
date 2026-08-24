import React, { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Link, Trash2, Copy, Search, Image, Video, FileText,
  X, Loader2, ExternalLink, CheckCircle2, FolderOpen, RefreshCw,
  CloudUpload, HardDrive,
} from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  bytes: number;
  source: "upload" | "url" | "google_drive";
  storage: string;
  createdAt: string;
}

interface StorageStatus {
  persistent: boolean;
  backend: string;
  cloudinaryConfigured: boolean;
  objectStorageConfigured: boolean;
  message: string;
}

interface MediaLibraryProps {
  /** If provided, renders as a picker — clicking an item calls this instead of copying */
  onSelect?: (url: string) => void;
  /** Restrict shown types when used as picker */
  filterType?: "image" | "video" | "";
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function SourceBadge({ source }: { source: string }) {
  if (source === "google_drive") return (
    <span className="absolute top-1.5 right-1.5 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">Drive</span>
  );
  if (source === "url") return (
    <span className="absolute top-1.5 right-1.5 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">URL</span>
  );
  return null;
}

export default function AdminMediaLibrary({ onSelect, filterType = "" }: MediaLibraryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [page, setPage]           = useState(1);
  const [typeFilter, setTypeFilter] = useState<"" | "image" | "video">(filterType || "");
  const [searchQ, setSearchQ]     = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importDialog, setImportDialog] = useState(false);
  const [selectedId, setSelectedId]  = useState<string | null>(null);
  const [copiedId, setCopiedId]      = useState<string | null>(null);
  const [uploading, setUploading]    = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Query
  const qKey = ["/api/admin/media-library", { page, type: typeFilter, q: searchQ }];
  const { data, isLoading, refetch } = useQuery<{ items: MediaItem[]; total: number; page: number; limit: number; storageStatus?: StorageStatus }>({
    queryKey: qKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "48",
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(searchQ ? { q: searchQ } : {}),
      });
      const r = await fetch(`/api/admin/media-library?${params}`);
      if (!r.ok) throw new Error("فشل تحميل المكتبة");
      return r.json();
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / (data?.limit || 48));
  const storageStatus = data?.storageStatus;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/media-library/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-library"] });
      setDeleteConfirm(null);
      toast({ title: "تم الحذف", description: "تم حذف الملف من المكتبة" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل حذف الملف", variant: "destructive" }),
  });

  // Import from URL mutation
  const importMutation = useMutation({
    mutationFn: (url: string) => apiRequest("POST", "/api/admin/media-library/import-url", { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-library"] });
      setImportUrl("");
      setImportDialog(false);
      toast({ title: "تم الاستيراد ✓", description: "تمت إضافة الصورة إلى المكتبة" });
    },
    onError: (e: any) => toast({
      title: "فشل الاستيراد",
      description: e?.message || "تحقق من الرابط وحاول مرة أخرى",
      variant: "destructive",
    }),
  });

  // File upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.message || "فشل الرفع");
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/media-library"] });
      toast({ title: `تم رفع ${files.length > 1 ? files.length + " ملفات" : "الملف"} ✓` });
    } catch (e: any) {
      toast({ title: "خطأ في الرفع", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [queryClient, toast]);

  // Copy URL
  const copyUrl = useCallback((item: MediaItem) => {
    navigator.clipboard.writeText(item.url).then(() => {
      setCopiedId(item.id);
      toast({ title: "تم النسخ ✓", description: "تم نسخ رابط الصورة" });
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, [toast]);

  // Handle item click
  const handleItemClick = useCallback((item: MediaItem) => {
    if (onSelect) {
      onSelect(item.url);
    } else {
      setSelectedId(prev => prev === item.id ? null : item.id);
    }
  }, [onSelect]);

  const isImage = (mime: string) => mime?.startsWith("image/");
  const isVideo = (mime: string) => mime?.startsWith("video/");

  return (
    <div className="flex flex-col h-full gap-4" dir="rtl">
      {storageStatus && !storageStatus.persistent && (
        <div className="flex items-start gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed">
            <p className="font-black">التخزين الدائم غير مُعد</p>
            <p>{storageStatus.message}. لا ترفع صورًا في الإنتاج قبل إعداد أحد الخيارين.</p>
          </div>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQ}
            onChange={e => { setSearchQ(e.target.value); setPage(1); }}
            placeholder="ابحث باسم الملف..."
            className="pr-9 h-9 rounded-none text-sm"
          />
        </div>

        {/* Type filter */}
        <div className="flex rounded-none overflow-hidden border border-slate-200">
          {(["", "image", "video"] as const).map(t => (
            <button
              key={t || "all"}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${typeFilter === t ? "bg-[#1A0E08] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {t === "" ? "الكل" : t === "image" ? "صور" : "فيديو"}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-none shrink-0" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Import URL */}
        {!onSelect && (
          <Button
            variant="outline"
            className="h-9 rounded-none gap-1.5 shrink-0 text-xs"
            onClick={() => setImportDialog(true)}
          >
            <Link className="h-3.5 w-3.5" />
            استيراد من رابط
          </Button>
        )}

        {/* Upload */}
        {!onSelect && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              className="h-9 rounded-none gap-1.5 shrink-0 bg-[#1A0E08] hover:bg-[#2a1a10] text-white text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "جاري الرفع..." : "رفع ملفات"}
            </Button>
          </>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>{total.toLocaleString("ar")} ملف في المكتبة</span>
        {typeFilter && <Badge variant="secondary" className="text-[10px] rounded-full">{typeFilter === "image" ? "صور فقط" : "فيديو فقط"}</Badge>}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A882]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 py-20">
          <FolderOpen className="h-16 w-16 opacity-20" />
          <p className="text-sm font-medium">المكتبة فارغة</p>
          <p className="text-xs text-center max-w-[240px]">
            ارفع صوراً أو استورد من رابط وستظهر هنا تلقائياً
          </p>
          {!onSelect && (
            <Button
              className="h-9 rounded-none gap-1.5 bg-[#1A0E08] hover:bg-[#2a1a10] text-white text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              رفع أول ملف
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-y-auto flex-1 pb-2">
          {items.map(item => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                className={`group relative aspect-square bg-slate-100 overflow-hidden cursor-pointer border-2 transition-all hover:shadow-md ${
                  isSelected ? "border-[#C9A882] shadow-lg scale-[0.98]" : "border-transparent hover:border-slate-300"
                }`}
                onClick={() => handleItemClick(item)}
              >
                {/* Preview */}
                {isImage(item.mimeType) ? (
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : isVideo(item.mimeType) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-800 text-white">
                    <Video className="h-8 w-8 opacity-60" />
                    <span className="text-[9px] opacity-50 px-1 text-center truncate w-full">{item.filename}</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-200 text-slate-500">
                    <FileText className="h-8 w-8 opacity-40" />
                    <span className="text-[9px] opacity-60 px-1 text-center truncate w-full">{item.filename}</span>
                  </div>
                )}

                {/* Source badge */}
                <SourceBadge source={item.source} />

                {/* Storage badge */}
                {item.storage === "cloudinary" && (
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    ☁️
                  </span>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                  {onSelect ? (
                    <Button
                      size="sm"
                      className="h-7 rounded-none text-[10px] w-full bg-white text-black hover:bg-white/90"
                      onClick={e => { e.stopPropagation(); onSelect(item.url); }}
                    >
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      اختيار
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="h-7 rounded-none text-[10px] w-full bg-white text-black hover:bg-white/90"
                        onClick={e => { e.stopPropagation(); copyUrl(item); }}
                      >
                        {copiedId === item.id
                          ? <><CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />تم النسخ</>
                          : <><Copy className="h-3 w-3 ml-1" />نسخ الرابط</>
                        }
                      </Button>
                      <div className="flex gap-1 w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 rounded-none text-[10px] flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20"
                          onClick={e => { e.stopPropagation(); window.open(item.url, "_blank"); }}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 rounded-none text-[10px] flex-1"
                          onClick={e => { e.stopPropagation(); setDeleteConfirm(item.id); }}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Info tooltip on selection */}
                {isSelected && !onSelect && (
                  <div className="absolute bottom-0 left-0 right-0 bg-[#1A0E08]/90 text-white text-[9px] p-1 text-center truncate">
                    {item.filename} · {formatBytes(item.bytes)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="outline" size="sm"
            className="h-8 rounded-none text-xs"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >السابق</Button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <Button
            variant="outline" size="sm"
            className="h-8 rounded-none text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >التالي</Button>
        </div>
      )}

      {/* Import URL dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-md rounded-none" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">استيراد من رابط</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
             <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800 leading-relaxed">
               <p className="font-bold mb-1">روابط الصور العامة وGoogle Drive</p>
               <p>الصق رابط صورة مباشر أو رابط Drive لملف صورة متاح عبر الرابط. لاختيار صور Drive الخاصة، اربط Google Drive من إعدادات التكامل أولاً.</p>
            </div>
            <Input
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/... أو https://example.com/image.jpg"
              className="rounded-none text-sm h-10 text-left"
              dir="ltr"
              onKeyDown={e => { if (e.key === "Enter" && importUrl.trim()) importMutation.mutate(importUrl.trim()); }}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-none h-10 bg-[#1A0E08] hover:bg-[#2a1a10] text-white gap-1.5"
                disabled={!importUrl.trim() || importMutation.isPending}
                onClick={() => importMutation.mutate(importUrl.trim())}
              >
                {importMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الاستيراد...</>
                  : <><CloudUpload className="h-4 w-4" />استيراد</>
                }
              </Button>
              <Button
                variant="outline"
                className="rounded-none h-10"
                onClick={() => { setImportUrl(""); setImportDialog(false); }}
              >إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm rounded-none" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            سيُحذف الملف من المكتبة نهائياً. هذا لا يؤثر على المنتجات التي تستخدمه حالياً.
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1 rounded-none"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف نهائي"}
            </Button>
            <Button variant="outline" className="rounded-none" onClick={() => setDeleteConfirm(null)}>
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Reusable image picker dialog — use this anywhere you need to pick an image
 * from the media library instead of uploading a new one each time.
 */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  title = "اختر صورة من المكتبة",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col rounded-none p-0 gap-0" dir="rtl">
        <DialogHeader className="p-4 pb-0 shrink-0">
          <DialogTitle className="text-base font-black">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-4">
          <AdminMediaLibrary
            onSelect={url => { onSelect(url); onOpenChange(false); }}
            filterType="image"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
