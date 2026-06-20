/**
 * Notification Sound System — Myla
 */

export type NotificationSoundType =
  | 'newOrder'
  | 'onlineOrderVoice'
  | 'cashierOrder'
  | 'statusChange'
  | 'success'
  | 'alert';

export type SoundChannel = 'manual' | 'online' | 'car';

export interface ChannelSoundConfig {
  enabled: boolean;
  soundType: NotificationSoundType;
  volume: number;
}

const CHANNEL_SOUND_KEY = 'fuji_channel_sounds';

const CHANNEL_DEFAULTS: Record<SoundChannel, ChannelSoundConfig> = {
  manual:  { enabled: true, soundType: 'newOrder',         volume: 0.6 },
  online:  { enabled: true, soundType: 'onlineOrderVoice', volume: 1.0 },
  car:     { enabled: true, soundType: 'onlineOrderVoice', volume: 1.0 },
};

export function getChannelConfig(channel: SoundChannel): ChannelSoundConfig {
  try {
    const raw = localStorage.getItem(CHANNEL_SOUND_KEY);
    if (!raw) return { ...CHANNEL_DEFAULTS[channel] };
    const map = JSON.parse(raw) as Record<SoundChannel, ChannelSoundConfig>;
    return map[channel] ? { ...CHANNEL_DEFAULTS[channel], ...map[channel] } : { ...CHANNEL_DEFAULTS[channel] };
  } catch { return { ...CHANNEL_DEFAULTS[channel] }; }
}

export function setChannelConfig(channel: SoundChannel, config: Partial<ChannelSoundConfig>): void {
  try {
    const raw = localStorage.getItem(CHANNEL_SOUND_KEY);
    const map: Record<string, ChannelSoundConfig> = raw ? JSON.parse(raw) : {};
    map[channel] = { ...CHANNEL_DEFAULTS[channel], ...(map[channel] || {}), ...config };
    localStorage.setItem(CHANNEL_SOUND_KEY, JSON.stringify(map));
  } catch {}
}

export function getAllChannelConfigs(): Record<SoundChannel, ChannelSoundConfig> {
  return { manual: getChannelConfig('manual'), online: getChannelConfig('online'), car: getChannelConfig('car') };
}

export async function playChannelSound(channel: SoundChannel): Promise<void> {
  const cfg = getChannelConfig(channel);
  if (!cfg.enabled) return;
  await playNotificationSound(cfg.soundType, cfg.volume);
}

let sharedCtx: AudioContext | null = null;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return sharedCtx;
  } catch { return null; }
}

async function ensureRunning(): Promise<boolean> {
  try {
    const ctx = getCtx();
    if (!ctx) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running';
  } catch { return false; }
}

function playSilentPing(): void {
  try {
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'running') return;
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  } catch {}
}

function startKeepalive(): void {
  if (keepaliveTimer !== null) return;
  keepaliveTimer = setInterval(() => {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      if (keepaliveTimer !== null) clearInterval(keepaliveTimer);
      keepaliveTimer = null;
      return;
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().then(() => playSilentPing()).catch(() => {});
    } else { playSilentPing(); }
  }, 25_000);
}

if (typeof window !== 'undefined') {
  const unlock = async () => {
    const running = await ensureRunning();
    if (running) { audioUnlocked = true; startKeepalive(); }
  };
  ['click', 'keydown', 'touchstart', 'mousedown', 'pointerdown'].forEach(evt =>
    document.addEventListener(evt, unlock, { capture: true, passive: true })
  );
}

let audioUnlocked = false;

export function isAudioUnlocked(): boolean {
  return audioUnlocked || (sharedCtx?.state === 'running');
}

export async function initAudioUnlock(): Promise<void> {
  try {
    const running = await ensureRunning();
    if (running) { audioUnlocked = true; startKeepalive(); }
  } catch {}
}

const SOUND_PREF_KEY = 'myla_sound_enabled';

export function getSoundEnabled(pageKey = 'default'): boolean {
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    if (!raw) return true;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return map[pageKey] !== false;
  } catch { return true; }
}

export function setSoundEnabled(pageKey: string, enabled: boolean): void {
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[pageKey] = enabled;
    localStorage.setItem(SOUND_PREF_KEY, JSON.stringify(map));
  } catch {}
}

const DEDUP_WINDOW_MS = 600;
const dedupMap = new Map<string, number>();

function isDuplicate(type: NotificationSoundType): boolean {
  const last = dedupMap.get(type);
  return !!last && Date.now() - last < DEDUP_WINDOW_MS;
}

function markPlayed(type: NotificationSoundType): void {
  dedupMap.set(type, Date.now());
}

function playTingWebAudio(volume: number): boolean {
  try {
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'running') return false;
    const partials = [
      { freq: 1760, amp: 1.0 },
      { freq: 3136, amp: 0.55 },
      { freq: 4400, amp: 0.30 },
      { freq: 6000, amp: 0.15 },
    ];
    const master = ctx.createGain();
    master.gain.value = Math.min(1.0, volume * 1.4);
    master.connect(ctx.destination);
    const now = ctx.currentTime;
    const decayTime = 0.55;
    partials.forEach(({ freq, amp }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
      osc.connect(gain); gain.connect(master);
      osc.start(now); osc.stop(now + decayTime);
    });
    audioUnlocked = true;
    return true;
  } catch { return false; }
}

function generateTingWav(volume = 0.9, sampleRate = 22050): string {
  const durationMs = 550;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, 'RIFF'); view.setUint32(4, 36 + numSamples * 2, true); write(8, 'WAVE');
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, numSamples * 2, true);
  const partials = [{ freq: 1760, amp: 1.0 }, { freq: 3136, amp: 0.55 }, { freq: 4400, amp: 0.30 }, { freq: 6000, amp: 0.15 }];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, i / (sampleRate * 0.002));
    const decay = Math.exp(-t * 6.5);
    const env = attack * decay * volume;
    let sample = 0;
    for (const { freq, amp } of partials) sample += amp * Math.sin(2 * Math.PI * freq * t);
    const totalAmp = partials.reduce((s, p) => s + p.amp, 0);
    sample /= totalAmp;
    view.setInt16(44 + i * 2, Math.round(sample * env * 29000), true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

function generateBeepWav(frequencies: number[], durationMs: number, sampleRate = 22050): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, 'RIFF'); view.setUint32(4, 36 + numSamples * 2, true); write(8, 'WAVE');
  write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, i / (sampleRate * 0.01));
    const fade = Math.min(1, (numSamples - i) / (numSamples * 0.25));
    const env = attack * fade;
    let sample = 0;
    for (const f of frequencies) sample += Math.sin(2 * Math.PI * f * t) / frequencies.length;
    view.setInt16(44 + i * 2, Math.round(sample * env * 28000), true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

let tingWavUrl: string | null = null;
const audioCache: Partial<Record<NotificationSoundType, string>> = {};

function getAudioDataUrl(type: NotificationSoundType): string {
  if (type === 'newOrder' || type === 'onlineOrderVoice') {
    if (!tingWavUrl) tingWavUrl = generateTingWav(0.95);
    return tingWavUrl;
  }
  if (!audioCache[type]) {
    switch (type) {
      case 'cashierOrder':  audioCache[type] = generateBeepWav([660, 880], 180); break;
      case 'success':       audioCache[type] = generateBeepWav([523, 659], 250); break;
      case 'statusChange':  audioCache[type] = generateBeepWav([440], 300); break;
      case 'alert':         audioCache[type] = generateBeepWav([880, 659], 300); break;
      default: (audioCache as Record<string, string>)[type] = generateBeepWav([523, 659, 784], 350);
    }
  }
  return audioCache[type]!;
}

async function playTingAudio(volume: number): Promise<void> {
  await ensureRunning();
  if (playTingWebAudio(volume)) return;
  try {
    const audio = new Audio(getAudioDataUrl('newOrder'));
    audio.volume = Math.min(1, volume);
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      setTimeout(resolve, 700);
    });
  } catch {}
}

function playBeepWebAudio(type: NotificationSoundType, volume: number): boolean {
  try {
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'running') return false;
    const freqMap: Record<string, number[]> = {
      cashierOrder: [660, 880], success: [523, 659], statusChange: [440], alert: [880, 659],
    };
    const freqs = freqMap[type] || [523, 659, 784];
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(master);
      osc.type = 'sine'; osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1 / freqs.length, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.start(start); osc.stop(start + 0.3);
    });
    audioUnlocked = true;
    return true;
  } catch { return false; }
}

async function playBeep(type: NotificationSoundType, volume: number): Promise<void> {
  await ensureRunning();
  if (playBeepWebAudio(type, volume)) return;
  try {
    const audio = new Audio(getAudioDataUrl(type));
    audio.volume = Math.max(0, Math.min(1, volume));
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      setTimeout(resolve, 800);
    });
  } catch {}
}

export async function testSound(type: NotificationSoundType = 'success', volume = 0.8): Promise<boolean> {
  try {
    await initAudioUnlock();
    if (type === 'newOrder' || type === 'onlineOrderVoice') {
      await playTingAudio(volume);
      await new Promise(r => setTimeout(r, 350));
      await playTingAudio(volume);
    } else { await playBeep(type, volume); }
    return true;
  } catch { return false; }
}

export async function playNotificationSound(
  type: NotificationSoundType = 'newOrder',
  volume: number = 0.95
): Promise<void> {
  if (isDuplicate(type)) return;
  markPlayed(type);
  await ensureRunning();
  if (type === 'onlineOrderVoice' || type === 'newOrder') {
    await playTingAudio(volume);
    await new Promise(r => setTimeout(r, 320));
    await playTingAudio(volume);
    await new Promise(r => setTimeout(r, 320));
    await playTingAudio(volume * 0.85);
  } else if (type === 'cashierOrder') {
    await playBeep('cashierOrder', volume);
    await new Promise(r => setTimeout(r, 200));
    await playBeep('cashierOrder', volume * 0.8);
  } else { await playBeep(type, volume); }
}
