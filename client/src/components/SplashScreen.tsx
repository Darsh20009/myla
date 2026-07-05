import { useEffect, useRef } from "react";

const SPLASH_CSS = `
  @font-face {
    font-family: 'Great Vibes';
    src: url('https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlCZA.woff2') format('woff2');
    font-display: block;
  }

  .myla-splash-root {
    position: fixed; inset: 0; z-index: 9999;
    background: #FAF8F5;
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

  /* The title is built from individual letter spans */
  .myla-splash-title {
    font-family: 'Great Vibes', cursive;
    font-size: clamp(64px, 14vw, 110px);
    color: #6B3F2A;
    line-height: 1;
    letter-spacing: 0.01em;
    white-space: nowrap;
    display: inline-flex;
  }

  /* Each letter starts invisible and slides in */
  .myla-splash-letter {
    display: inline-block;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.32s ease, transform 0.32s ease;
  }
  .myla-splash-letter.show {
    opacity: 1;
    transform: translateY(0);
  }

  /* Rule + sub lines fade in after letters */
  .myla-splash-rule {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
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
    color: #8B6F5E;
    letter-spacing: 0.35em;
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
    color: #B0A090;
    letter-spacing: 0.5em;
    text-transform: uppercase;
    text-align: center;
    margin-top: 3px;
    opacity: 0;
    transition: opacity 0.5s ease;
  }
  .myla-splash-sub-city.show { opacity: 1; }
`;

const WORD = "Myla";

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const rootRef  = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const ruleRef  = useRef<HTMLDivElement>(null);
  const subRef   = useRef<HTMLSpanElement>(null);
  const cityRef  = useRef<HTMLSpanElement>(null);
  const letRefs  = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const failsafe = setTimeout(onFinish, 7_000);
    let cancelled = false;

    const delay = (ms: number) =>
      new Promise<void>(r => setTimeout(r, ms));

    async function run() {
      // 1. Wait for font so no flash
      try { await document.fonts.load("1em 'Great Vibes'"); } catch {}
      if (cancelled) return;

      // 2. Make container visible
      wrapRef.current?.classList.add("ready");

      // 3. Reveal each letter from right to left (a → l → y → M)
      for (let i = letRefs.current.length - 1; i >= 0; i--) {
        if (cancelled) return;
        letRefs.current[i]?.classList.add("show");
        await delay(120);
      }

      // 4. Fade in rule + subtitle
      if (cancelled) return;
      ruleRef.current?.classList.add("show");
      await delay(80);
      subRef.current?.classList.add("show");
      await delay(80);
      cityRef.current?.classList.add("show");

      // 5. Hold
      await delay(1_600);
      if (cancelled) return;

      // 6. Fade out whole splash
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

          {/* Title — each letter is its own span */}
          <span className="myla-splash-title">
            {WORD.split("").map((ch, i) => (
              <span
                key={i}
                className="myla-splash-letter"
                ref={el => { letRefs.current[i] = el; }}
              >
                {ch}
              </span>
            ))}
          </span>

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
