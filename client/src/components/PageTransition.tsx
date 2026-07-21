import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type Phase = "video" | "door";

function isProductDetail(path: string) {
  return /^\/products\/[^/]+$/.test(path);
}

// Elegant cubic-bezier for the door panels
const DOOR_EASE = [0.76, 0, 0.24, 1] as const;
const DOOR_DURATION = 0.72;

export function PageTransition() {
  const [location] = useLocation();
  const prevLocation = useRef(location);
  const firstRender = useRef(true);
  const [phase, setPhase] = useState<Phase | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const from = prevLocation.current;
    const to = location;
    prevLocation.current = to;

    if (firstRender.current) { firstRender.current = false; return; }
    if (from === to) return;
    if (isProductDetail(from) && isProductDetail(to)) return;

    setPhase("video");
  }, [location]);

  useEffect(() => {
    if (phase !== "video") return;

    const video = videoRef.current;
    const hardCap = setTimeout(() => setPhase(null), 10_000);

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // After ping-pong done → open the doors
    const openDoor = () => {
      clearTimeout(hardCap);
      setPhase("door");
    };

    // Reverse playback via RAF
    const playReverse = () => {
      const STEP = 1 / 49;
      const tick = () => {
        const v = videoRef.current;
        if (!v) { openDoor(); return; }
        v.currentTime = Math.max(0, v.currentTime - STEP);
        if (v.currentTime <= 0.001) { openDoor(); return; }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const onEnded = () => playReverse();
    const onError  = () => { clearTimeout(hardCap); setPhase(null); };

    if (video) {
      video.currentTime = 0;
      video.playbackRate = 1;
      video.addEventListener("ended", onEnded);
      video.addEventListener("error", onError);
      video.play().catch(onError);
    } else {
      onError();
    }

    return () => {
      clearTimeout(hardCap);
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (video) {
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("error", onError);
        video.pause();
      }
    };
  }, [phase]);

  const isDoor = phase === "door";

  return (
    <AnimatePresence>
      {phase !== null && (
        <div
          key="page-transition"
          className="fixed inset-0 z-[9999] overflow-hidden"
          data-testid="page-transition-overlay"
        >
          {/* ─── Left door panel ─── */}
          <motion.div
            className="absolute left-0 top-0 h-full w-1/2"
            style={{ backgroundColor: "#F6F2EA" }}
            initial={{ x: 0 }}
            animate={{ x: isDoor ? "-100%" : 0 }}
            transition={isDoor ? { duration: DOOR_DURATION, ease: DOOR_EASE } : { duration: 0 }}
            onAnimationComplete={() => { if (isDoor) setPhase(null); }}
          />

          {/* ─── Right door panel ─── */}
          <motion.div
            className="absolute right-0 top-0 h-full w-1/2"
            style={{ backgroundColor: "#F6F2EA" }}
            initial={{ x: 0 }}
            animate={{ x: isDoor ? "100%" : 0 }}
            transition={isDoor ? { duration: DOOR_DURATION, ease: DOOR_EASE } : { duration: 0 }}
          />

          {/* ─── Video — sits above both panels, fades as doors open ─── */}
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: "#F6F2EA" }}
            animate={
              isDoor
                ? { opacity: 0, scale: 0.88 }
                : { opacity: 1, scale: 1 }
            }
            transition={isDoor ? { duration: 0.28, ease: "easeIn" } : { duration: 0 }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="max-h-[60vh] max-w-[80vw] object-contain"
            >
              <source src="/page-transition.webm" type="video/webm" />
              <source src="/page-transition.mp4"  type="video/mp4"  />
            </video>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
