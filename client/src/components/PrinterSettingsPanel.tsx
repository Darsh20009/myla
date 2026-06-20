import { useState, useEffect } from "react";
import {
  Printer, Usb, Network, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Trash2, TestTube2,
  Bluetooth, BluetoothConnected, BluetoothOff,
  Plus, ChevronUp, Edit2, PlugZap,
} from "lucide-react";
import {
  loadPrinterSettings,
  savePrinterSettings,
  isWebUSBSupported,
  requestUSBPrinter,
  reconnectSavedUSBPrinter,
  getSavedDeviceInfo,
  clearSavedDevice,
  getPrinterStatus,
  buildReceiptBitmapEscPos,
  thermalPrint,
  testNetworkPrinter,
  discoverNetworkPrinters,
  isBluetoothSupported,
  connectBluetoothPrinter,
  reconnectBluetoothPrinter,
  testBluetoothPrinter,
  forgetBluetoothPrinter,
  loadSavedBtDevice,
  getBluetoothState,
  isQZTrayAvailable,
  testRelayAgent,
  loadPrinterProfiles,
  savePrinterProfiles,
  testPrinterProfile,
  type PrinterSettings,
  type PrinterStatus,
  type PrinterProfile,
  type PrinterRole,
} from "@/lib/thermal-printer";

/* ── micro-components ───────────────────────────────────────────── */
function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center gap-2 ${className}`}>{children}</div>;
}
function Section({ title, icon: Icon, children, color = "#E8637A" }: {
  title: string; icon?: any; children: React.ReactNode; color?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/4 border-b border-white/5">
          {Icon && <Icon className="h-4 w-4" style={{ color }} />}
          <span className="font-black text-xs text-white/70 uppercase tracking-widest">{title}</span>
        </div>
      )}
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}
function Btn({ children, onClick, disabled, variant = "primary", className = "", testId = "" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "outline" | "danger" | "success" | "purple" | "violet";
  className?: string; testId?: string;
}) {
  const base = "flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl font-black text-xs transition-all active:scale-[0.97] disabled:opacity-40";
  const styles: Record<string, string> = {
    primary: "bg-[#E8637A]/15 border border-[#E8637A]/40 text-[#E8637A] hover:bg-[#E8637A]/25",
    outline: "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70",
    danger:  "bg-red-900/20 border border-red-500/30 text-red-400 hover:bg-red-900/30",
    success: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25",
    purple:  "bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25",
    violet:  "bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
function Toggle({ checked, onChange, testId = "" }: {
  checked: boolean; onChange: (v: boolean) => void; testId?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${checked ? "bg-[#E8637A]" : "bg-white/10"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${checked ? "right-0.5" : "left-0.5"}`} />
    </button>
  );
}
function Input({ value, onChange, placeholder = "", dir = "ltr", testId = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; dir?: "ltr" | "rtl"; testId?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      data-testid={testId}
      className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-[#E8637A]/50 transition-all placeholder:text-white/20"
    />
  );
}
function Select({ value, onChange, options, testId = "" }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testId?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      data-testid={testId}
      className="w-full h-9 rounded-xl bg-[#1a0f0a] border border-white/10 text-white text-xs px-3 outline-none focus:border-[#E8637A]/50 transition-all"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${ok ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-900/20 border border-red-500/20 text-red-400"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
      <span className="whitespace-pre-line">{text}</span>
    </div>
  );
}
function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 text-amber-300 text-[11px] font-bold leading-snug">
      {children}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function PrinterSettingsPanel() {
  const [settings, setSettings] = useState<PrinterSettings>(loadPrinterSettings);
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // USB
  const [connecting, setConnecting] = useState(false);
  // Network
  const [networkTesting, setNetworkTesting] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<{ ip: string; port: number }[]>([]);
  const [discoverProgress, setDiscoverProgress] = useState<string | null>(null);
  const [subnetHint, setSubnetHint] = useState<string>(() => {
    const saved = loadPrinterSettings().networkIp || '';
    const parts = saved.split('.');
    return parts.length === 4 ? parts.slice(0, 3).join('.') + '.' : '';
  });
  // Relay
  const [relayTesting, setRelayTesting] = useState(false);
  const [relayStatus, setRelayStatus] = useState<{ connected: boolean; message: string } | null>(null);
  // Bluetooth
  const [btConnecting, setBtConnecting] = useState(false);
  const [btReconnecting, setBtReconnecting] = useState(false);
  const [btTesting, setBtTesting] = useState(false);
  const [btStatus, setBtStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [btState, setBtState] = useState<{ connected: boolean; deviceName: string | null }>(() => getBluetoothState());
  const savedBtDevice = loadSavedBtDevice();
  // Test print
  const [testing, setTesting] = useState(false);
  // Multi-printer profiles
  const [profiles, setProfiles] = useState<PrinterProfile[]>(() => loadPrinterProfiles());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileTestStatus, setProfileTestStatus] = useState<Record<string, { connected: boolean; message: string } | 'testing'>>({});
  const [newProfile, setNewProfile] = useState<Omit<PrinterProfile, 'id'>>({
    name: '', role: 'all', enabled: true, mode: 'network',
    networkIp: '', networkPort: 9100, paperWidth: '80mm', relayAgentUrl: '',
  });

  useEffect(() => {
    refreshStatus();
    if (loadPrinterSettings().mode === 'bluetooth' && !getBluetoothState().connected) {
      reconnectBluetoothPrinter()
        .then(() => setBtState(getBluetoothState()))
        .catch(() => {});
    }
  }, []);

  async function refreshStatus() {
    setLoading(true);
    const s = await getPrinterStatus();
    setStatus(s);
    setSettings(s.settings);
    setLoading(false);
  }

  function updateSetting<K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) {
    const updated = savePrinterSettings({ [key]: value });
    setSettings(updated);
  }

  function saveProfilesState(updated: PrinterProfile[]) {
    savePrinterProfiles(updated);
    setProfiles(updated);
  }

  function addOrUpdateProfile() {
    if (!newProfile.name.trim() || !newProfile.networkIp.trim()) return;
    if (editingProfileId) {
      saveProfilesState(profiles.map(p => p.id === editingProfileId ? { ...newProfile, id: editingProfileId } : p));
      setEditingProfileId(null);
    } else {
      saveProfilesState([...profiles, { ...newProfile, id: Date.now().toString() }]);
    }
    setNewProfile({ name: '', role: 'all', enabled: true, mode: 'network', networkIp: '', networkPort: 9100, paperWidth: '80mm', relayAgentUrl: '' });
    setShowAddForm(false);
  }

  function startEditProfile(p: PrinterProfile) {
    setNewProfile({ name: p.name, role: p.role, enabled: p.enabled, mode: p.mode, networkIp: p.networkIp, networkPort: p.networkPort, paperWidth: p.paperWidth, relayAgentUrl: p.relayAgentUrl || '' });
    setEditingProfileId(p.id);
    setShowAddForm(true);
  }

  async function testProfile(p: PrinterProfile) {
    setProfileTestStatus(prev => ({ ...prev, [p.id]: 'testing' }));
    const result = await testPrinterProfile(p);
    setProfileTestStatus(prev => ({ ...prev, [p.id]: result }));
  }

  function normalizeSubnet(raw: string): string | undefined {
    const s = raw.trim();
    if (!s) return undefined;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.$/.test(s)) return s;
    const fullIp = s.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
    if (fullIp) return fullIp[1] + '.';
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)) return s + '.';
    return undefined;
  }

  async function handleConnectUSB() {
    if (!isWebUSBSupported()) return;
    setConnecting(true);
    try {
      const device = await requestUSBPrinter();
      if (device) { savePrinterSettings({ mode: 'webusb' }); await refreshStatus(); }
    } catch {}
    setConnecting(false);
  }

  async function handleDiscoverPrinters() {
    setDiscovering(true);
    setDiscoverProgress("جارٍ فحص الشبكة المحلية...");
    setDiscoveredPrinters([]);
    try {
      const port = settings.networkPort || 9100;
      const hint = normalizeSubnet(subnetHint);
      if (hint && subnetHint.trim() !== hint) setSubnetHint(hint);
      setDiscoverProgress(`فحص ${hint ? hint + '1-254' : 'الشبكة'} على المنفذ ${port}...`);
      const found = await discoverNetworkPrinters(port, 300, hint);
      setDiscoveredPrinters(found);
      if (found.length === 1) {
        updateSetting('networkIp', found[0].ip);
        updateSetting('networkPort', found[0].port);
      }
    } catch {}
    setDiscovering(false);
    setDiscoverProgress(null);
  }

  async function handleTestNetworkPrinter() {
    const ip = settings.networkIp?.trim();
    if (!ip) return;
    setNetworkTesting(true);
    setNetworkStatus(null);
    try {
      const result = await testNetworkPrinter(ip, settings.networkPort || 9100);
      setNetworkStatus(result);
    } catch {}
    setNetworkTesting(false);
  }

  async function handleTestRelayAgent() {
    const relayUrl = settings.relayAgentUrl?.trim();
    if (!relayUrl) return;
    setRelayTesting(true);
    setRelayStatus(null);
    try {
      const result = await testRelayAgent(relayUrl, settings.networkIp?.trim(), settings.networkPort || 9100);
      setRelayStatus(result);
    } catch {}
    setRelayTesting(false);
  }

  async function handleConnectBluetooth() {
    if (!isBluetoothSupported()) return;
    setBtConnecting(true);
    setBtStatus(null);
    try {
      const deviceName = await connectBluetoothPrinter();
      savePrinterSettings({ mode: 'bluetooth', bluetoothDeviceName: deviceName });
      setSettings(loadPrinterSettings());
      setBtState(getBluetoothState());
      setBtStatus({ connected: true, message: `✅ تم الاتصال بـ "${deviceName}"` });
    } catch (e: any) {
      setBtStatus({ connected: false, message: e?.message || "فشل الاتصال" });
    }
    setBtConnecting(false);
  }

  async function handleReconnectBluetooth() {
    setBtReconnecting(true);
    setBtStatus(null);
    try {
      const name = await reconnectBluetoothPrinter();
      setBtState(getBluetoothState());
      setBtStatus({ connected: true, message: `✅ تم إعادة الاتصال بـ "${name}"` });
    } catch (e: any) {
      setBtStatus({ connected: false, message: e?.message || "فشل إعادة الاتصال" });
    }
    setBtReconnecting(false);
  }

  async function handleTestBluetooth() {
    setBtTesting(true);
    setBtStatus(null);
    try {
      const result = await testBluetoothPrinter();
      setBtStatus(result);
    } catch {}
    setBtTesting(false);
  }

  function handleForgetBluetooth() {
    forgetBluetoothPrinter();
    savePrinterSettings({ mode: 'browser', bluetoothDeviceName: undefined, bluetoothDeviceId: undefined });
    setSettings(loadPrinterSettings());
    setBtState({ connected: false, deviceName: null });
    setBtStatus(null);
  }

  async function handleTestPrint() {
    setTesting(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const pw = settings.paperWidth;
      const escData = await buildReceiptBitmapEscPos({
        shopName: 'RF Perfume',
        vatNumber: '---',
        branchName: 'اختبار الطباعة',
        orderNumber: 'TEST',
        orderDate: dateStr,
        cashierName: 'النظام',
        items: [
          { name: 'عباية اختبار', qty: 1, price: 15.00 },
          { name: 'كيك شوكولاتة', qty: 2, price: 12.00 },
        ],
        subtotal: 34.09,
        vat: 5.91,
        total: 40.00,
        paymentMethod: 'نقدي',
        paperWidth: pw,
        feedLines: settings.feedLines ?? 4,
      });
      await thermalPrint(escData, '', pw);
    } catch {}
    setTesting(false);
  }

  const webUsbAvailable = isWebUSBSupported();
  const btAvailable = isBluetoothSupported();
  const isUsbConnected = status?.isDeviceConnected;
  const savedDevice = status?.savedDevice;
  const isNetworkMode = settings.mode === 'network';
  const isBluetoothMode = settings.mode === 'bluetooth';
  const isRelayMode = settings.mode === 'relay';

  const roleLabel = (r: PrinterRole) =>
    r === 'receipt' ? 'فاتورة' : r === 'kitchen' ? 'مطبخ' : r === 'bar' ? 'بار' : 'الكل';
  const roleColor = (r: PrinterRole) =>
    r === 'receipt' ? '#16a34a' : r === 'kitchen' ? '#ea580c' : r === 'bar' ? '#7c3aed' : '#2563eb';
  const modeLabel = (m: string) =>
    m === 'network' ? 'شبكة' : m === 'relay' ? 'وكيل' : m === 'queue' ? 'طابور' : m;

  return (
    <div className="space-y-4" dir="rtl">

      {/* ══ PRINT MODE ══ */}
      <Section title="وضع الطباعة" icon={Printer}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { v: 'browser',  label: 'متصفح (PDF)' },
            { v: 'webusb',   label: 'USB مباشر' },
            { v: 'network',  label: 'شبكة LAN' },
            { v: 'relay',    label: 'وكيل محلي' },
            { v: 'bluetooth',label: 'بلوتوث' },
          ].map(m => (
            <button
              key={m.v}
              onClick={() => { updateSetting('mode', m.v as any); setNetworkStatus(null); setRelayStatus(null); }}
              data-testid={`button-mode-${m.v}`}
              className={`h-10 rounded-xl text-xs font-black transition-all border-2 ${
                settings.mode === m.v
                  ? "border-[#E8637A] bg-[#E8637A]/10 text-white"
                  : "border-white/8 bg-white/4 text-white/30 hover:border-white/20"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ══ USB MODE ══ */}
      {settings.mode === 'webusb' && (
        <Section title="اتصال USB مباشر" icon={Usb}>
          {!webUsbAvailable && (
            <WarnBox>⚠️ متصفحك لا يدعم WebUSB — استخدم Chrome أو Edge.</WarnBox>
          )}
          {savedDevice && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-xs font-bold ${isUsbConnected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
              <Usb className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{savedDevice.productName || "طابعة حرارية"} [{savedDevice.vendorId.toString(16).padStart(4,'0')}:{savedDevice.productId.toString(16).padStart(4,'0')}]</span>
              {isUsbConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            </div>
          )}
          {savedDevice && !isUsbConnected && (
            <WarnBox>
              ⚠️ الطابعة مُعرَّفة لكن لا تطبع — مشكلة درايفر Windows.<br/>
              الحل: حمّل Zadig من zadig.akeo.ie ← اختر طابعتك ← Replace Driver ← WinUSB.<br/>
              أو بدّل الوضع إلى «شبكة LAN» أو «وكيل محلي».
            </WarnBox>
          )}
          <div className="flex gap-2">
            {webUsbAvailable && (
              <Btn onClick={handleConnectUSB} disabled={connecting} testId="button-connect-usb-printer" className="flex-1">
                <Usb className="h-3.5 w-3.5" />
                {connecting ? "جارٍ الاتصال..." : "اختر الطابعة (USB)"}
              </Btn>
            )}
            {savedDevice && (
              <Btn variant="danger" onClick={() => { clearSavedDevice(); savePrinterSettings({ mode: 'browser' }); refreshStatus(); }} testId="button-forget-usb">
                <Trash2 className="h-3.5 w-3.5" />
                إزالة
              </Btn>
            )}
          </div>
        </Section>
      )}

      {/* ══ NETWORK MODE ══ */}
      {isNetworkMode && (
        <Section title="طابعة شبكية (LAN / TCP)" icon={Network}>
          {/* Discover */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">بحث تلقائي</p>
            <div className="flex gap-2">
              <input
                value={subnetHint}
                onChange={e => setSubnetHint(e.target.value)}
                placeholder="192.168.1."
                dir="ltr"
                data-testid="input-subnet-hint"
                className="flex-1 h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-[#E8637A]/50 placeholder:text-white/20"
              />
              <Btn onClick={handleDiscoverPrinters} disabled={discovering} testId="button-discover-printers">
                {discovering ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
                {discovering ? "جارٍ البحث..." : "بحث"}
              </Btn>
            </div>
            {discoverProgress && (
              <div className="flex items-center gap-2 text-xs text-white/30 font-bold">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {discoverProgress}
              </div>
            )}
            {discoveredPrinters.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-emerald-400">✅ تم العثور على {discoveredPrinters.length} طابعة — انقر لاختيارها:</p>
                {discoveredPrinters.map(p => (
                  <button
                    key={p.ip}
                    onClick={() => { updateSetting('networkIp', p.ip); updateSetting('networkPort', p.port); setNetworkStatus(null); }}
                    data-testid={`button-select-printer-${p.ip.replace(/\./g, '-')}`}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all ${settings.networkIp === p.ip ? 'bg-[#E8637A]/15 border-[#E8637A]/40 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'}`}
                  >
                    <div className="flex items-center gap-2 font-mono font-bold"><Printer className="h-3.5 w-3.5" />{p.ip}</div>
                    <span className="text-white/30">:{p.port}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-white/8" /><span className="text-[10px] text-white/25 font-bold">أو أدخل يدوياً</span><div className="flex-1 border-t border-white/8" />
          </div>

          {/* Manual IP */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">IP الطابعة</p>
              <input
                value={settings.networkIp || ''}
                onChange={e => updateSetting('networkIp', e.target.value)}
                placeholder="192.168.1.100"
                dir="ltr"
                data-testid="input-network-printer-ip"
                className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-[#E8637A]/50"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">البورت</p>
              <input
                type="number"
                value={String(settings.networkPort || 9100)}
                onChange={e => updateSetting('networkPort', Number(e.target.value) || 9100)}
                dir="ltr"
                data-testid="input-network-printer-port"
                className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-[#E8637A]/50"
              />
            </div>
          </div>

          {/* Relay for LAN */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">رابط وكيل الطباعة (ESC/POS مباشر)</p>
            <input
              value={settings.relayAgentUrl || ''}
              onChange={e => updateSetting('relayAgentUrl', e.target.value.trim())}
              placeholder="http://192.168.1.10:8089"
              dir="ltr"
              data-testid="input-network-relay-agent-url"
              className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-[#E8637A]/50"
            />
            <p className="text-[10px] text-white/25 font-bold">
              {settings.relayAgentUrl
                ? "✅ وكيل الطباعة مكوّن — الطباعة تُرسل مباشرة بدون PDF"
                : "💡 بدون وكيل: سيُفتح PDF. حمّل print-relay.js وشغّله على الشبكة."
              }
            </p>
          </div>

          {networkStatus && <StatusBadge ok={networkStatus.connected} text={networkStatus.message} />}

          <Btn
            onClick={handleTestNetworkPrinter}
            disabled={networkTesting || !settings.networkIp?.trim()}
            className="w-full"
            testId="button-test-network-printer"
          >
            {networkTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
            {networkTesting ? "جارٍ الفحص..." : "اختبار الاتصال"}
          </Btn>
        </Section>
      )}

      {/* ══ RELAY MODE ══ */}
      {isRelayMode && (
        <Section title="وكيل الطباعة المحلي" icon={Network} color="#a78bfa">
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2.5 text-violet-300 text-[11px] font-bold space-y-1">
            <p className="font-black">الخطوة 1 — على جهاز ويندوز في الكافيه:</p>
            <a href="/relay-setup.bat" download="relay-setup.bat" className="flex items-center justify-center gap-2 w-full py-2 bg-violet-600 text-white rounded-lg text-xs font-black">
              ⬇ تحميل relay-setup.bat (دبل كليك وخلاص)
            </a>
            <p>بعد التشغيل ستظهر نافذة سوداء برابط مثل: http://192.168.1.10:8089</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">رابط وكيل الطباعة</p>
            <input
              value={settings.relayAgentUrl || ''}
              onChange={e => updateSetting('relayAgentUrl', e.target.value.trim())}
              placeholder="http://192.168.1.10:8089"
              dir="ltr"
              data-testid="input-relay-agent-url"
              className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">IP الطابعة</p>
              <input value={settings.networkIp || ''} onChange={e => updateSetting('networkIp', e.target.value)} placeholder="192.168.1.100" dir="ltr" data-testid="input-relay-printer-ip" className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-violet-500/50" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">البورت</p>
              <input type="number" value={String(settings.networkPort || 9100)} onChange={e => updateSetting('networkPort', Number(e.target.value) || 9100)} dir="ltr" data-testid="input-relay-printer-port" className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-violet-500/50" />
            </div>
          </div>
          {relayStatus && <StatusBadge ok={relayStatus.connected} text={relayStatus.message} />}
          <Btn variant="violet" onClick={handleTestRelayAgent} disabled={relayTesting || !settings.relayAgentUrl?.trim()} className="w-full" testId="button-test-relay-agent">
            {relayTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
            {relayTesting ? "جارٍ الفحص..." : "اختبار الوكيل والطابعة"}
          </Btn>
        </Section>
      )}

      {/* ══ BLUETOOTH MODE ══ */}
      {isBluetoothMode && (
        <Section title="طابعة بلوتوث (BLE)" icon={Bluetooth} color="#c084fc">
          {!btAvailable && (
            <WarnBox>⚠️ Web Bluetooth غير مدعوم — استخدم Chrome أو Edge على سطح المكتب أو Android.</WarnBox>
          )}
          {(btState.connected || savedBtDevice) && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-xs font-bold ${btState.connected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
              {btState.connected ? <BluetoothConnected className="h-3.5 w-3.5" /> : <Bluetooth className="h-3.5 w-3.5" />}
              <span className="flex-1">{btState.deviceName || savedBtDevice?.name || "طابعة بلوتوث"}</span>
              {btState.connected ? <span className="text-[10px]">● متصلة</span> : <span className="text-[10px]">○ غير متصلة</span>}
            </div>
          )}
          {!btState.connected && savedBtDevice && (
            <Btn onClick={handleReconnectBluetooth} disabled={btReconnecting || !btAvailable} className="w-full" testId="button-reconnect-bluetooth">
              <RefreshCw className={`h-3.5 w-3.5 ${btReconnecting ? "animate-spin" : ""}`} />
              {btReconnecting ? "جارٍ إعادة الاتصال..." : "إعادة الاتصال بدون بحث"}
            </Btn>
          )}
          <div className="flex gap-2">
            <Btn variant="purple" onClick={handleConnectBluetooth} disabled={btConnecting || !btAvailable} className="flex-1" testId="button-pair-bluetooth-printer-main">
              {btConnecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : btState.connected ? <BluetoothConnected className="h-3.5 w-3.5" /> : <Bluetooth className="h-3.5 w-3.5" />}
              {btConnecting ? "جارٍ الاقتران..." : btState.connected ? "تغيير الطابعة" : "ابحث عن طابعة بلوتوث"}
            </Btn>
            {btState.connected && (
              <Btn variant="purple" onClick={handleTestBluetooth} disabled={btTesting} testId="button-test-bluetooth-printer">
                <TestTube2 className="h-3.5 w-3.5" />
                {btTesting ? "..." : "فحص"}
              </Btn>
            )}
            {(savedBtDevice || btState.connected) && (
              <Btn variant="danger" onClick={handleForgetBluetooth} testId="button-forget-bluetooth-printer">
                <BluetoothOff className="h-3.5 w-3.5" />
              </Btn>
            )}
          </div>
          {btStatus && <StatusBadge ok={btStatus.connected} text={btStatus.message} />}
          <p className="text-[10px] text-white/25 font-bold">
            متوافقة: Xprinter XP-P300BT / XP-58BT · MUNBYN ITPP941 · Rongta RPP300 · EPSON TM-P20 · أي طابعة BLE ESC/POS
          </p>
        </Section>
      )}

      {/* ══ PAPER WIDTH ══ */}
      <Section title="عرض الورق">
        <div className="grid grid-cols-2 gap-2">
          {([80, 58] as const).map(mm => (
            <button
              key={mm}
              onClick={() => updateSetting('paperWidth', `${mm}mm` as any)}
              data-testid={`button-paper-${mm}mm`}
              className={`h-10 rounded-xl font-black text-sm border-2 transition-all ${
                settings.paperWidth === `${mm}mm`
                  ? "border-[#E8637A] bg-[#E8637A]/10 text-white"
                  : "border-white/8 bg-white/4 text-white/30 hover:border-white/20"
              }`}
            >
              {mm}mm
            </button>
          ))}
        </div>
      </Section>

      {/* ══ AUTO PRINT + SOUND ══ */}
      <Section title="إعدادات التشغيل">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-sm text-white">طباعة تلقائية</p>
            <p className="text-[11px] text-white/30 font-bold">طباعة فور إتمام الدفع</p>
          </div>
          <Toggle checked={settings.autoPrint} onChange={v => updateSetting('autoPrint', v)} testId="switch-auto-print" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-sm text-white">فتح الدرج النقدي</p>
            <p className="text-[11px] text-white/30 font-bold">يرسل أمر فتح الدرج مع كل طباعة</p>
          </div>
          <Toggle checked={settings.openCashDrawer ?? false} onChange={v => updateSetting('openCashDrawer', v)} testId="switch-cash-drawer" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-sm text-white">عدد أسطر التغذية</p>
            <p className="text-[11px] text-white/30 font-bold">مسافة إضافية في نهاية الطباعة</p>
          </div>
          <div className="flex items-center gap-2">
            {[2,3,4,5,6].map(n => (
              <button
                key={n}
                onClick={() => updateSetting('feedLines', n)}
                className={`w-8 h-8 rounded-lg text-xs font-black border transition-all ${settings.feedLines === n ? "border-[#E8637A] bg-[#E8637A]/15 text-white" : "border-white/10 bg-white/5 text-white/30 hover:border-white/20"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ══ MULTI-PRINTER PROFILES ══ */}
      <Section title="طابعات متعددة (أدوار)" icon={PlugZap}>
        <p className="text-[10px] text-white/30 font-bold leading-relaxed">
          أضف طابعات بأدوار: فاتورة العميل · مطبخ · بار · الكل. إذا لم تضف أي طابعة يعمل النظام بالإعدادات الرئيسية أعلاه.
        </p>

        {profiles.length === 0 && !showAddForm && (
          <div className="h-16 rounded-xl border-2 border-dashed border-white/8 flex items-center justify-center text-[11px] text-white/20 font-bold">
            لا توجد طابعات — اضغط «إضافة» لإضافة أول طابعة
          </div>
        )}

        <div className="space-y-2">
          {profiles.map(p => {
            const ts = profileTestStatus[p.id];
            return (
              <div key={p.id} className={`border border-white/8 rounded-xl p-3 space-y-2 transition-opacity ${p.enabled ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => saveProfilesState(profiles.map(x => x.id === p.id ? { ...x, enabled: !x.enabled } : x))}
                    className={`w-10 h-5 rounded-full relative transition-all ${p.enabled ? "bg-[#E8637A]" : "bg-white/10"}`}
                    data-testid={`switch-printer-${p.id}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${p.enabled ? "right-0.5" : "left-0.5"}`} />
                  </button>
                  <span className="font-black text-sm text-white flex-1">{p.name}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: roleColor(p.role) }}>{roleLabel(p.role)}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/40">{modeLabel(p.mode)}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/40">{p.paperWidth}</span>
                </div>
                <p className="text-[10px] font-mono text-white/30">{p.networkIp}:{p.networkPort}{p.relayAgentUrl ? ` via ${p.relayAgentUrl}` : ''}</p>
                {ts && ts !== 'testing' && <StatusBadge ok={ts.connected} text={ts.message.split('\n')[0]} />}
                <div className="flex gap-1.5 flex-wrap">
                  <Btn onClick={() => testProfile(p)} disabled={ts === 'testing'} testId={`button-test-profile-${p.id}`}>
                    {ts === 'testing' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <TestTube2 className="h-3 w-3" />}
                    اختبار
                  </Btn>
                  <Btn variant="outline" onClick={() => startEditProfile(p)} testId={`button-edit-profile-${p.id}`}>
                    <Edit2 className="h-3 w-3" />تعديل
                  </Btn>
                  <Btn variant="danger" onClick={() => saveProfilesState(profiles.filter(x => x.id !== p.id))} testId={`button-delete-profile-${p.id}`}>
                    <Trash2 className="h-3 w-3" />حذف
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>

        <Btn
          onClick={() => {
            setShowAddForm(v => !v);
            setEditingProfileId(null);
            setNewProfile({ name: '', role: 'all', enabled: true, mode: 'network', networkIp: '', networkPort: 9100, paperWidth: '80mm', relayAgentUrl: '' });
          }}
          className="w-full"
          testId="button-add-printer-profile"
        >
          {showAddForm && !editingProfileId ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAddForm && !editingProfileId ? "إغلاق" : "إضافة طابعة"}
        </Btn>

        {showAddForm && (
          <div className="border-2 border-[#E8637A]/20 rounded-xl p-3.5 space-y-3">
            <p className="text-xs font-black text-[#E8637A]">{editingProfileId ? "تعديل الطابعة" : "إضافة طابعة جديدة"}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/30">اسم الطابعة</p>
                <input value={newProfile.name} onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))} placeholder="طابعة الكاشير" data-testid="input-profile-name" className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs px-3 outline-none focus:border-[#E8637A]/50" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/30">الدور</p>
                <select value={newProfile.role} onChange={e => setNewProfile(p => ({ ...p, role: e.target.value as PrinterRole }))} data-testid="select-profile-role" className="w-full h-9 rounded-xl bg-[#1a0f0a] border border-white/10 text-white text-xs px-3 outline-none">
                  <option value="receipt">فاتورة العميل</option>
                  <option value="kitchen">مطبخ</option>
                  <option value="bar">بار</option>
                  <option value="all">الكل</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/30">وضع الاتصال</p>
                <select value={newProfile.mode} onChange={e => setNewProfile(p => ({ ...p, mode: e.target.value as any }))} data-testid="select-profile-mode" className="w-full h-9 rounded-xl bg-[#1a0f0a] border border-white/10 text-white text-xs px-3 outline-none">
                  <option value="network">شبكة (LAN)</option>
                  <option value="relay">وكيل محلي</option>
                  <option value="queue">طابور</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/30">عرض الورق</p>
                <select value={newProfile.paperWidth} onChange={e => setNewProfile(p => ({ ...p, paperWidth: e.target.value as any }))} data-testid="select-profile-paper" className="w-full h-9 rounded-xl bg-[#1a0f0a] border border-white/10 text-white text-xs px-3 outline-none">
                  <option value="80mm">80mm</option>
                  <option value="58mm">58mm</option>
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/30">IP الطابعة</p>
                <input value={newProfile.networkIp} onChange={e => setNewProfile(p => ({ ...p, networkIp: e.target.value }))} placeholder="192.168.1.100" dir="ltr" data-testid="input-profile-ip" className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-[#E8637A]/50" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/30">المنفذ</p>
                <input type="number" value={newProfile.networkPort} onChange={e => setNewProfile(p => ({ ...p, networkPort: Number(e.target.value) }))} dir="ltr" data-testid="input-profile-port" className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-[#E8637A]/50" />
              </div>
            </div>
            {newProfile.mode === 'relay' && (
              <div className="space-y-1">
                <p className="text-[10px] font-black text-white/30">رابط وكيل الطباعة</p>
                <input value={newProfile.relayAgentUrl || ''} onChange={e => setNewProfile(p => ({ ...p, relayAgentUrl: e.target.value }))} placeholder="http://192.168.1.10:8089" dir="ltr" data-testid="input-profile-relay-url" className="w-full h-9 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono px-3 outline-none focus:border-[#E8637A]/50" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={addOrUpdateProfile} data-testid="button-save-profile" className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#E8637A]/15 border border-[#E8637A]/40 text-[#E8637A] font-black text-xs hover:bg-[#E8637A]/25 transition-all">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {editingProfileId ? "حفظ التعديل" : "إضافة"}
              </button>
              <button onClick={() => { setShowAddForm(false); setEditingProfileId(null); }} className="h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white/40 font-black text-xs hover:bg-white/8 transition-all">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ══ TEST PRINT ══ */}
      <button
        onClick={handleTestPrint}
        disabled={testing}
        data-testid="button-test-print-full"
        className="w-full h-12 rounded-2xl border-2 border-dashed border-[#E8637A]/30 text-[#E8637A] font-black text-sm hover:bg-[#E8637A]/8 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        {testing ? "جارٍ الطباعة..." : "طباعة تجريبية (Canvas ESC/POS)"}
      </button>
    </div>
  );
}
