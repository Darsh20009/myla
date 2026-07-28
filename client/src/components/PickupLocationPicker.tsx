import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

export function PickupLocationPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const { toast } = useToast();

  const initLat = lat ?? DEFAULT_LAT;
  const initLng = lng ?? DEFAULT_LNG;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let L: any;
    import("leaflet").then((mod) => {
      L = mod.default ?? mod;

      // Fix default icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, { zoomControl: true }).setView(
        [initLat, initLng],
        14
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);

      marker.on("dragend", () => {
        const { lat: la, lng: lo } = marker.getLatLng();
        onChange(la, lo);
      });

      map.on("click", (e: any) => {
        const { lat: la, lng: lo } = e.latlng;
        marker.setLatLng([la, lo]);
        onChange(la, lo);
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes into the marker
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    if (lat == null || lng == null) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], mapRef.current.getZoom());
  }, [lat, lng]);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast({ title: "غير مدعوم", description: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        onChange(la, lo);
        if (markerRef.current) markerRef.current.setLatLng([la, lo]);
        if (mapRef.current) mapRef.current.setView([la, lo], 16);
        toast({ title: "✅ تم تحديد موقعك الحالي" });
      },
      () => {
        setLocating(false);
        toast({ title: "فشل تحديد الموقع", description: "تأكد من السماح بالوصول للموقع", variant: "destructive" });
      }
    );
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full rounded-lg border border-black/10 overflow-hidden"
        style={{ height: 280 }}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGeolocate}
          disabled={locating}
          className="text-xs font-black"
        >
          {locating ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Navigation className="h-3 w-3 ml-1" />}
          استخدام موقعي الحالي
        </Button>
        {lat != null && lng != null && (
          <span className="text-[11px] font-mono text-muted-foreground" dir="ltr">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground font-bold">
        انقر على الخريطة أو اسحب الدبوس لتحديد موقع الاستلام. هذا الموقع يُستخدم كعنوان المرسل في جميع شحنات المتجر.
      </p>
    </div>
  );
}
