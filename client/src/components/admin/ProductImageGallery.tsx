import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronLeft, ChevronRight, FolderOpen, Loader2 } from "lucide-react";
import { MediaPickerDialog } from "@/pages/admin/AdminMediaLibrary";
import { useToast } from "@/hooks/use-toast";

interface ProductImageGalleryProps {
  images: string[];
  onAdd: (url: string) => void;       // called after each successful upload or library pick
  onRemove: (index: number) => void;
  onAddUrl?: (url: string) => void;   // alias kept for library picker (uses onAdd internally)
}

export function ProductImageGallery({ images, onAdd, onRemove, onAddUrl }: ProductImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [libOpen, setLibOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0); // files done
  const [uploadTotal, setUploadTotal] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Keep index in bounds after removal
  useEffect(() => {
    if (images.length === 0) { setCurrent(0); return; }
    if (current >= images.length) setCurrent(images.length - 1);
  }, [images.length, current]);

  const prev = () => setCurrent(c => (c - 1 + images.length) % images.length);
  const next = () => setCurrent(c => (c + 1) % images.length);

  // Upload handler — supports multiple files
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > 15 * 1024 * 1024) {
        toast({ title: "ملف كبير", description: `${f.name} أكبر من 15 MB، تم تخطيه`, variant: "destructive" });
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;

    setUploading(true);
    setUploadTotal(valid.length);
    setUploadProgress(0);

    let done = 0;
    for (const file of valid) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Upload failed");
        }
        const { url } = await res.json();
        onAdd(url);
        done++;
        setUploadProgress(done);
      } catch (e: any) {
        toast({ title: `خطأ في رفع ${file.name}`, description: e.message, variant: "destructive" });
      }
    }

    setUploading(false);
    if (done > 0) toast({ title: `✅ تم رفع ${done} صورة` });
    // Reset the file input so the same files can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleLibraryPick = (url: string) => {
    onAdd(url);
    if (onAddUrl) onAddUrl(url);
    setLibOpen(false);
  };

  return (
    <div className="space-y-3" dir="rtl">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">صور المنتج</p>
        <div className="flex gap-1.5 items-center">
          {/* Library picker */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 rounded-none text-[9px] gap-1 border-[#C9A882]/50 text-[#6B3F2A] hover:bg-[#C9A882]/10"
            onClick={() => setLibOpen(true)}
          >
            <FolderOpen className="h-3 w-3" />
            من المكتبة
          </Button>

          {/* Upload button */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              className="h-8 px-2 rounded-none text-[9px] gap-1 overflow-visible"
            >
              {uploading
                ? <><Loader2 className="h-3 w-3 animate-spin" />{uploadProgress}/{uploadTotal}</>
                : <><Plus className="h-3 w-3" />رفع صور</>
              }
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={e => handleFiles(e.target.files)}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {images.length > 0 ? (
        <div className="space-y-2">
          {/* Main carousel */}
          <div className="relative aspect-video bg-black/5 overflow-hidden border border-black/5 group">
            <img
              src={images[current]}
              alt={`صورة ${current + 1}`}
              className="w-full h-full object-contain"
            />

            {images.length > 1 && (
              <>
                <button type="button" onClick={prev}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={next}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Dots */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {images.map((_, i) => (
                    <button key={i} type="button" onClick={() => setCurrent(i)}
                      className={`rounded-full transition-all ${i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"}`} />
                  ))}
                </div>

                <span className="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {current + 1} / {images.length}
                </span>
                <span className="absolute top-2 right-2 bg-black/40 text-white text-[8px] px-1.5 py-0.5 rounded">
                  ▶ تلقائي
                </span>
              </>
            )}
          </div>

          {/* Thumbnails */}
          <div className="grid grid-cols-6 gap-1.5">
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`relative group cursor-pointer aspect-square overflow-hidden border-2 transition-all ${
                  idx === current ? "border-black shadow-sm" : "border-transparent hover:border-black/20"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />

                {/* Delete */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onRemove(idx); }}
                  className="absolute top-0 right-0 h-5 w-5 bg-red-600 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>

                {idx === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[7px] text-center py-0.5 leading-none">
                    رئيسية
                  </span>
                )}
              </div>
            ))}

            {/* Upload-progress ghost tiles */}
            {uploading && Array.from({ length: uploadTotal - uploadProgress }).map((_, i) => (
              <div key={`ghost-${i}`} className="aspect-square border border-dashed border-black/10 flex items-center justify-center bg-black/2 animate-pulse">
                <Loader2 className="h-4 w-4 text-black/20 animate-spin" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className="border border-dashed border-black/10 py-10 text-center cursor-pointer hover:border-[#C9A882]/50 hover:bg-[#C9A882]/5 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#C9A882]" />
              <p className="text-[9px] text-black/40">جاري رفع {uploadProgress}/{uploadTotal}…</p>
            </div>
          ) : (
            <>
              <p className="text-[9px] text-black/30 mb-1">لم يتم رفع أي صور بعد</p>
              <p className="text-[8px] text-black/20">انقر هنا للاختيار أو اسحب الصور</p>
            </>
          )}
        </div>
      )}

      <p className="text-[8px] text-black/40">
        يمكنك اختيار عدة صور دفعة واحدة · الصورة الأولى تظهر في قائمة المنتجات
      </p>

      <MediaPickerDialog
        open={libOpen}
        onOpenChange={setLibOpen}
        onSelect={handleLibraryPick}
        title="اختر صورة من المكتبة"
      />
    </div>
  );
}
