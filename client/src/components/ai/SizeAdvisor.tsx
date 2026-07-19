import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Sparkles, Ruler, ChevronDown, ChevronUp,
  CheckCircle2, Camera, SlidersHorizontal, Upload, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SizeAdvisorProps {
  productName: string;
  productCategory: string;
  availableSizes: string[];
  availableLengths?: string[];
  onSizeSelect?: (size: string) => void;
  onLengthSelect?: (length: string) => void;
}

const confidenceColor: Record<string, string> = {
  high:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50  text-amber-700  border-amber-200",
  low:    "bg-red-50    text-red-700    border-red-200",
};

const fitLabel: Record<string, string> = {
  slim:    "ضيق نسبياً",
  regular: "مقاس طبيعي",
  loose:   "واسع نسبياً",
};

export function SizeAdvisor({
  productName, productCategory,
  availableSizes, availableLengths = [],
  onSizeSelect, onLengthSelect,
}: SizeAdvisorProps) {
  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState<"measure" | "photo">("measure");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Measurements tab
  const [gender, setGender] = useState<"female" | "male">("female");
  const [measurements, setMeasurements] = useState({
    height: "", weight: "", chest: "", waist: "", hip: "", shoulder: "",
  });

  // Photo tab
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoName, setPhotoName] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  // ── Measurements submit ─────────────────────────────────────
  const handleMeasurements = async () => {
    const filled = Object.values(measurements).some(v => v.trim() !== "");
    if (!filled) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/size-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName, productCategory, availableSizes, availableLengths, gender,
          measurements: Object.fromEntries(
            Object.entries(measurements)
              .filter(([, v]) => v.trim() !== "")
              .map(([k, v]) => [k, parseFloat(v)])
          ),
        }),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "حدث خطأ، حاول مجدداً" });
    }
    setLoading(false);
  };

  // ── Photo upload ────────────────────────────────────────────
  const handlePhotoFile = async (file: File) => {
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      if (!up.ok) throw new Error("upload failed");
      const { url } = await up.json();
      setPhotoUrl(url);
      setPhotoName(file.name);
    } catch {
      setResult({ error: "فشل رفع الصورة. حاول مجدداً." });
    }
    setUploading(false);
  };

  const handlePhotoAnalyze = async () => {
    if (!photoUrl) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/size-advisor-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: photoUrl, productName, availableSizes, availableLengths }),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: "تعذّر تحليل الصورة. حاول مجدداً." });
    }
    setLoading(false);
  };

  const resetPhoto = () => { setPhotoUrl(""); setPhotoName(""); setResult(null); };

  // ── Result card ─────────────────────────────────────────────
  const ResultCard = () => {
    if (!result) return null;
    if (result.error) return (
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="text-xs text-red-500 font-bold text-center py-3"
      >{result.error}</motion.p>
    );
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-3 pt-1"
      >
        {/* Main recommendation */}
        <div className="flex items-center gap-3 p-3 bg-black text-white">
          <div className="text-center min-w-[52px]">
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-0.5">المقاس</p>
            <p className="text-2xl font-black leading-none">{result.recommendedSize}</p>
          </div>
          {result.recommendedLength && (
            <>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center min-w-[52px]">
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-0.5">الطول</p>
                <p className="text-2xl font-black leading-none">{result.recommendedLength}"</p>
              </div>
            </>
          )}
          <div className="flex-1 text-right">
            <p className="text-[10px] font-bold leading-relaxed opacity-80">{result.reasoning}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {result.confidence && (
            <span className={`text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full ${confidenceColor[result.confidence] || confidenceColor.medium}`}>
              {result.confidence === "high" ? "ثقة عالية" : result.confidence === "medium" ? "ثقة متوسطة" : "ثقة منخفضة"}
            </span>
          )}
          {result.fit && (
            <span className="text-[9px] font-black uppercase tracking-widest border border-black/10 px-2 py-0.5 rounded-full bg-black/5">
              {fitLabel[result.fit] || result.fit}
            </span>
          )}
        </div>

        {/* Length reasoning */}
        {result.lengthReasoning && (
          <p className="text-[10px] text-black/50 font-bold">{result.lengthReasoning}</p>
        )}

        {/* Tips */}
        {result.tips?.length > 0 && (
          <div className="space-y-1">
            {result.tips.map((tip: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-[10px] text-black/50 font-bold">
                <CheckCircle2 className="h-3 w-3 text-black/40 mt-0.5 shrink-0" />
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Alternative */}
        {result.alternativeSize && (
          <p className="text-[9px] text-black/35 font-bold border-t border-black/5 pt-2">
            البديل: <span className="font-black text-black/55">{result.alternativeSize}</span>
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {onSizeSelect && result.recommendedSize && availableSizes.includes(result.recommendedSize) && (
            <Button
              size="sm" variant="outline"
              onClick={() => onSizeSelect(result.recommendedSize)}
              className="flex-1 h-9 text-[10px] font-black uppercase tracking-widest rounded-none border-black text-black hover:bg-black hover:text-white"
            >
              اختيار مقاس {result.recommendedSize}
            </Button>
          )}
          {onLengthSelect && result.recommendedLength && availableLengths.includes(result.recommendedLength) && (
            <Button
              size="sm" variant="outline"
              onClick={() => onLengthSelect(result.recommendedLength)}
              className="flex-1 h-9 text-[10px] font-black uppercase tracking-widest rounded-none border-black/30 hover:border-black"
            >
              طول {result.recommendedLength}"
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="border border-black/8 bg-black/[0.02] mt-6">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-right hover:bg-black/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-black flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="font-black text-sm uppercase tracking-widest text-black">دليل المقاسات بالذكاء الاصطناعي</p>
            <p className="text-[9px] text-black/40 font-bold mt-0.5">ارفع صورتك أو أدخل قياساتك — نوصيك بالمقاس المثالي فوراً</p>
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-black/30 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-black/30 shrink-0" />
        }
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-4 border-t border-black/5" dir="rtl">

              {/* Tab selector */}
              <div className="flex gap-0 mt-4 border border-black/10">
                {([
                  { id: "measure", label: "القياسات", icon: SlidersHorizontal },
                  { id: "photo",   label: "صورة الجسم", icon: Camera },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setTab(id); setResult(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all
                      ${tab === id ? "bg-black text-white" : "text-black/40 hover:text-black/70 hover:bg-black/4"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* ── MEASUREMENTS TAB ── */}
              {tab === "measure" && (
                <div className="space-y-3">
                  {/* Gender */}
                  <div className="flex gap-2">
                    {(["female", "male"] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`flex-1 h-9 text-[10px] font-black uppercase tracking-widest border transition-all
                          ${gender === g ? "border-black bg-black text-white" : "border-black/15 text-black/40 hover:border-black/40"}`}
                      >
                        {g === "female" ? "أنثى" : "ذكر"}
                      </button>
                    ))}
                  </div>

                  {/* Fields */}
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "height",   label: "الطول (سم)",    placeholder: "165" },
                      { key: "weight",   label: "الوزن (كغ)",    placeholder: "60" },
                      { key: "chest",    label: "الصدر (سم)",    placeholder: "90" },
                      { key: "waist",    label: "الخصر (سم)",    placeholder: "70" },
                      { key: "hip",      label: "الورك (سم)",    placeholder: "95" },
                      { key: "shoulder", label: "الكتف (سم)",    placeholder: "38" },
                    ] as const).map(({ key, label, placeholder }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-black/40">{label}</Label>
                        <Input
                          type="number"
                          value={measurements[key]}
                          onChange={e => setMeasurements(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="h-9 rounded-none border-black/15 focus-visible:ring-0 focus-visible:border-black text-sm font-bold text-right"
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleMeasurements}
                    disabled={loading || !Object.values(measurements).some(v => v.trim() !== "")}
                    className="w-full h-10 rounded-none bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-black/80 disabled:opacity-30"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5 ml-1.5" /> احصل على التوصية</>}
                  </Button>
                </div>
              )}

              {/* ── PHOTO TAB ── */}
              {tab === "photo" && (
                <div className="space-y-3">
                  <p className="text-[10px] text-black/40 font-bold leading-relaxed">
                    ارفع صورة كاملة للجسم واضحة (وجه للأمام أو من الجانب) — الذكاء الاصطناعي سيحلل البنية ويوصي بالمقاس المناسب.
                  </p>

                  {!photoUrl ? (
                    /* Upload zone */
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-full border-2 border-dashed border-black/15 hover:border-black/35 transition-colors py-8 flex flex-col items-center gap-3 text-black/40 hover:text-black/60"
                    >
                      {uploading
                        ? <Loader2 className="h-6 w-6 animate-spin" />
                        : <Upload className="h-6 w-6" />
                      }
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {uploading ? "جاري الرفع..." : "انقر لرفع صورة الجسم"}
                      </span>
                    </button>
                  ) : (
                    /* Photo preview */
                    <div className="relative">
                      <div className="flex items-center gap-3 p-3 border border-black/10 bg-black/2">
                        <div className="w-14 h-14 overflow-hidden shrink-0 border border-black/10">
                          <img src={photoUrl} alt="body" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-black/70 truncate">{photoName}</p>
                          <p className="text-[9px] text-black/35 font-bold mt-0.5">الصورة جاهزة للتحليل</p>
                        </div>
                        <button onClick={resetPhoto} className="p-1 text-black/30 hover:text-red-500 transition-colors shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ""; }}
                  />

                  <Button
                    onClick={handlePhotoAnalyze}
                    disabled={loading || !photoUrl || uploading}
                    className="w-full h-10 rounded-none bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-black/80 disabled:opacity-30"
                  >
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin ml-1.5" /> جاري تحليل الصورة...</>
                      : <><Camera className="h-3.5 w-3.5 ml-1.5" /> حلّل الصورة واقترح المقاس</>
                    }
                  </Button>
                </div>
              )}

              {/* Result */}
              <ResultCard />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
