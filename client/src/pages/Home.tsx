import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();

  return (
    <Layout hideFooter>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO — full-screen landing section
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ background: "linear-gradient(to bottom, #1A0E08 0%, #5a3422 15%, #826555 40%, #826555 72%, #FAF7F2 100%)" }}>
        {/* ── Video ── */}
        <div style={{ width: "100%", background: "transparent", display: "flex", justifyContent: "center", overflow: "hidden" }}>
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{ display: "block", maxHeight: "100svh", width: "auto", maxWidth: "100%" }}
            src="/hero-video.mov"
          />
        </div>

        {/* ── Content below video ── */}
        <div
          style={{ background: "transparent" }}
          className="flex flex-col items-center text-center px-6 py-10 md:py-14"
        >
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            style={{ color: "#C9A882", marginTop: "16px", marginBottom: "32px", fontSize: "0.875rem" }}
          >
            {isRtl ? "عبايات أنيقة، قصّات مريحة وأقمشة ستعشقينها" : "Elegant abayas, comfortable cuts & fabrics you'll fall in love with"}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/products">
              <button
                data-testid="button-start-shopping"
                className="px-10 py-4 text-sm font-bold uppercase transition-all duration-300 active:scale-95 hover:opacity-90"
                style={{ background: "#C9A882", color: "#1A0E08" }}
              >
                {isRtl ? "ابدأ التسوق" : "Shop Now"}
              </button>
            </Link>
            {!user && (
              <Link href="/login">
                <button
                  data-testid="button-sign-in-hero"
                  className="px-10 py-4 text-sm font-bold uppercase border transition-all duration-300 active:scale-95"
                  style={{ borderColor: "#C9A882", color: "#C9A882" }}
                >
                  {isRtl ? "تسجيل الدخول" : "Sign In"}
                </button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
