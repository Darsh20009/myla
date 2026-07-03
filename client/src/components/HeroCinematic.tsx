import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

/* ─── Video sources ──────────────────────────────────────────────── */
const VIDEOS = [
  "/hero/hero-v1.mp4",
  "/hero/hero-v2.mp4",
  "/hero/hero-v3.mp4",
];

const TRANS_DURATION = 1.6; // seconds

/* ─── CSS ────────────────────────────────────────────────────────── */
const HERO_CSS = `
  .myla-hero {
    position: relative;
    width: 100%;
    height: 100svh;
    overflow: hidden;
    background: #0E0A07;
    isolation: isolate;
  }

  /* Slots — only opacity is ever changed, never transform/scale */
  .myla-vid-slot {
    position: absolute;
    inset: 0;
    will-change: opacity;
  }
  .myla-vid-slot video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  /* Depth */
  .myla-vignette {
    position: absolute; inset: 0; z-index: 10; pointer-events: none;
    background: radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.55) 100%);
  }
  .myla-grad-top {
    position: absolute; top: 0; left: 0; right: 0; height: 22%; z-index: 10; pointer-events: none;
    background: linear-gradient(to bottom, rgba(10,7,4,0.65) 0%, transparent 100%);
  }
  .myla-grad-btm {
    position: absolute; bottom: 0; left: 0; right: 0; height: 52%; z-index: 10; pointer-events: none;
    background: linear-gradient(to top, rgba(10,7,4,0.92) 0%, transparent 100%);
  }

  /* Golden shimmer flash */
  .myla-shimmer {
    position: absolute; inset: 0; z-index: 11; pointer-events: none;
    background: radial-gradient(
      ellipse at 50% 35%,
      rgba(210,175,120,0.18) 0%,
      rgba(180,140,90,0.08) 50%,
      transparent 75%
    );
    will-change: opacity;
  }

  /* Light ray */
  .myla-ray {
    position: absolute; top: -10%; left: 0; width: 28%; height: 120%;
    z-index: 12; pointer-events: none; will-change: transform;
    background: linear-gradient(
      108deg,
      transparent 0%,
      rgba(255,255,255,0.025) 38%,
      rgba(255,255,255,0.09) 50%,
      rgba(255,255,255,0.025) 62%,
      transparent 100%
    );
  }

  /* Content */
  .myla-content {
    position: absolute; inset: 0; z-index: 20;
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-end;
    padding-bottom: 9%; pointer-events: none;
  }
  .myla-wordmark {
    font-family: 'Georgia','Didot',serif;
    font-size: clamp(2.8rem, 6.5vw, 5.2rem);
    font-weight: 300; color: #FAF7F2;
    letter-spacing: 0.52em;
    opacity: 0; transform: translateY(20px);
    margin-bottom: 1.2rem;
    text-shadow: 0 2px 40px rgba(0,0,0,0.45);
  }
  .myla-tagline {
    font-size: clamp(0.58rem, 1.1vw, 0.72rem);
    letter-spacing: 0.38em; color: #C9A882;
    text-transform: uppercase;
    opacity: 0; transform: translateY(12px);
    margin-bottom: 2.4rem; font-family: 'Georgia',serif;
  }
  .myla-ctas {
    display: flex; gap: 1rem; flex-wrap: wrap;
    justify-content: center;
    opacity: 0; transform: translateY(14px);
    pointer-events: auto;
  }
  .myla-btn-primary {
    padding: 0.85rem 2.6rem;
    background: #C9A882; color: #1A0E08;
    font-size: 0.68rem; font-weight: 700;
    letter-spacing: 0.28em; text-transform: uppercase;
    border: none; cursor: pointer;
    transition: opacity 0.3s, transform 0.2s;
  }
  .myla-btn-primary:hover  { opacity: 0.86; }
  .myla-btn-primary:active { transform: scale(0.97); }
  .myla-btn-outline {
    padding: 0.85rem 2.6rem;
    background: transparent; color: #C9A882;
    font-size: 0.68rem; font-weight: 600;
    letter-spacing: 0.28em; text-transform: uppercase;
    border: 1px solid rgba(201,168,130,0.55); cursor: pointer;
    transition: background 0.3s, transform 0.2s;
  }
  .myla-btn-outline:hover  { background: rgba(201,168,130,0.08); }
  .myla-btn-outline:active { transform: scale(0.97); }

  /* Progress bars */
  .myla-dots {
    position: absolute; right: 1.5rem; top: 50%; transform: translateY(-50%);
    z-index: 21; display: flex; flex-direction: column; gap: 0.55rem;
  }
  .myla-dot {
    width: 3px; height: 20px; border-radius: 2px;
    background: rgba(201,168,130,0.22);
    overflow: hidden; position: relative;
  }
  .myla-dot-fill {
    position: absolute; top: 0; left: 0; width: 100%; height: 0%;
    background: #C9A882; border-radius: 2px;
  }
  .myla-dot-fill.running {
    animation: dotFill var(--dot-dur, 10s) linear forwards;
  }
  @keyframes dotFill { from { height: 0% } to { height: 100% } }
`;

/* ─── Component ──────────────────────────────────────────────────── */
export function HeroCinematic({
  onShop,
  onLogin,
  isLoggedIn,
}: {
  onShop: () => void;
  onLogin: () => void;
  isLoggedIn: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [vidDur, setVidDur]       = useState(10);

  /* Named refs — never inside arrays/loops */
  const slot0 = useRef<HTMLDivElement>(null);
  const slot1 = useRef<HTMLDivElement>(null);
  const slot2 = useRef<HTMLDivElement>(null);
  const vid0  = useRef<HTMLVideoElement>(null);
  const vid1  = useRef<HTMLVideoElement>(null);
  const vid2  = useRef<HTMLVideoElement>(null);

  const shimRef = useRef<HTMLDivElement>(null);
  const rayRef  = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const tagRef  = useRef<HTMLDivElement>(null);
  const ctaRef  = useRef<HTMLDivElement>(null);

  /* Stable arrays built once — only refs inside change */
  const slots  = useRef([slot0, slot1, slot2]);
  const videos = useRef([vid0, vid1, vid2]);

  /* Bookkeeping */
  const curIdx  = useRef(0);
  const inTrans = useRef(false);

  /* ── Init: slot 0 visible, others hidden ──────────────────────── */
  useEffect(() => {
    gsap.set(slot0.current, { opacity: 1, zIndex: 2 });
    gsap.set(slot1.current, { opacity: 0, zIndex: 1 });
    gsap.set(slot2.current, { opacity: 0, zIndex: 1 });
    vid0.current?.play().catch(() => {});

    const el = vid0.current;
    if (el) {
      const onMeta = () => setVidDur(el.duration || 10);
      el.addEventListener("loadedmetadata", onMeta);
      return () => el.removeEventListener("loadedmetadata", onMeta);
    }
  }, []);

  /* ── Content entrance ─────────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => {
      gsap.to([wordRef.current, tagRef.current, ctaRef.current].filter(Boolean), {
        opacity: 1, y: 0, duration: 1.3, ease: "power3.out", stagger: 0.2,
      });
    }, 900);
    return () => clearTimeout(t);
  }, []);

  /* ── Light ray ────────────────────────────────────────────────── */
  useEffect(() => {
    const sweep = () => {
      if (!rayRef.current) return;
      gsap.fromTo(rayRef.current,
        { x: "-120%", opacity: 0 },
        { x: "500%",  opacity: 1, duration: 5.5, ease: "power1.inOut" }
      );
    };
    const t  = setTimeout(sweep, 2000);
    const id = setInterval(sweep, 14000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);

  /* ── Crossfade — opacity ONLY on the slot div, no transform ──── */
  const doTransition = useCallback(() => {
    if (inTrans.current) return;
    inTrans.current = true;

    const from = curIdx.current;
    const to   = (from + 1) % VIDEOS.length;

    const fromSlot  = slots.current[from].current;
    const toSlot    = slots.current[to].current;
    const toVideo   = videos.current[to].current;
    const fromVideo = videos.current[from].current;

    if (!fromSlot || !toSlot) { inTrans.current = false; return; }

    /* Position incoming slot above current */
    gsap.set(toSlot, { zIndex: 3 });
    toVideo?.play().catch(() => {});

    /* Shimmer at midpoint */
    if (shimRef.current) {
      gsap.fromTo(shimRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: TRANS_DURATION * 0.45,
          ease: "power2.in",
          onComplete() {
            gsap.to(shimRef.current!, {
              opacity: 0, duration: TRANS_DURATION * 0.65, ease: "power2.out",
            });
          },
        }
      );
    }

    /* Fade IN the new slot — ONLY opacity, zero other properties */
    gsap.fromTo(toSlot,
      { opacity: 0 },
      {
        opacity: 1,
        duration: TRANS_DURATION,
        ease: "sine.inOut",
        onComplete() {
          /* New slot 100% visible — NOW safely hide old slot */
          gsap.set(fromSlot, { zIndex: 1, opacity: 0 });
          fromVideo?.pause();

          curIdx.current = to;
          inTrans.current = false;
          setActiveIdx(to);
        },
      }
    );
  }, []);

  /* ── "ended" listener on all videos ──────────────────────────── */
  useEffect(() => {
    const cleanup: Array<() => void> = [];

    [vid0, vid1, vid2].forEach((vRef, i) => {
      const el = vRef.current;
      if (!el) return;
      const handler = () => {
        if (i === curIdx.current && !inTrans.current) doTransition();
      };
      el.addEventListener("ended", handler);
      cleanup.push(() => el.removeEventListener("ended", handler));
    });

    return () => cleanup.forEach(fn => fn());
  }, [doTransition]);

  return (
    <>
      <style>{HERO_CSS}</style>

      <div className="myla-hero">

        {/* ── Video slots ── */}
        <div ref={slot0} className="myla-vid-slot" style={{ zIndex: 2, opacity: 1 }}>
          <video ref={vid0} src={VIDEOS[0]} muted playsInline preload="auto" />
        </div>
        <div ref={slot1} className="myla-vid-slot" style={{ zIndex: 1, opacity: 0 }}>
          <video ref={vid1} src={VIDEOS[1]} muted playsInline preload="metadata" />
        </div>
        <div ref={slot2} className="myla-vid-slot" style={{ zIndex: 1, opacity: 0 }}>
          <video ref={vid2} src={VIDEOS[2]} muted playsInline preload="metadata" />
        </div>

        {/* ── Shimmer ── */}
        <div ref={shimRef} className="myla-shimmer" style={{ opacity: 0 }} />

        {/* ── Depth ── */}
        <div className="myla-vignette" />
        <div className="myla-grad-top" />
        <div className="myla-grad-btm" />

        {/* ── Ray ── */}
        <div ref={rayRef} className="myla-ray" />

        {/* ── Content ── */}
        <div className="myla-content">
          <div ref={wordRef} className="myla-wordmark">MYLA</div>
          <div ref={tagRef}  className="myla-tagline">عبايات راقية · Luxury Abayas</div>
          <div ref={ctaRef}  className="myla-ctas">
            <button className="myla-btn-primary" onClick={onShop}>
              ابدأ التسوق · Shop Now
            </button>
            {!isLoggedIn && (
              <button className="myla-btn-outline" onClick={onLogin}>
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>

        {/* ── Progress bars ── */}
        <div className="myla-dots">
          {VIDEOS.map((_, i) => (
            <div key={i} className="myla-dot">
              <div
                className={`myla-dot-fill${activeIdx === i ? " running" : ""}`}
                style={{ "--dot-dur": `${vidDur}s` } as React.CSSProperties}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
