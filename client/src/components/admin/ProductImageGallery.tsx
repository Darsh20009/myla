import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { MediaPickerDialog } from "@/pages/admin/AdminMediaLibrary";

interface ProductImageGalleryProps {
  images: string[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onAddUrl?: (url: string) => void; // called when picking from library
}

export function ProductImageGallery({ images, onUpload, onRemove, onAddUrl }: ProductImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [libOpen, setLibOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-advance every 3 s when multiple images exist
  useEffect(() => {
    if (images.length < 2) return;
    const iv = setInterval(() => setCurrent(c => (c + 1) % images.length), 3000);
    return () => clearInterval(iv);
  }, [images.length]);

  // Keep index in bounds when images are removed
  useEffect(() => {
    if (current >= images.length && images.length > 0) setCurrent(images.length - 1);
  }, [images.length, current]);

  const prev = () => setCurrent(c => (c - 1 + images.length) % images.length);
  const next = () => setCurrent(c => (c + 1) % images.length);

  return (
    <div className="space-y-2" dir="rtl">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">صور المنتج</p>
        <div className="flex gap-1.5">
          {onAddUrl && (
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
          )}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 rounded-none text-[9px] gap-1 overflow-visible"
            >
              <Plus className="h-3 w-3" />
              رفع صورة
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </Button>
          </div>
        </div>
      </div>

      {images.length > 0 ? (
        <div className="space-y-2">
          {/* Main carousel preview */}
          <div className="relative aspect-video bg-black/5 overflow-hidden border border-black/5 group">
            <img
              src={images[current]}
              alt={`صورة ${current + 1}`}
              className="w-full h-full object-contain transition-opacity duration-300"
            />

            {images.length > 1 && (
              <>
                {/* Prev / Next arrows */}
                <button
                  type="button"
                  onClick={prev}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrent(i)}
                      className={`rounded-full transition-all ${
                        i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>

                {/* Counter */}
                <span className="absolute top-2 left-2 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {current + 1} / {images.length}
                </span>
              </>
            )}

            {/* Auto-rotate badge */}
            {images.length > 1 && (
              <span className="absolute top-2 right-2 bg-black/40 text-white text-[8px] px-1.5 py-0.5 rounded">
                ▶ تلقائي
              </span>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="grid grid-cols-6 gap-1.5">
            {images.map((img, idx) => (
              <div
                key={idx}
                className={`relative group cursor-pointer aspect-square overflow-hidden border-2 transition-all ${
                  idx === current ? "border-black shadow-sm" : "border-transparent hover:border-black/20"
                }`}
                onClick={() => setCurrent(idx)}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onRemove(idx); }}
                  className="absolute top-0 right-0 h-5 w-5 bg-destructive/80 hover:bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
                {idx === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[7px] text-center py-0.5">
                    رئيسية
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="border border-dashed border-black/10 py-10 text-center cursor-pointer hover:border-black/30 hover:bg-black/2 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-[9px] text-black/30 mb-2">لم يتم رفع أي صور بعد</p>
          <p className="text-[8px] text-black/20">انقر للرفع أو اختر من المكتبة</p>
        </div>
      )}

      <p className="text-[8px] text-black/40">
        الصورة الأولى تظهر في قائمة المنتجات · تتنقل تلقائياً كل 3 ثوانٍ
      </p>

      {onAddUrl && (
        <MediaPickerDialog
          open={libOpen}
          onOpenChange={setLibOpen}
          onSelect={url => { onAddUrl(url); setLibOpen(false); }}
          title="اختر صورة من المكتبة"
        />
      )}
    </div>
  );
}
