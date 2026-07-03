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

  // useLayoutEffect fires synchronously before the browser paints the new
  // page, so the overlay covers the screen before any flash of the
  // destination page content is visible.
  useLayoutEffect(() => {
    const from = prevLocation.current;
    const to = location;
    prevLocation.current = to;

    // Don't play on the very first page load.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (from === to) return;
    // "Not between products" — skip the transition when moving from one
    // product page to another product page.
    if (isProductDetail(from) && isProductDetail(to)) return;

    setVisible(true);
  }, [location]);

  useEffect(() => {
    if (!visible) return;
    const video = videoRef.current;
    const hardCap = setTimeout(() => setVisible(false), 4000);

    const finish = () => setVisible(false);
    if (video) {
      video.currentTime = 0;
      video.playbackRate = 2;
      video.addEventListener("ended", finish);
      video.addEventListener("error", finish);
      video.play().catch(finish);
    } else {
      finish();
    }

    return () => {
      clearTimeout(hardCap);
      if (video) {
        video.removeEventListener("ended", finish);
        video.removeEventListener("error", finish);
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
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#EEEEEC]"
          data-testid="page-transition-overlay"
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
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
