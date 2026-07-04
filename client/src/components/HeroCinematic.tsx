import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

/* ─── Images ──────────────────────────────────────────────────────── */
const IMAGES = [
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

const SLIDE_DURATION = 3500; // ms each image stays visible
const FADE_DURATION  = 1.1;  // seconds for opacity crossfade

/* ─── Styles ──────────────────────────────────────────────────────── */
const CSS = `
  .myla-hero {
    position: relative;
    width: 100%;
    height: 100svh;
    overflow: hidden;
    background: #0E0A07;
    isolation: isolate;
  }

  /* Two alternating slots — only opacity changes, never scale/position */
  .myla-slot {
    position: absolute;
    inset: 0;
    will-change: opacity;
  }
  .myla-slot img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    display: block;
    transform-origin: center center;
    will-change: transform;
  }
  .myla-slot img.kb-play {
    animation: mylaKenBurns var(--kb-dur, 5s) ease-out forwards;
  }
  @keyframes mylaKenBurns {
    from { transform: scale(1)    translateY(0px); }
    to   { transform: scale(1.08) translateY(-12px); }
  }

  /* Depth overlays */
  .myla-vignette {
    position: absolute; inset: 0; z-index: 10; pointer-events: none;
    background: radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.50) 100%);
  }
  .myla-grad-top {
    position: absolute; top: 0; left: 0; right: 0; height: 22%; z-index: 10; pointer-events: none;
    background: linear-gradient(to bottom, rgba(10,7,4,0.60) 0%, transparent 100%);
  }
  .myla-grad-btm {
    position: absolute; bottom: 0; left: 0; right: 0; height: 55%; z-index: 10; pointer-events: none;
    background: linear-gradient(to top, rgba(10,7,4,0.93) 0%, transparent 100%);
  }

  /* Golden shimmer flash on transition */
  .myla-shimmer {
    position: absolute; inset: 0; z-index: 11; pointer-events: none;
    will-change: opacity;
    background:
      linear-gradient(
        108deg,
        transparent 0%, rgba(255,245,220,0.28) 48%,
        rgba(255,255,255,0.38) 50%,
        rgba(255,245,220,0.28) 52%, transparent 100%
      );
  }

  /* Light ray sweep */
  .myla-ray {
    position: absolute; top: -10%; left: 0; width: 28%; height: 120%;
    z-index: 12; pointer-events: none; will-change: transform;
    background: linear-gradient(
      108deg,
      transparent 0%,
      rgba(255,255,255,0.02) 38%,
      rgba(255,255,255,0.08) 50%,
      rgba(255,255,255,0.02) 62%,
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

  /* Progress dots */
  .myla-dots {
    position: absolute; right: 1.5rem; top: 50%; transform: translateY(-50%);
    z-index: 21; display: flex; flex-direction: column; gap: 0.55rem;
  }
  .myla-dot {
    width: 3px; height: 20px; border-radius: 2px;
    background: rgba(201,168,130,0.22);
    overflow: hidden; position: relative; cursor: pointer;
  }
  .myla-dot.active { background: rgba(201,168,130,0.35); }
  .myla-dot-fill {
    position: absolute; top: 0; left: 0; width: 100%; height: 0%;
    background: #C9A882; border-radius: 2px;
  }
  .myla-dot-fill.running {
    animation: dotFill var(--dot-dur, 5s) linear forwards;
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

  /*
   * Two-slot ping-pong approach:
   *   slotA and slotB alternate being the "front" visible image.
   *   Only opacity is ever animated on these divs — no scale, no transform —
   *   so there is no ghost / flash possible.
   */
  const slotA   = useRef<HTMLDivElement>(null);
  const slotB   = useRef<HTMLDivElement>(null);
  const imgA    = useRef<HTMLImageElement>(null);
  const imgB    = useRef<HTMLImageElement>(null);
  const shimRef = useRef<HTMLDivElement>(null);
  const rayRef  = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const tagRef  = useRef<HTMLDivElement>(null);
  const ctaRef  = useRef<HTMLDivElement>(null);

  /* Stable bookkeeping */
  const frontIsA  = useRef(true);
  const curIdx    = useRef(0);
  const inTrans   = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted   = useRef(true); // guards all async callbacks against post-unmount work

  /* ── Helpers ──────────────────────────────────────────────────── */
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const killAllTweens = useCallback(() => {
    gsap.killTweensOf([
      slotA.current, slotB.current,
      shimRef.current, rayRef.current,
      wordRef.current, tagRef.current, ctaRef.current,
    ].filter(Boolean));
  }, []);

  const preload = useCallback((src: string) => {
    const img = new Image();
    img.src = src;
  }, []);

  /* ── Crossfade — pure opacity, no transform ─────────────────── */
  const doTransition = useCallback(() => {
    if (!mounted.current || inTrans.current) return;
    inTrans.current = true;

    const next     = (curIdx.current + 1) % IMAGES.length;
    const isAFront = frontIsA.current;

    const backImg   = isAFront ? imgB.current  : imgA.current;
    const backSlot  = isAFront ? slotB.current : slotA.current;
    const frontSlot = isAFront ? slotA.current : slotB.current;

    if (!frontSlot || !backSlot || !backImg) {
      inTrans.current = false;
      return;
    }

    /* Load next image into back slot (still opacity 0) */
    backImg.src = IMAGES[next];
    gsap.set(backSlot, { zIndex: 3 });

    /* Ken Burns: reset back slot's img scale, start after it fades in */
    const backImgEl = isAFront ? imgB.current : imgA.current;
    const frontImgEl = isAFront ? imgA.current : imgB.current;
    if (frontImgEl) {
      frontImgEl.classList.remove("kb-play");
      frontImgEl.style.removeProperty("--kb-dur");
    }

    /* Shimmer sweep — translates left → right like a camera shutter */
    if (shimRef.current) {
      gsap.fromTo(shimRef.current,
        { x: "-110%", opacity: 0 },
        {
          x: "110%",
          opacity: 1,
          duration: FADE_DURATION * 0.9,
          ease: "power2.inOut",
        }
      );
    }

    /* Fade in back slot — only opacity */
    gsap.fromTo(backSlot,
      { opacity: 0 },
      {
        opacity: 1,
        duration: FADE_DURATION,
        ease: "sine.inOut",
        onComplete() {
          if (!mounted.current) return;

          gsap.set(frontSlot, { zIndex: 1, opacity: 0 });
          frontIsA.current = !isAFront;
          curIdx.current   = next;
          inTrans.current  = false;
          setActiveIdx(next);

          /* Start Ken Burns on newly visible image */
          if (backImgEl) {
            backImgEl.classList.remove("kb-play");
            void backImgEl.offsetWidth; // reflow to restart animation
            backImgEl.style.setProperty("--kb-dur", `${(SLIDE_DURATION + 1000) / 1000}s`);
            backImgEl.classList.add("kb-play");
          }

          preload(IMAGES[(next + 1) % IMAGES.length]);
          timerRef.current = setTimeout(doTransition, SLIDE_DURATION);
        },
      }
    );
  }, [preload]); // doTransition is stable; preload is stable

  /* ── Init ────────────────────────────────────────────────────── */
  useEffect(() => {
    mounted.current = true;

    gsap.set(slotA.current, { zIndex: 2, opacity: 1 });
    gsap.set(slotB.current, { zIndex: 1, opacity: 0 });

    preload(IMAGES[1]);
    timerRef.current = setTimeout(doTransition, SLIDE_DURATION);

    return () => {
      mounted.current = false;
      clearTimer();
      killAllTweens();
    };
  }, [doTransition, preload, clearTimer, killAllTweens]);

  /* ── Content entrance ────────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!mounted.current) return;
      gsap.to(
        [wordRef.current, tagRef.current, ctaRef.current].filter(Boolean),
        { opacity: 1, y: 0, duration: 1.3, ease: "power3.out", stagger: 0.2 }
      );
    }, 900);
    return () => clearTimeout(t);
  }, []);

  /* ── Light ray sweep ─────────────────────────────────────────── */
  useEffect(() => {
    const sweep = () => {
      if (!mounted.current || !rayRef.current) return;
      gsap.fromTo(
        rayRef.current,
        { x: "-120%", opacity: 0 },
        { x: "500%",  opacity: 1, duration: 5.5, ease: "power1.inOut" }
      );
    };
    const t  = setTimeout(sweep, 2200);
    const id = setInterval(sweep, 15000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);

  /* ── Jump to slide (dot click) ───────────────────────────────── */
  const jumpTo = useCallback((idx: number) => {
    if (!mounted.current || idx === curIdx.current || inTrans.current) return;
    clearTimer();

    const isAFront  = frontIsA.current;
    const backImg   = isAFront ? imgB.current  : imgA.current;
    const backSlot  = isAFront ? slotB.current : slotA.current;
    const frontSlot = isAFront ? slotA.current : slotB.current;

    if (!frontSlot || !backSlot || !backImg) return;
    inTrans.current = true;

    backImg.src = IMAGES[idx];
    gsap.set(backSlot, { zIndex: 3 });

    gsap.fromTo(backSlot,
      { opacity: 0 },
      {
        opacity: 1,
        duration: FADE_DURATION,
        ease: "sine.inOut",
        onComplete() {
          if (!mounted.current) return;

          gsap.set(frontSlot, { zIndex: 1, opacity: 0 });
          frontIsA.current = !isAFront;
          curIdx.current   = idx;
          inTrans.current  = false;
          setActiveIdx(idx);

          preload(IMAGES[(idx + 1) % IMAGES.length]);
          timerRef.current = setTimeout(doTransition, SLIDE_DURATION);
        },
      }
    );
  }, [clearTimer, doTransition, preload]);

  return (
    <>
      <style>{CSS}</style>

      <div className="myla-hero">

        {/* Slot A */}
        <div ref={slotA} className="myla-slot" style={{ zIndex: 2, opacity: 1 }}>
          <img ref={imgA} src={IMAGES[0]} alt="" draggable={false} />
        </div>

        {/* Slot B */}
        <div ref={slotB} className="myla-slot" style={{ zIndex: 1, opacity: 0 }}>
          <img ref={imgB} src={IMAGES[1]} alt="" draggable={false} />
        </div>

        {/* Shimmer */}
        <div ref={shimRef} className="myla-shimmer" style={{ opacity: 0 }} />

        {/* Depth */}
        <div className="myla-vignette" />
        <div className="myla-grad-top" />
        <div className="myla-grad-btm" />

        {/* Ray */}
        <div ref={rayRef} className="myla-ray" />

        {/* Content */}
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

        {/* Progress dots — click to jump to any slide */}
        <div className="myla-dots">
          {IMAGES.map((_, i) => (
            <div
              key={i}
              className={`myla-dot${activeIdx === i ? " active" : ""}`}
              onClick={() => jumpTo(i)}
            >
              <div
                className={`myla-dot-fill${activeIdx === i ? " running" : ""}`}
                style={{ "--dot-dur": `${SLIDE_DURATION / 1000}s` } as React.CSSProperties}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
