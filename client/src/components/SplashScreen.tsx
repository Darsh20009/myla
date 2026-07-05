import { useEffect, useRef } from "react";
import gsap from "gsap";

const SPLASH_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

  .myla-splash-root {
    position: fixed; inset: 0; z-index: 9999;
    background: #281408;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    overflow: hidden;
    will-change: opacity;
  }
  .myla-splash-wrap {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0;
    opacity: 0;
    transform: scale(0.97);
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
    const failsafe = setTimeout(onFinish, 8_000);

    const tl = gsap.timeline({
      onComplete() {
        clearTimeout(failsafe);
        onFinish();
      },
    });

    tl.to(wrapRef.current, {
      opacity: 1,
      scale: 1,
      duration: 1.0,
      ease: "power2.out",
    });

    tl.to({}, { duration: 1.4 });

    tl.to(rootRef.current, {
      opacity: 0,
      duration: 0.7,
      ease: "power2.inOut",
    });

    return () => {
      tl.kill();
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
