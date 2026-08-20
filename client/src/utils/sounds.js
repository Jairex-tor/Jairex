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
    if (!raw) return { soundEffects: true, volume: 70, soundPack: 'classic' };
    const settings = JSON.parse(raw);
    return {
      soundEffects: settings.appearance?.soundEffects !== false,
      volume: settings.appearance?.volume ?? 70,
      soundPack: settings.appearance?.soundPack ?? 'classic',
    };
  } catch {
    return { soundEffects: true, volume: 70, soundPack: 'classic' };
  }
}

function isEnabled() {
  return loadSettings().soundEffects;
}

function vol() {
  return Math.max(0, Math.min(1, (loadSettings().volume ?? 70) / 100));
}

function getPack() {
  return loadSettings().soundPack || 'classic';
}

function tone(freq, start, duration, type = 'square', v = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const final = v * vol();
  if (final <= 0) return;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(final, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

function noise(start, duration, v = 0.06) {
  const ctx = getCtx();
  if (!ctx) return;
  const final = v * vol();
  if (final <= 0) return;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(final, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(ctx.currentTime + start);
}

const classicPack = {
  label: 'Classic (8-bit)',
  click: () => { noise(0, 0.04, 0.07); tone(720, 0, 0.04, 'square', 0.05); },
  hover: () => { tone(500, 0, 0.03, 'square', 0.03); },
  deposit: () => { tone(523.25, 0, 0.08, 'square', 0.08); tone(659.25, 0.09, 0.08, 'square', 0.08); tone(783.99, 0.18, 0.12, 'square', 0.08); },
  coinDrop: () => { tone(988, 0, 0.05, 'triangle', 0.09); noise(0.22, 0.05, 0.1); tone(659, 0.24, 0.08, 'triangle', 0.07); },
  levelUp: () => { tone(523.25, 0, 0.1, 'square', 0.08); tone(659.25, 0.1, 0.1, 'square', 0.08); tone(783.99, 0.2, 0.1, 'square', 0.08); tone(1046.5, 0.3, 0.2, 'square', 0.09); },
  achievement: () => { tone(659.25, 0, 0.08, 'triangle', 0.09); tone(659.25, 0.1, 0.08, 'triangle', 0.09); tone(659.25, 0.2, 0.08, 'triangle', 0.09); tone(1046.5, 0.3, 0.25, 'triangle', 0.1); },
  send: () => { tone(880, 0, 0.06, 'square', 0.05); tone(1174.66, 0.06, 0.08, 'square', 0.05); },
  message: () => { tone(660, 0, 0.08, 'triangle', 0.06); tone(880, 0.09, 0.1, 'triangle', 0.05); },
  notification: () => { tone(587.33, 0, 0.07, 'triangle', 0.07); tone(587.33, 0.12, 0.07, 'triangle', 0.07); tone(880, 0.24, 0.14, 'triangle', 0.08); },
};

const retroPack = {
  label: 'Retro Console',
  click: () => { tone(880, 0, 0.03, 'square', 0.06); },
  hover: () => { tone(440, 0, 0.02, 'sine', 0.04); },
  deposit: () => { tone(440, 0, 0.06, 'sine', 0.08); tone(554, 0.07, 0.06, 'sine', 0.08); tone(659, 0.14, 0.06, 'sine', 0.08); tone(880, 0.21, 0.1, 'sine', 0.09); },
  coinDrop: () => { tone(1200, 0, 0.04, 'sine', 0.08); tone(900, 0.06, 0.04, 'sine', 0.06); tone(700, 0.12, 0.06, 'sine', 0.05); },
  levelUp: () => { tone(440, 0, 0.1, 'sine', 0.07); tone(554, 0.12, 0.1, 'sine', 0.07); tone(659, 0.24, 0.1, 'sine', 0.07); tone(880, 0.36, 0.2, 'sine', 0.09); },
  achievement: () => { tone(523, 0, 0.1, 'sine', 0.08); tone(523, 0.12, 0.1, 'sine', 0.08); tone(784, 0.24, 0.2, 'sine', 0.09); },
  send: () => { tone(1047, 0, 0.05, 'sine', 0.06); tone(1319, 0.05, 0.07, 'sine', 0.06); },
  message: () => { tone(880, 0, 0.06, 'sine', 0.06); tone(1100, 0.07, 0.08, 'sine', 0.05); },
  notification: () => { tone(698, 0, 0.06, 'sine', 0.07); tone(698, 0.1, 0.06, 'sine', 0.07); tone(1047, 0.2, 0.12, 'sine', 0.08); },
};

const minimalPack = {
  label: 'Minimal',
  click: () => { tone(600, 0, 0.02, 'sine', 0.04); },
  hover: () => { tone(400, 0, 0.015, 'sine', 0.02); },
  deposit: () => { tone(520, 0, 0.05, 'sine', 0.06); tone(780, 0.08, 0.08, 'sine', 0.06); },
  coinDrop: () => { tone(800, 0, 0.04, 'sine', 0.07); },
  levelUp: () => { tone(520, 0, 0.08, 'sine', 0.06); tone(780, 0.1, 0.08, 'sine', 0.06); tone(1040, 0.2, 0.15, 'sine', 0.07); },
  achievement: () => { tone(660, 0, 0.06, 'sine', 0.06); tone(880, 0.08, 0.15, 'sine', 0.07); },
  send: () => { tone(880, 0, 0.04, 'sine', 0.04); },
  message: () => { tone(700, 0, 0.05, 'sine', 0.04); },
  notification: () => { tone(600, 0, 0.05, 'sine', 0.05); tone(800, 0.08, 0.08, 'sine', 0.05); },
};

const chiptunePack = {
  label: 'Chiptune',
  click: () => { noise(0, 0.02, 0.05); tone(1200, 0, 0.02, 'square', 0.04); },
  hover: () => { tone(600, 0, 0.02, 'square', 0.02); },
  deposit: () => { tone(523, 0, 0.06, 'square', 0.07); tone(659, 0.07, 0.06, 'square', 0.07); tone(784, 0.14, 0.06, 'square', 0.07); tone(1047, 0.21, 0.1, 'sawtooth', 0.06); },
  coinDrop: () => { tone(1500, 0, 0.03, 'square', 0.08); tone(1200, 0.04, 0.03, 'square', 0.06); noise(0.1, 0.03, 0.08); tone(800, 0.14, 0.05, 'square', 0.05); },
  levelUp: () => { tone(523, 0, 0.08, 'square', 0.07); tone(659, 0.09, 0.08, 'square', 0.07); tone(784, 0.18, 0.08, 'square', 0.07); tone(1047, 0.27, 0.08, 'square', 0.07); tone(1319, 0.36, 0.15, 'sawtooth', 0.06); },
  achievement: () => { tone(880, 0, 0.06, 'square', 0.07); tone(880, 0.07, 0.06, 'square', 0.07); tone(1175, 0.14, 0.06, 'square', 0.07); tone(1760, 0.21, 0.2, 'sawtooth', 0.06); },
  send: () => { tone(1175, 0, 0.04, 'square', 0.05); tone(1568, 0.05, 0.06, 'square', 0.05); },
  message: () => { tone(880, 0, 0.05, 'triangle', 0.05); tone(1100, 0.06, 0.06, 'triangle', 0.04); },
  notification: () => { tone(700, 0, 0.05, 'square', 0.06); tone(700, 0.06, 0.05, 'square', 0.06); tone(1050, 0.12, 0.1, 'sawtooth', 0.06); },
};

const PACKS = { classic: classicPack, retro: retroPack, minimal: minimalPack, chiptune: chiptunePack };

export const SOUND_PACKS = [
  { key: 'classic', label: 'Classic (8-bit)' },
  { key: 'retro', label: 'Retro Console' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'chiptune', label: 'Chiptune' },
];

function play(name) {
  if (!isEnabled()) return;
  const pack = PACKS[getPack()] || PACKS.classic;
  if (pack[name]) pack[name]();
}

export function playClick() { play('click'); }
export function playHover() { play('hover'); }
export function playDeposit() { play('deposit'); }
export function playCoinDrop() { play('coinDrop'); }
export function playLevelUp() { play('levelUp'); }
export function playAchievement() { play('achievement'); }
export function playSend() { play('send'); }
export function playMessage() { play('message'); }
export function playNotification() { play('notification'); }
