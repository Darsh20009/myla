import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

/* ─── Asset manifest ─────────────────────────────────────────────── */
const HERO_IMAGES = [
  "/hero/model-01.png",
  "/hero/model-02.png",
  "/hero/model-03.png",
  "/hero/model-04.png",
  "/hero/model-05.png",
  "/hero/model-06.png",
  "/hero/model-07.png",
  "/hero/model-08.png",
  "/hero/model-09.png",
  "/hero/model-10.png",
  "/hero/model-11.png",
  "/hero/model-12.png",
  "/hero/model-13.png",
  "/hero/model-14.png",
  "/hero/model-15.png",
  "/hero/model-16.png",
  "/hero/model-17.png",
  "/hero/model-18.png",
  "/hero/model-19.png",
];

const SLIDE_DURATION  = 6500;   // ms each image holds
const TRANS_DURATION  = 1.8;    // seconds for the transition
const KB_VARIANTS = [
  { fromX:  "0%",    fromY:  "0%",    toX: "-1.5%", toY:  "1%"   },
  { fromX:  "0.5%",  fromY: "-0.3%",  toX: "-0.5%", toY:  "1.4%" },
  { fromX: "-1%",    fromY:  "0.5%",  toX:  "0.8%", toY: "-1%"   },
  { fromX:  "1%",    fromY:  "0.2%",  toX: "-0.6%", toY:  "0.8%" },
];

/* ─── CSS ────────────────────────────────────────────────────────── */
const HERO_CSS = `
  .myla-hero {
    position: relative;
    width: 100%;
    height: 100svh;
    overflow: hidden;
    background: #0E0A07;
  }

  /* ── Image slots ── */
  .myla-slide {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .myla-img {
    position: absolute;
    inset: -6%;
    width: 112%; height: 112%;
    object-fit: cover;
    object-position: center top;
    will-change: transform, opacity;
    transform-origin: center center;
  }

  /* ── Golden shimmer flash ── */
  .myla-shimmer {
    position: absolute; inset: 0;
    z-index: 8; pointer-events: none;
    background: radial-gradient(
      ellipse at 50% 38%,
      rgba(210,175,120,0.22) 0%,
      rgba(180,140,90,0.10) 45%,
      transparent 75%
    );
    will-change: opacity;
  }

  /* ── Depth overlays ── */
  .myla-vignette {
    position: absolute; inset: 0; z-index: 3; pointer-events: none;
    background: radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.55) 100%);
  }
  .myla-grad-top {
    position: absolute; top: 0; left: 0; right: 0; height: 22%; z-index: 3; pointer-events: none;
    background: linear-gradient(to bottom, rgba(10,7,4,0.65) 0%, transparent 100%);
  }
  .myla-grad-btm {
    position: absolute; bottom: 0; left: 0; right: 0; height: 48%; z-index: 3; pointer-events: none;
    background: linear-gradient(to top, rgba(10,7,4,0.9) 0%, transparent 100%);
  }

  /* ── Light ray ── */
  .myla-ray {
    position: absolute; top: -10%; left: 0; width: 25%; height: 120%;
    z-index: 4; pointer-events: none; will-change: transform;
    background: linear-gradient(
      105deg,
      transparent 0%,
      rgba(255,255,255,0.03) 40%,
      rgba(255,255,255,0.10) 50%,
      rgba(255,255,255,0.03) 60%,
      transparent 100%
    );
  }

  /* ── Content ── */
  .myla-content {
    position: absolute; inset: 0; z-index: 10;
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-end;
    padding-bottom: 9%; pointer-events: none;
  }
  .myla-wordmark {
    font-family: 'Georgia','Didot',serif;
    font-size: clamp(2.8rem, 6.5vw, 5.2rem);
    font-weight: 300;
    color: #FAF7F2;
    letter-spacing: 0.52em;
    opacity: 0; transform: translateY(20px);
    margin-bottom: 1.2rem;
    text-shadow: 0 2px 40px rgba(0,0,0,0.45);
  }
  .myla-tagline {
    font-size: clamp(0.58rem, 1.1vw, 0.72rem);
    letter-spacing: 0.38em;
    color: #C9A882;
    text-transform: uppercase;
    opacity: 0; transform: translateY(12px);
    margin-bottom: 2.4rem;
    font-family: 'Georgia',serif;
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

  /* ── Slide dots ── */
  .myla-dots {
    position: absolute; right: 1.5rem; top: 50%; transform: translateY(-50%);
    z-index: 12; display: flex; flex-direction: column; gap: 0.48rem;
  }
  .myla-dot {
    width: 3.5px; height: 3.5px; border-radius: 50%;
    background: rgba(201,168,130,0.3);
    transition: background 0.5s, transform 0.5s;
  }
  .myla-dot.active {
    background: #C9A882; transform: scale(1.7);
  }
`;

/* ─── Ken Burns via GSAP ─────────────────────────────────────────── */
function startKenBurns(imgEl: HTMLImageElement, idx: number, duration: number) {
  const v = KB_VARIANTS[idx % KB_VARIANTS.length];
  gsap.killTweensOf(imgEl, "x,y,scale");
  gsap.fromTo(
    imgEl,
    { scale: 1.12, x: v.fromX, y: v.fromY },
    { scale: 1.20, x: v.toX, y: v.toY, duration: duration / 1000 + 1.5, ease: "none" }
  );
}

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
  /* dots only — all transition state lives in refs */
  const [activeDot, setActiveDot] = useState(0);

  /* Two reusable slots — A and B alternate being front/back */
  const slotA    = useRef<HTMLDivElement>(null);
  const slotB    = useRef<HTMLDivElement>(null);
  const imgA     = useRef<HTMLImageElement>(null);
  const imgB     = useRef<HTMLImageElement>(null);
  const shimRef  = useRef<HTMLDivElement>(null);
  const rayRef   = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wordRef  = useRef<HTMLDivElement>(null);
  const tagRef   = useRef<HTMLDivElement>(null);
  const ctaRef   = useRef<HTMLDivElement>(null);

  /* Transition bookkeeping (all refs, never stale) */
  const frontIsA   = useRef(true);   // which slot is currently on top
  const curIdx     = useRef(0);      // index of the front slot's image
  const inTrans    = useRef(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout>>();

  /* ── Initialise slots ─────────────────────────────────────────── */
  useEffect(() => {
    /* A is front: opacity 1, z-index 2, Ken Burns running */
    if (slotA.current) gsap.set(slotA.current, { opacity: 1, zIndex: 2 });
    if (imgA.current) {
      imgA.current.src = HERO_IMAGES[0];
      startKenBurns(imgA.current, 0, SLIDE_DURATION);
    }
    /* B is back: opacity 0, z-index 1, image pre-loaded */
    if (slotB.current) gsap.set(slotB.current, { opacity: 0, zIndex: 1 });
    if (imgB.current) imgB.current.src = HERO_IMAGES[1];
  }, []);

  /* ── Content entrance ─────────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => {
      const els = [wordRef.current, tagRef.current, ctaRef.current].filter(Boolean);
      gsap.to(els, { opacity: 1, y: 0, duration: 1.3, ease: "power3.out", stagger: 0.2 });
    }, 900);
    return () => clearTimeout(t);
  }, []);

  /* ── Audio ────────────────────────────────────────────────────── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0;
    audio.loop = true;
    const t = setTimeout(() => {
      audio.play().then(() => {
        gsap.to(audio, { volume: 0.1, duration: 3, ease: "power1.out" });
      }).catch(() => {/* autoplay blocked */});
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  /* ── Repeating light ray ──────────────────────────────────────── */
  useEffect(() => {
    const sweep = () => {
      if (!rayRef.current) return;
      gsap.fromTo(rayRef.current,
        { x: "-120%", opacity: 0 },
        { x: "500%", opacity: 1, duration: 5, ease: "power1.inOut" }
      );
    };
    sweep();
    const id = setInterval(sweep, 13000);
    return () => clearInterval(id);
  }, []);

  /* ── Core transition ──────────────────────────────────────────── */
  const doTransition = useCallback(() => {
    if (inTrans.current) return;
    inTrans.current = true;

    const nextIdx    = (curIdx.current + 1) % HERO_IMAGES.length;
    const afterNext  = (nextIdx + 1) % HERO_IMAGES.length;

    /* Which slot is currently front vs back? */
    const frontSlot = frontIsA.current ? slotA.current : slotB.current;
    const backSlot  = frontIsA.current ? slotB.current : slotA.current;
    const backImg   = frontIsA.current ? imgB.current  : imgA.current;
    const frontImg  = frontIsA.current ? imgA.current  : imgB.current;

    if (!frontSlot || !backSlot || !backImg) {
      inTrans.current = false;
      return;
    }

    /* ① Raise back slot above front — it will fade IN on top */
    gsap.set(backSlot, { zIndex: 3 });

    /* ② Start Ken Burns on the incoming image */
    startKenBurns(backImg, nextIdx, SLIDE_DURATION);

    /* ③ Golden shimmer flash — peaks at 40% through the transition */
    if (shimRef.current) {
      gsap.fromTo(
        shimRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: TRANS_DURATION * 0.4,
          ease: "power2.in",
          onComplete() {
            gsap.to(shimRef.current!, {
              opacity: 0,
              duration: TRANS_DURATION * 0.7,
              ease: "power2.out",
            });
          },
        }
      );
    }

    /* ④ Fade back slot IN (zoom-reveal: scale 1.08 → 1.0 as it appears) */
    gsap.fromTo(
      backSlot,
      { opacity: 0, scale: 1.06 },
      {
        opacity: 1,
        scale: 1,
        duration: TRANS_DURATION,
        ease: "power2.inOut",
        onComplete() {
          /* ⑤ New image fully visible — now clean up the old front */
          gsap.set(frontSlot, { zIndex: 1, opacity: 0, scale: 1 });
          if (frontImg) gsap.killTweensOf(frontImg, "x,y,scale");

          /* ⑥ Preload the image after next into the old front slot */
          if (frontImg) frontImg.src = HERO_IMAGES[afterNext];

          /* ⑦ Swap bookkeeping */
          frontIsA.current = !frontIsA.current;
          curIdx.current   = nextIdx;
          inTrans.current  = false;

          setActiveDot(nextIdx);

          /* ⑧ Schedule next transition */
          timerRef.current = setTimeout(doTransition, SLIDE_DURATION);
        },
      }
    );
  }, []);

  /* ── Start the first timer ────────────────────────────────────── */
  useEffect(() => {
    timerRef.current = setTimeout(doTransition, SLIDE_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [doTransition]);

  return (
    <>
      <style>{HERO_CSS}</style>

      <div className="myla-hero">
        <audio ref={audioRef} src="/hero/ambient.mp3" preload="none" />

        {/* ── Slot A ── */}
        <div ref={slotA} className="myla-slide" style={{ zIndex: 2 }}>
          <img
            ref={imgA}
            src={HERO_IMAGES[0]}
            alt=""
            className="myla-img"
            loading="eager"
          />
        </div>

        {/* ── Slot B (back, pre-loaded) ── */}
        <div ref={slotB} className="myla-slide" style={{ opacity: 0, zIndex: 1 }}>
          <img
            ref={imgB}
            src={HERO_IMAGES[1]}
            alt=""
            className="myla-img"
            loading="lazy"
          />
        </div>

        {/* ── Golden shimmer flash ── */}
        <div ref={shimRef} className="myla-shimmer" style={{ opacity: 0 }} />

        {/* ── Depth ── */}
        <div className="myla-vignette" />
        <div className="myla-grad-top" />
        <div className="myla-grad-btm" />

        {/* ── Moving light ── */}
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

        {/* ── Slide dots (first 8) ── */}
        <div className="myla-dots">
          {HERO_IMAGES.slice(0, 8).map((_, i) => (
            <div key={i} className={`myla-dot${activeDot % 8 === i ? " active" : ""}`} />
          ))}
        </div>
      </div>
    </>
  );
}
