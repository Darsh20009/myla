import { useEffect, useRef, useState } from "react";
import { useMapKit } from "@/hooks/use-mapkit";
import { MapPin } from "lucide-react";

interface AppleMapEmbedProps {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
  zoom?: number;
}

export function AppleMapEmbed({ lat, lng, label = "", height = 200, zoom = 15 }: AppleMapEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const { ready, error } = useMapKit();
  const [initError, setInitError] = useState<string | null>(null);

  // Normalize zoom to a safe positive finite value
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 15;

  // Validate coordinates
  const coordsValid =
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    if (!coordsValid) return;

    const mk = window.mapkit;
    // Guard: mapkit object might not be fully attached despite ready=true
    // (race condition on mobile / slow connections). Retry after a short delay.
    if (!mk || !mk.Coordinate) {
      const retryTimer = setTimeout(() => {
        // Force re-run by doing nothing — the effect will re-check on next render.
        // Parent re-renders when ready toggles, so mapRef stays null until then.
      }, 300);
      return () => clearTimeout(retryTimer);
    }

    try {
      const center = new mk.Coordinate(lat, lng);
      const spanDeg = 0.005 / safeZoom * 15;
      const region = new mk.CoordinateRegion(
        center,
        new mk.CoordinateSpan(spanDeg, spanDeg)
      );

      const map = new mk.Map(containerRef.current, {
        region,
        showsCompass: mk.FeatureVisibility.Hidden,
        showsZoomControl: false,
        showsMapTypeControl: false,
        isScrollEnabled: false,
        isZoomEnabled: false,
        isRotationEnabled: false,
      });

      const annotation = new mk.MarkerAnnotation(center, {
        title: label,
        color: "#E8637A",
        glyphColor: "#fff",
      });
      map.addAnnotation(annotation);
      mapRef.current = map;

      return () => {
        try { map.destroy(); } catch { /* ignore */ }
        mapRef.current = null;
      };
    } catch (e) {
      setInitError("فشل تحميل الخريطة");
    }
  }, [ready, lat, lng, label, safeZoom, coordsValid]);

  const showFallback = error || initError || !coordsValid;

  if (showFallback) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center bg-gray-100 rounded text-gray-400 gap-2 text-sm"
      >
        <MapPin className="w-5 h-5" />
        <span>{label || "الموقع"}</span>
      </div>
    );
  }

  if (!ready) {
    return (
      <div
        style={{ height }}
        className="bg-gray-100 rounded animate-pulse"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="rounded overflow-hidden"
    />
  );
}
