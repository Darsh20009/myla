import { useEffect, useRef } from "react";

const SPLASH_CSS = `
  @font-face {
    font-family: 'Great Vibes';
    src: url('https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlCZA.woff2') format('woff2');
    font-display: block;
  }

  .myla-splash-root {
    position: fixed; inset: 0; z-index: 9999;
    background: #281408;
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
  .myla-splash-title {
    font-family: 'Great Vibes', cursive;
    font-size: clamp(64px, 14vw, 110px);
    color: #F5EDE3;
    line-height: 1;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }
  .myla-splash-rule {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    margin-bottom: 10px;
    width: 100%;
    justify-content: center;
  }
  .myla-splash-rule-line {
    flex: 1;
    max-width: 80px;
    height: 1px;
    background: linear-gradient(to right, transparent, #C9A88280, #C9A882, #C9A88280, transparent);
  }
  .myla-splash-diamond {
    width: 5px; height: 5px;
    background: #C9A882;
    transform: rotate(45deg);
    opacity: 0.8;
    flex-shrink: 0;
  }
  .myla-splash-sub {
    font-family: 'Alexandria', sans-serif;
    font-size: clamp(8px, 1.6vw, 11px);
    font-weight: 400;
    color: #C9A882;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    text-align: center;
  }
  .myla-splash-sub-city {
    font-family: 'Alexandria', sans-serif;
    font-size: clamp(6px, 1.1vw, 8px);
    font-weight: 300;
    color: #A08060;
    letter-spacing: 0.5em;
    text-transform: uppercase;
    text-align: center;
    margin-top: 3px;
  }
`;

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const failsafe = setTimeout(onFinish, 6_000);
    let cancelled = false;

    async function run() {
      // Wait for Great Vibes to load so there's no font flash
      try {
        await document.fonts.load("1em 'Great Vibes'");
      } catch {
        // font API not supported — just continue
      }

      if (cancelled) return;

      // Show text only after font is ready — no flash
      if (wrapRef.current) wrapRef.current.classList.add("ready");

      // Hold for 2 seconds, then fade out the whole splash
      await new Promise<void>(r => setTimeout(r, 2_000));
      if (cancelled) return;

      const root = rootRef.current;
      if (!root) { clearTimeout(failsafe); onFinish(); return; }

      root.style.transition = "opacity 0.5s ease";
      root.style.opacity = "0";

      root.addEventListener("transitionend", () => {
        clearTimeout(failsafe);
        onFinish();
      }, { once: true });

      // Fallback if transitionend doesn't fire
      setTimeout(() => { clearTimeout(failsafe); onFinish(); }, 700);
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
          <span className="myla-splash-title">Myla</span>
          <div className="myla-splash-rule">
            <div className="myla-splash-rule-line" />
            <div className="myla-splash-diamond" />
            <div className="myla-splash-rule-line" />
          </div>
          <span className="myla-splash-sub">Abayas by HMBL</span>
          <span className="myla-splash-sub-city">Riyadh</span>
        </div>
      </div>
    </>
  );
}
