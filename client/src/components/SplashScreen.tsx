import { useEffect, useRef } from "react";

const SPLASH_CSS = `
  .myla-splash-root {
    position: fixed; inset: 0; z-index: 9999;
    background: #0E0A07;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    overflow: hidden;
  }

  .myla-splash-wrap {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0;
    visibility: hidden;
  }
  .myla-splash-wrap.ready {
    visibility: visible;
  }

  /* Logo image animates in */
  .myla-splash-logo {
    width: clamp(160px, 38vw, 280px);
    height: auto;
    opacity: 0;
    transform: scale(0.94);
    transition: opacity 0.55s ease, transform 0.55s ease;
    display: block;
  }
  .myla-splash-logo.show {
    opacity: 1;
    transform: scale(1);
  }

  /* Rule + sub lines fade in after logo */
  .myla-splash-rule {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    margin-bottom: 10px;
    width: 100%;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .myla-splash-rule.show { opacity: 1; }

  .myla-splash-rule-line {
    flex: 1;
    max-width: 80px;
    height: 1px;
    background: linear-gradient(to right, transparent, #C9A88260, #C9A882, #C9A88260, transparent);
  }
  .myla-splash-diamond {
    width: 5px; height: 5px;
    background: #C9A882;
    transform: rotate(45deg);
    opacity: 0.6;
    flex-shrink: 0;
  }

  .myla-splash-sub {
    font-family: 'Alexandria', sans-serif;
    font-size: clamp(8px, 1.6vw, 11px);
    font-weight: 300;
    color: rgba(255,255,255,0.55);
    letter-spacing: 0.38em;
    text-transform: uppercase;
    text-align: center;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .myla-splash-sub.show { opacity: 1; }

  .myla-splash-sub-city {
    font-family: 'Alexandria', sans-serif;
    font-size: clamp(6px, 1.1vw, 8px);
    font-weight: 300;
    color: rgba(255,255,255,0.30);
    letter-spacing: 0.5em;
    text-transform: uppercase;
    text-align: center;
    margin-top: 3px;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .myla-splash-sub-city.show { opacity: 1; }
`;

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const rootRef  = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const logoRef  = useRef<HTMLImageElement>(null);
  const ruleRef  = useRef<HTMLDivElement>(null);
  const subRef   = useRef<HTMLSpanElement>(null);
  const cityRef  = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const failsafe = setTimeout(onFinish, 6_000);
    let cancelled = false;

    const delay = (ms: number) =>
      new Promise<void>(r => setTimeout(r, ms));

    async function run() {
      if (cancelled) return;

      // Make container visible
      wrapRef.current?.classList.add("ready");

      // Small breath before animation
      await delay(80);
      if (cancelled) return;

      // 1. Logo fades in
      logoRef.current?.classList.add("show");
      await delay(420);
      if (cancelled) return;

      // 2. Rule + subtitle
      ruleRef.current?.classList.add("show");
      await delay(80);
      subRef.current?.classList.add("show");
      await delay(80);
      cityRef.current?.classList.add("show");

      // 3. Hold
      await delay(900);
      if (cancelled) return;

      // 4. Fade out whole splash
      const root = rootRef.current;
      if (!root) { clearTimeout(failsafe); onFinish(); return; }
      root.style.transition = "opacity 0.45s ease";
      root.style.opacity = "0";
      root.addEventListener("transitionend", () => {
        clearTimeout(failsafe); onFinish();
      }, { once: true });
      setTimeout(() => { clearTimeout(failsafe); onFinish(); }, 600);
    }

    run();

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{SPLASH_CSS}</style>
      <div ref={rootRef} className="myla-splash-root">
        <div ref={wrapRef} className="myla-splash-wrap">

          {/* Logo image — transparent header version */}
          <img
            ref={logoRef}
            src="/myla-logo-header.png"
            alt="Myla"
            className="myla-splash-logo"
            draggable={false}
          />

          <div ref={ruleRef} className="myla-splash-rule">
            <div className="myla-splash-rule-line" />
            <div className="myla-splash-diamond" />
            <div className="myla-splash-rule-line" />
          </div>

          <span ref={subRef}  className="myla-splash-sub">Abayas by HMBL</span>
          <span ref={cityRef} className="myla-splash-sub-city">Riyadh</span>
        </div>
      </div>
    </>
  );
}
