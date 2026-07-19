import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

function isProductDetail(path: string) {
  return /^\/products\/[^/]+$/.test(path);
}

export function PageTransition() {
  const [location] = useLocation();
  const prevLocation = useRef(location);
  const firstRender = useRef(true);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const from = prevLocation.current;
    const to = location;
    prevLocation.current = to;

    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (from === to) return;
    if (isProductDetail(from) && isProductDetail(to)) return;

    setVisible(true);
  }, [location]);

  useEffect(() => {
    if (!visible) return;

    const video = videoRef.current;
    const hardCap = setTimeout(() => setVisible(false), 8000);

    // Cancel any previous reverse RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const playReverse = () => {
      const v = videoRef.current;
      if (!v) { clearTimeout(hardCap); setVisible(false); return; }

      // Step size: move back ~1 frame at ~60fps per RAF call
      const STEP = 1 / 49; // slightly less than 1/60 for smooth feel

      const tick = () => {
        const nv = videoRef.current;
        if (!nv) { clearTimeout(hardCap); setVisible(false); return; }

        nv.currentTime = Math.max(0, nv.currentTime - STEP);

        if (nv.currentTime <= 0) {
          // Reverse done — fade out overlay
          clearTimeout(hardCap);
          setVisible(false);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const onEnded = () => {
      // Forward playback finished — start reverse
      playReverse();
    };

    const onError = () => { clearTimeout(hardCap); setVisible(false); };

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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (video) {
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("error", onError);
        video.pause();
      }
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="page-transition"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: "#F2EDE4" }}
          data-testid="page-transition-overlay"
        >
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            className="max-h-[60vh] max-w-[80vw] object-contain"
          >
            <source src="/page-transition.webm" type="video/webm" />
            <source src="/page-transition.mp4" type="video/mp4" />
          </video>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
