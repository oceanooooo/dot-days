// 8비트 효과음 (Web Audio로 직접 합성, 외부 음원 없음). 설정에서 끄면 재생 안 함
let ctx = null;
let enabled = true;
let unlocked = false; // 사용자가 화면을 한 번이라도 누른 뒤에만 소리를 냄
export const setSoundEnabled = on => { enabled = on; };

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// 브라우저 정책상 첫 터치 이후에만 소리가 남 → 첫 입력 때 미리 깨워 둠
export function unlockAudio() { unlocked = true; if (enabled) ac(); }

function tone(freq, dur, { type = 'square', vol = 0.05, at = 0, slide = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
const seq = (notes, step, opts) => notes.forEach((f, i) => f && tone(f, step * 0.95, { ...opts, at: i * step }));

const SFX = {
  tap: () => tone(880, 0.04, { vol: 0.025 }),
  complete: () => seq([784, 1175], 0.07, { vol: 0.05 }),
  coin: () => seq([1319, 1760], 0.05, { vol: 0.035 }),
  item: () => seq([1047, 1319, 1568, 2093], 0.06, { type: 'triangle', vol: 0.06 }),
  level: () => seq([523, 659, 784, 1047, 0, 784, 1047], 0.09, { vol: 0.05 }),
  achv: () => seq([880, 1109, 1319, 1760], 0.07, { type: 'triangle', vol: 0.06 }),
  chest: () => { seq([196, 0, 196, 0, 196], 0.08, { type: 'triangle', vol: 0.06 }); seq([0, 0, 0, 0, 0, 0, 784, 988, 1175, 1568], 0.06, { vol: 0.045 }); },
  error: () => tone(160, 0.18, { type: 'sawtooth', vol: 0.03, slide: -40 }),
  undo: () => tone(660, 0.1, { vol: 0.03, slide: -260 }),
  dive: () => { tone(420, 0.5, { type: 'sine', vol: 0.06, slide: -260 }); seq([0, 0, 0, 1568, 0, 1760], 0.08, { type: 'sine', vol: 0.02 }); },
  surface: () => seq([392, 523, 659, 784, 1047], 0.09, { type: 'triangle', vol: 0.06 }),
  fail: () => seq([392, 330, 262], 0.14, { type: 'triangle', vol: 0.05 }),
  firework: () => { tone(300, 0.3, { type: 'sine', vol: 0.03, slide: 900 }); seq([0, 0, 0, 0, 1760, 1568, 1319], 0.05, { type: 'square', vol: 0.02 }); },
};
export function sfx(name) {
  if (!enabled || !(unlocked || navigator.userActivation?.hasBeenActive)) return;
  try { SFX[name]?.(); } catch { /* 소리 실패는 무시 */ }
}
export function buzz(ms = 20) { try { navigator.vibrate?.(ms); } catch { /* 미지원 */ } }
