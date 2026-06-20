import { useEffect, useRef, useState, useCallback } from "react";
import { getRealtimeEngine } from "@/lib/realtime-engine";

let _initDone = false;

function ensureConnected(subscribePayload?: object) {
  if (_initDone) return;
  _initDone = true;
  const engine = getRealtimeEngine(subscribePayload);
  if (!engine.connected) engine.connect(subscribePayload);
}

export function useRealtimeEvent<T = any>(
  event:   string,
  handler: (data: T) => void,
  subscribePayload?: object
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    ensureConnected(subscribePayload);
    const engine = getRealtimeEngine();
    const off = engine.on(event, (data: T) => handlerRef.current(data));
    return off;
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps
}

interface RealtimeStatus {
  connected:      boolean;
  reconnectCount: number;
}

export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>({ connected: false, reconnectCount: 0 });

  useEffect(() => {
    ensureConnected();
    const engine = getRealtimeEngine();
    const offConn = engine.on("_connected", () =>
      setStatus(prev => ({ connected: true, reconnectCount: prev.reconnectCount }))
    );
    const offDisc = engine.on("_disconnected", () =>
      setStatus(prev => ({ connected: false, reconnectCount: prev.reconnectCount + 1 }))
    );
    setStatus(prev => ({ ...prev, connected: engine.connected }));
    return () => { offConn(); offDisc(); };
  }, []);

  return status;
}

export function useRealtimeSend() {
  const send = useCallback((type: string, data: Record<string, any> = {}, requireAck = false) => {
    const engine = getRealtimeEngine();
    return engine.send(type, data, requireAck);
  }, []);
  return { send };
}
