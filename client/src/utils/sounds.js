let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('coupleSave_settings');
    if (!raw) return { soundEffects: true, volume: 70 };
    const settings = JSON.parse(raw);
    return {
      soundEffects: settings.appearance?.soundEffects !== false,
      volume: settings.appearance?.volume ?? 70,
    };
  } catch {
    return { soundEffects: true, volume: 70 };
  }
}

function isEnabled() {
  return loadSettings().soundEffects;
}

function volume() {
  return Math.max(0, Math.min(1, (loadSettings().volume ?? 70) / 100));
}

function tone(freq, start, duration, type = 'square', vol = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const v = vol * volume();
  if (v <= 0) return;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(v, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

// Single short noise burst for clicks/impacts
function noise(start, duration, vol = 0.06) {
  const ctx = getCtx();
  if (!ctx) return;
  const v = vol * volume();
  if (v <= 0) return;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(v, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(ctx.currentTime + start);
}

export function playClick() {
  if (!isEnabled()) return;
  noise(0, 0.04, 0.07);
  tone(720, 0, 0.04, 'square', 0.05);
}

export function playHover() {
  if (!isEnabled()) return;
  tone(500, 0, 0.03, 'square', 0.03);
}

export function playDeposit() {
  if (!isEnabled()) return;
  tone(523.25, 0, 0.08, 'square', 0.08);
  tone(659.25, 0.09, 0.08, 'square', 0.08);
  tone(783.99, 0.18, 0.12, 'square', 0.08);
}

export function playCoinDrop() {
  if (!isEnabled()) return;
  tone(988, 0, 0.05, 'triangle', 0.09);
  noise(0.22, 0.05, 0.1);
  tone(659, 0.24, 0.08, 'triangle', 0.07);
}

export function playLevelUp() {
  if (!isEnabled()) return;
  tone(523.25, 0, 0.1, 'square', 0.08);
  tone(659.25, 0.1, 0.1, 'square', 0.08);
  tone(783.99, 0.2, 0.1, 'square', 0.08);
  tone(1046.5, 0.3, 0.2, 'square', 0.09);
}

export function playAchievement() {
  if (!isEnabled()) return;
  tone(659.25, 0, 0.08, 'triangle', 0.09);
  tone(659.25, 0.1, 0.08, 'triangle', 0.09);
  tone(659.25, 0.2, 0.08, 'triangle', 0.09);
  tone(1046.5, 0.3, 0.25, 'triangle', 0.1);
}

export function playSend() {
  if (!isEnabled()) return;
  tone(880, 0, 0.06, 'square', 0.05);
  tone(1174.66, 0.06, 0.08, 'square', 0.05);
}

export function playMessage() {
  if (!isEnabled()) return;
  tone(660, 0, 0.08, 'triangle', 0.06);
  tone(880, 0.09, 0.1, 'triangle', 0.05);
}

export function playNotification() {
  if (!isEnabled()) return;
  tone(587.33, 0, 0.07, 'triangle', 0.07);
  tone(587.33, 0.12, 0.07, 'triangle', 0.07);
  tone(880, 0.24, 0.14, 'triangle', 0.08);
}