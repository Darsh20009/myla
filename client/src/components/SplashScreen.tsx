import { useEffect, useRef } from "react";
import gsap from "gsap";

/* ─── Letter Path Data ───────────────────────────────────────────── */
const LETTERS = [
  { id: "M", draw: "M 20,108 L 20,22 L 78,68 L 136,22 L 136,108" },
  { id: "Y", draw: "M 162,22 L 212,65 L 212,108 M 262,22 L 212,65" },
  { id: "L", draw: "M 288,22 L 288,108 L 372,108" },
  { id: "A", draw: "M 397,108 L 460,22 L 523,108 M 418,76 L 502,76" },
];

const SPLASH_CSS = `
  .myla-splash-root {
    position: fixed; inset: 0; z-index: 9999;
    background: #EEEEEC;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    overflow: hidden;
    will-change: opacity;
  }
  .myla-splash-svg-wrap {
    width: min(88vw, 540px);
    position: relative;
    user-select: none;
  }
  .myla-sweep-ray {
    position: absolute; top: -30%; left: 0;
    width: 35%; height: 160%;
    background: linear-gradient(
      105deg,
      transparent 0%,
      rgba(201,168,130,0.08) 35%,
      rgba(255,255,255,0.28) 50%,
      rgba(201,168,130,0.08) 65%,
      transparent 100%
    );
    pointer-events: none;
    transform: translateX(-120%);
    will-change: transform;
  }
  .myla-splash-tagline {
    position: absolute; bottom: 10%;
    font-size: 0.58rem; letter-spacing: 0.42em;
    color: #B8A88A; text-transform: uppercase;
    font-family: 'Georgia','Didot',serif;
    opacity: 0;
  }
`;

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const rootRef  = useRef<HTMLDivElement>(null);
  const svgRef   = useRef<SVGSVGElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const tagRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* ── Failsafe: always call onFinish after 20s max ── */
    const failsafe = setTimeout(onFinish, 20_000);

    const svg = svgRef.current;
    if (!svg) {
      clearTimeout(failsafe);
      onFinish();
      return;
    }

    /* ── Collect SVG elements ─────────────────────────── */
    const sel = <T extends SVGElement>(id: string) =>
      svg.querySelector<T>(`#${id}`) ?? null;

    const drawEls   = LETTERS.map(l => sel<SVGPathElement>(`draw-${l.id}`));
    const sewEls    = LETTERS.map(l => sel<SVGPathElement>(`sew-${l.id}`));
    const fillEls   = LETTERS.map(l => sel<SVGPathElement>(`fill-${l.id}`));
    const needleEls = LETTERS.map(l => sel<SVGCircleElement>(`needle-${l.id}`));
    const connectEl = sel<SVGPathElement>("connect-line");

    /* If elements missing (e.g. SSR edge case), bail fast */
    if (!drawEls[0]) {
      clearTimeout(failsafe);
      onFinish();
      return;
    }

    /* ── Measure & init ──────────────────────────────── */
    const drawLens = drawEls.map(p => p?.getTotalLength() ?? 0);
    const sewLens  = sewEls.map(p => p?.getTotalLength() ?? 0);
    const conLen   = connectEl?.getTotalLength() ?? 0;

    drawEls.forEach((p, i) => {
      if (!p) return;
      p.style.strokeDasharray  = `${drawLens[i]}`;
      p.style.strokeDashoffset = `${drawLens[i]}`;
      p.style.opacity = "0";
    });
    sewEls.forEach((p, i) => {
      if (!p) return;
      p.style.strokeDasharray  = `${sewLens[i]}`;
      p.style.strokeDashoffset = `${sewLens[i]}`;
      p.style.opacity = "0";
    });
    fillEls.forEach(p => { if (p) p.style.opacity = "0"; });
    needleEls.forEach(n => { if (n) n.style.opacity = "0"; });
    if (connectEl) {
      connectEl.style.strokeDasharray  = `${conLen}`;
      connectEl.style.strokeDashoffset = `${conLen}`;
      connectEl.style.opacity = "0";
    }

    /* ── Master timeline ─────────────────────────────── */
    const tl = gsap.timeline({
      delay: 0.3,
      onComplete() {
        clearTimeout(failsafe);
        onFinish();
      },
    });
    tl.timeScale(6);

    /* Per-letter sequence */
    LETTERS.forEach((_, idx) => {
      const dp = drawEls[idx];
      const sp = sewEls[idx];
      const fp = fillEls[idx];
      const nd = needleEls[idx];
      const dL = drawLens[idx];
      const sL = sewLens[idx];

      if (!dp || !dL) return;

      /* Show draw path + needle */
      tl.set(dp, { opacity: 1 });
      if (nd) tl.set(nd, { opacity: 1 });

      /* Draw the letter */
      const drawProxy = { v: dL };
      tl.to(drawProxy, {
        v: 0,
        duration: 1.5,
        ease: "power1.inOut",
        onUpdate() {
          dp.style.strokeDashoffset = `${drawProxy.v}`;
          if (nd) {
            try {
              const pt = dp.getPointAtLength(dL - drawProxy.v);
              nd.setAttribute("cx", `${pt.x}`);
              nd.setAttribute("cy", `${pt.y}`);
            } catch (_) { /* ignore */ }
          }
        },
        onComplete() {
          if (nd) nd.style.opacity = "0";
        },
      }, ">");

      /* Sewing thread follows draw (starts 0.8s into draw) */
      if (sp && sL) {
        tl.set(sp, { opacity: 1 }, `-=0.8`);
        const sewProxy = { v: sL };
        tl.to(sewProxy, {
          v: 0,
          duration: 1.0,
          ease: "none",
          onUpdate() { sp.style.strokeDashoffset = `${sewProxy.v}`; },
        }, "<");
      }

      /* Fabric fill fades in after sewing */
      if (fp) {
        tl.to(fp, { opacity: 1, duration: 0.5, ease: "power2.out" }, "+=0.05");
      }

      /* Brief gap before next letter */
      tl.to({}, { duration: 0.15 });
    });

    /* ── Connecting thread ───────────────────────────── */
    if (connectEl && conLen) {
      tl.set(connectEl, { opacity: 1 });
      const conProxy = { v: conLen };
      tl.to(conProxy, {
        v: 0,
        duration: 1.3,
        ease: "power2.inOut",
        onUpdate() { connectEl.style.strokeDashoffset = `${conProxy.v}`; },
      });
      tl.to(connectEl, { opacity: 0, duration: 0.4, ease: "power2.in" }, "+=0.15");
    }

    /* ── Light sweep ─────────────────────────────────── */
    if (sweepRef.current) {
      tl.fromTo(sweepRef.current,
        { x: "-120%", opacity: 0 },
        { x: "260%",  opacity: 1, duration: 1.0, ease: "power2.inOut" }
      );
    }

    /* ── Tagline ─────────────────────────────────────── */
    if (tagRef.current) {
      tl.to(tagRef.current, { opacity: 1, duration: 0.5 }, "-=0.3");
    }

    /* ── Hold then fade out ──────────────────────────── */
    tl.to({}, { duration: 0.8 });
    tl.to(rootRef.current, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.inOut",
    });

    /* Cleanup: kill timeline on unmount (handles React strict-mode double-fire) */
    return () => {
      tl.kill();
      clearTimeout(failsafe);
    };
  /* Re-run is safe: gsap.kill() handles cleanup. onFinish is stable from parent. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{SPLASH_CSS}</style>
      <div ref={rootRef} className="myla-splash-root">

        <div className="myla-splash-svg-wrap">
          <svg
            ref={svgRef}
            viewBox="0 0 548 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", overflow: "visible" }}
          >
            {/* ═══ M ═══ */}
            <path id="fill-M"
              d="M 20,108 L 20,22 L 78,68 L 136,22 L 136,108"
              stroke="#1A0E08" strokeWidth="9" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
            <path id="draw-M"
              d="M 20,108 L 20,22 L 78,68 L 136,22 L 136,108"
              stroke="#1A0E08" strokeWidth="2.2" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
            <path id="sew-M"
              d="M 20,108 L 20,22 L 78,68 L 136,22 L 136,108"
              stroke="#C9A882" strokeWidth="1" strokeDasharray="3 8"
              strokeLinecap="round" fill="none"
            />
            <circle id="needle-M" cx="20" cy="108" r="3" fill="#C9A882" />

            {/* ═══ Y ═══ */}
            <path id="fill-Y"
              d="M 162,22 L 212,65 L 212,108 M 262,22 L 212,65"
              stroke="#1A0E08" strokeWidth="9" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
            <path id="draw-Y"
              d="M 162,22 L 212,65 L 212,108 M 262,22 L 212,65"
              stroke="#1A0E08" strokeWidth="2.2" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
            <path id="sew-Y"
              d="M 162,22 L 212,65 L 212,108 M 262,22 L 212,65"
              stroke="#C9A882" strokeWidth="1" strokeDasharray="3 8"
              strokeLinecap="round" fill="none"
            />
            <circle id="needle-Y" cx="162" cy="22" r="3" fill="#C9A882" />

            {/* ═══ L ═══ */}
            <path id="fill-L"
              d="M 288,22 L 288,108 L 372,108"
              stroke="#1A0E08" strokeWidth="9" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
            <path id="draw-L"
              d="M 288,22 L 288,108 L 372,108"
              stroke="#1A0E08" strokeWidth="2.2" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
            <path id="sew-L"
              d="M 288,22 L 288,108 L 372,108"
              stroke="#C9A882" strokeWidth="1" strokeDasharray="3 8"
              strokeLinecap="round" fill="none"
            />
            <circle id="needle-L" cx="288" cy="22" r="3" fill="#C9A882" />

            {/* ═══ A ═══ */}
            <path id="fill-A"
              d="M 397,108 L 460,22 L 523,108 M 418,76 L 502,76"
              stroke="#1A0E08" strokeWidth="9" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
            <path id="draw-A"
              d="M 397,108 L 460,22 L 523,108 M 418,76 L 502,76"
              stroke="#1A0E08" strokeWidth="2.2" strokeLinecap="round"
              strokeLinejoin="round" fill="none"
            />
            <path id="sew-A"
              d="M 397,108 L 460,22 L 523,108 M 418,76 L 502,76"
              stroke="#C9A882" strokeWidth="1" strokeDasharray="3 8"
              strokeLinecap="round" fill="none"
            />
            <circle id="needle-A" cx="397" cy="108" r="3" fill="#C9A882" />

            {/* ═══ Connecting thread ═══ */}
            <path id="connect-line"
              d="M 18,120 Q 78,130 155,120 Q 222,112 288,120 Q 332,128 397,120 Q 458,112 525,120"
              stroke="#C9A882" strokeWidth="0.8" fill="none"
              strokeDasharray="4 9" strokeLinecap="round"
            />
          </svg>

          <div ref={sweepRef} className="myla-sweep-ray" />
        </div>

        <div ref={tagRef} className="myla-splash-tagline">Luxury Abayas</div>
      </div>
    </>
  );
}
