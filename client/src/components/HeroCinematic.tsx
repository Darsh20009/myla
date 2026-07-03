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

const SLIDE_DURATION = 6500;         // ms each image holds
const TRANS_DURATION  = 1.7;         // seconds for the crossfade

/* ─── CSS ────────────────────────────────────────────────────────── */
const HERO_CSS = `
  .myla-hero {
    position: relative;
    width: 100%;
    height: 100svh;
    overflow: hidden;
    background: #0E0A07;
  }

  /* ── Image slide ── */
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
    will-change: transform;
    transform-origin: center center;
  }

  /* ── Ken Burns variants ── */
  @keyframes kb0 { from { transform: scale(1.08) translate(0%,    0%);   } to { transform: scale(1.16) translate(-1.2%, 0.8%);  } }
  @keyframes kb1 { from { transform: scale(1.07) translate(0.5%, -0.3%); } to { transform: scale(1.15) translate(-0.5%, 1.2%);  } }
  @keyframes kb2 { from { transform: scale(1.09) translate(-0.8%, 0.4%); } to { transform: scale(1.17) translate(0.6%, -0.9%);  } }
  @keyframes kb3 { from { transform: scale(1.06) translate(1%,   0.2%);  } to { transform: scale(1.14) translate(-0.4%, 0.7%);  } }

  /* ── Subtle breathing (layered on Ken Burns) ── */
  @keyframes breathe {
    0%, 100% { filter: brightness(1);    }
    50%       { filter: brightness(1.03); }
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

  /* ── Sound toggle ── */
  .myla-sound {
    position: absolute; bottom: 2rem; right: 1.8rem; z-index: 12;
    width: 2.2rem; height: 2.2rem; border-radius: 50%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(201,168,130,0.28);
    color: #C9A882; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(6px);
    transition: background 0.3s;
  }
  .myla-sound:hover { background: rgba(201,168,130,0.14); }

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
  const [curIdx, setCurIdx]   = useState(0);
  const [nxtIdx, setNxtIdx]   = useState(1);
  const [muted, setMuted]     = useState(true);

  const curSlideRef = useRef<HTMLDivElement>(null);
  const rayRef   = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wordRef  = useRef<HTMLDivElement>(null);
  const tagRef   = useRef<HTMLDivElement>(null);
  const ctaRef   = useRef<HTMLDivElement>(null);

  const inTransRef  = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout>>();
  const lightIntRef = useRef<ReturnType<typeof setInterval>>();

  /* ── Content entrance ───────────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => {
      const els = [wordRef.current, tagRef.current, ctaRef.current].filter(Boolean);
      gsap.to(els, { opacity: 1, y: 0, duration: 1.3, ease: "power3.out", stagger: 0.2 });
    }, 900);
    return () => clearTimeout(t);
  }, []);

  /* ── Audio ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0;
    audio.loop = true;
    const t = setTimeout(() => {
      audio.play().then(() => {
        gsap.to(audio, { volume: 0.1, duration: 3, ease: "power1.out" });
      }).catch(() => {/* autoplay blocked; user can click the sound btn */});
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  /* ── Repeating light ray ────────────────────────────────────────── */
  useEffect(() => {
    const sweep = () => {
      if (!rayRef.current) return;
      gsap.fromTo(rayRef.current,
        { x: "-120%", opacity: 0 },
        { x: "500%", opacity: 1, duration: 5, ease: "power1.inOut" }
      );
    };
    sweep();
    lightIntRef.current = setInterval(sweep, 13000);
    return () => clearInterval(lightIntRef.current);
  }, []);

  /* ── Crossfade transition (dissolve, no cuts/wipes) ───────────────── */
  const doTransition = useCallback(() => {
    if (inTransRef.current) return;
    inTransRef.current = true;

    const curSlide = curSlideRef.current;
    const newN = (nxtIdx + 1) % HERO_IMAGES.length;

    if (!curSlide) {
      setCurIdx(nxtIdx);
      setNxtIdx(newN);
      inTransRef.current = false;
      return;
    }

    /* The "next" image already sits behind the current one, so simply
       dissolving the front image's opacity to 0 blends the two together —
       a true crossfade rather than a hard slide cut. */
    gsap.to(curSlide, {
      opacity: 0,
      duration: TRANS_DURATION,
      ease: "sine.inOut",
      onComplete() {
        gsap.set(curSlide, { opacity: 1 });
        setCurIdx(nxtIdx);
        setNxtIdx(newN);
        inTransRef.current = false;
      },
    });
  }, [nxtIdx]);

  /* ── Advance timer ──────────────────────────────────────────────── */
  useEffect(() => {
    timerRef.current = setTimeout(doTransition, SLIDE_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [curIdx, doTransition]);

  /* ── Sound toggle ───────────────────────────────────────────────── */
  const toggleSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.play().catch(() => {});
      gsap.to(audio, { volume: 0.1, duration: 1 });
    } else {
      gsap.to(audio, { volume: 0, duration: 0.8, onComplete: () => audio.pause() });
    }
    setMuted(m => !m);
  };

  const kbAnim = (i: number) =>
    `kb${i % 4} ${(SLIDE_DURATION / 1000 + 1.5).toFixed(1)}s ease-in-out forwards, breathe 5s ease-in-out infinite`;

  return (
    <>
      <style>{HERO_CSS}</style>

      <div className="myla-hero">
        <audio ref={audioRef} src="/hero/ambient.mp3" preload="none" />

        {/* ── Current slide ── */}
        <div ref={curSlideRef} className="myla-slide" style={{ zIndex: 1 }}>
          <img
            key={`c${curIdx}`}
            src={HERO_IMAGES[curIdx]}
            alt=""
            className="myla-img"
            loading="eager"
            style={{ animation: kbAnim(curIdx) }}
          />
        </div>

        {/* ── Next slide (preloaded, sits behind — crossfades in as current fades out) ── */}
        <div className="myla-slide" style={{ zIndex: 0 }}>
          <img
            key={`n${nxtIdx}`}
            src={HERO_IMAGES[nxtIdx]}
            alt=""
            className="myla-img"
            loading="lazy"
            style={{ transform: "scale(1.08)" }}
          />
        </div>

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

        {/* ── Sound btn ── */}
        <button className="myla-sound" onClick={toggleSound} aria-label={muted ? "تشغيل" : "إيقاف"}>
          {muted ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          )}
        </button>

        {/* ── Slide dots (first 8) ── */}
        <div className="myla-dots">
          {HERO_IMAGES.slice(0, 8).map((_, i) => (
            <div key={i} className={`myla-dot${curIdx % 8 === i ? " active" : ""}`} />
          ))}
        </div>
      </div>
    </>
  );
}
