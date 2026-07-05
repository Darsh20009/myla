import { useEffect, useRef } from "react";
import gsap from "gsap";

const SPLASH_CSS = `
  .myla-splash-root {
    position: fixed; inset: 0; z-index: 9999;
    background: #281408;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    overflow: hidden;
    will-change: opacity;
  }
  .myla-splash-logo-wrap {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transform: scale(1.02);
  }
  .myla-splash-logo {
    /* fill the shorter dimension so the logo is centered with matching bg */
    width: min(100vw, 100vh);
    height: min(100vw, 100vh);
    object-fit: cover;
    object-position: center;
  }
`;

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const rootRef  = useRef<HTMLDivElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* ── Failsafe: always call onFinish after 8s max ── */
    const failsafe = setTimeout(onFinish, 8_000);

    const tl = gsap.timeline({
      onComplete() {
        clearTimeout(failsafe);
        onFinish();
      },
    });

    /* Fade + scale in */
    tl.to(wrapRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.9,
      ease: "power2.out",
    });

    /* Hold */
    tl.to({}, { duration: 1.2 });

    /* Fade out */
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
        <div ref={wrapRef} className="myla-splash-logo-wrap">
          <img
            src="/myla-logo.png"
            alt="Myla"
            className="myla-splash-logo"
          />
        </div>
      </div>
    </>
  );
}
