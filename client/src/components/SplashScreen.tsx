import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [done, setDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) { onFinish(); return; }

    const finish = () => {
      setDone(true);
      setTimeout(onFinish, 600);
    };

    const hardCap = setTimeout(finish, 15000);

    video.addEventListener("ended", () => { clearTimeout(hardCap); finish(); });
    video.addEventListener("error", () => { clearTimeout(hardCap); finish(); });

    video.play().catch(() => { clearTimeout(hardCap); finish(); });

    return () => clearTimeout(hardCap);
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-white overflow-hidden"
        >
          <video
            ref={videoRef}
            src="/myla-splash.mov"
            muted
            playsInline
            autoPlay
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
