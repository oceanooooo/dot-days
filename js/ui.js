// 화면 공통: 도트 아이콘, 팝업·시트·확인·토스트, 연출 대기열, 화면 ID 추적, 이벤트 위임
import { pixelURL, pixelCanvas, PAL } from './pixel.js';
import { ITEMS } from './sprites-items.js';
import { UI_ICONS, ATTR_ICONS } from './sprites-ui.js';
import { variantSprite, SHAPES } from './sprites-variants.js';
import { UI_ANIM, FX, TEMPTERS } from './sprites-fx.js';
import { store } from './store.js';
import { attrDef } from './game.js';
import { html, str, esc } from './util.js';
import { sfx } from './sound.js';

// ---------------------------------------------------------------- 도트 이미지
const DPR = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
const scaleFor = size => Math.max(1, Math.round((size * DPR) / 16));
const SIL = Object.fromEntries(Object.keys(PAL).map(k => [k, '#4a4766']));
export function spriteURL(kind, id, size = 32, silhouette = false) {
  const src = kind === 'ui' ? UI_ICONS[id] : kind === 'attr' ? ATTR_ICONS[id] : ITEMS[id];
  if (!src) return '';
  const pal = silhouette ? SIL : src.pal;
  return pixelURL(`${kind}:${id}${silhouette ? ':sil' : ''}`, src.px, scaleFor(size), pal);
}
const img = (kind, id, size, alt = '', cls = '', sil = false) =>
  html`<img class="px ${cls}" src="${spriteURL(kind, id, size, sil)}" width="${size}" height="${size}" alt="${alt}" ${alt ? '' : html`aria-hidden="true"`} draggable="false">`;
export const uiIcon = (id, size = 24, alt = '', cls = '') => img('ui', id, size, alt, cls);
export const itemIcon = (id, size = 32, alt = '', sil = false) => (ITEMS[id] || sil ? img('item', ITEMS[id] ? id : 'shell', size, alt, '', sil) : iconHTML(id, size, alt));

// ---------------------------------------------------------------- GIF 같은 프레임 애니메이션 (FR-ICN-003, 004)
// 프레임들을 가로로 이어 붙인 한 장을 만들고 CSS steps()로 한 칸씩 넘김
const stripCache = new Map();
function stripURL(key, frames, scale) {
  const k = `${key}@${scale}`;
  if (stripCache.has(k)) return stripCache.get(k);
  const h = frames[0].px.length, w = Math.max(...frames[0].px.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w * scale * frames.length; c.height = h * scale;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  frames.forEach((f, i) => ctx.drawImage(pixelCanvas(f.px, scale, f.pal), i * w * scale, 0));
  const url = c.toDataURL(); stripCache.set(k, url);
  return url;
}
/** frames: [{ px, pal? }] → 1장이면 img, 여러 장이면 움직이는 span */
export function animFrames(key, frames, size, { alt = '', loop = true, fps = 6, cls = '' } = {}) {
  if (!frames?.length) return '';
  const rows = frames[0].px.length, cols = Math.max(...frames[0].px.map(r => r.length));
  const hh = Math.round(size * rows / cols);
  const scale = Math.max(1, Math.round((size * DPR) / cols));
  const a11y = alt ? html`role="img" aria-label="${alt}"` : html`aria-hidden="true"`;
  if (frames.length === 1) return html`<img class="px ${cls}" src="${pixelURL(key, frames[0].px, scale, frames[0].pal)}" width="${size}" height="${hh}" alt="${alt}" draggable="false">`;
  const n = frames.length;
  return html`<span class="anim ${loop ? '' : 'once'} ${cls}" ${a11y} style="--w:${size}px;--h:${hh}px;--n:${n};--d:${(n / fps).toFixed(2)}s;background-image:url(${stripURL(key, frames, scale)})"></span>`;
}
const asFrames = list => list.map(f => (f.px ? f : { px: f }));

/** 아이콘 키 하나로 모든 아이콘 출력: 아이템 ID · 'v:모양:색' · 'attr:ID' · 'ui:ID' */
export function iconHTML(key, size = 32, alt = '') {
  if (!key) key = 'shell';
  if (key.startsWith('v:')) {
    const [, shape, variant] = key.split(':');
    const sp = SHAPES[shape] ? variantSprite(shape, variant) : null;
    if (sp?.frames?.length) return animFrames(key, sp.frames, size, { alt, fps: 6 });
  }
  if (key.startsWith('attr:') && ATTR_ICONS[key.slice(5)]) return img('attr', key.slice(5), size, alt);
  if (key.startsWith('ui:') && UI_ICONS[key.slice(3)]) return img('ui', key.slice(3), size, alt);
  if (UI_ICONS[key] && !ITEMS[key]) return img('ui', key, size, alt);
  return img('item', ITEMS[key] ? key : 'shell', size, alt);
}
/** 능력치 아이콘: 사용자가 바꾼 아이콘까지 반영 */
export function attrIcon(id, size = 24, alt = '') {
  const def = store.S ? attrDef(store.S, id) : { icon: 'attr:' + id };
  return iconHTML(def.icon || 'attr:' + id, size, alt);
}
/** 움직이는 UI 아이콘 (조개 회전, 불꽃 등). 없으면 정지 아이콘 */
export const uiAnim = (id, size = 24, alt = '') => (UI_ANIM[id] ? animFrames('uianim:' + id, asFrames(UI_ANIM[id]), size, { alt, fps: id === 'coin' ? 7 : 6 }) : uiIcon(id, size, alt));
/** 이펙트 HTML (팝업 안에 넣기용) */
export const fxHTML = (name, size = 64, { loop } = {}) => (FX[name] ? animFrames('fx:' + name, asFrames(FX[name].frames), size, { loop: loop ?? FX[name].loop, fps: 10, cls: 'fx-sprite' }) : '');
/** 요소 위에 이펙트를 겹쳐 한 번 재생하고 지움 */
export function fxAt(target, name, size = 72) {
  if (!FX[name] || reducedMotion()) return;
  const r = (typeof target === 'string' ? document.querySelector(target) : target)?.getBoundingClientRect();
  if (!r) return;
  const el = document.createElement('div');
  el.className = 'fx-float';
  el.style.left = `${r.left + r.width / 2 - size / 2}px`; el.style.top = `${r.top + r.height / 2 - size / 2}px`;
  el.innerHTML = str(fxHTML(name, size, { loop: false }));
  document.body.appendChild(el);
  setTimeout(() => el.remove(), (FX[name].frames.length / 10) * 1000 + 150);
}
/** 유혹 몬스터: state = idle | laugh | sleep */
export function tempterHTML(id, state = 'idle', size = 40) {
  const t = TEMPTERS[id] || Object.values(TEMPTERS)[0];
  if (!t) return '';
  return animFrames(`tempter:${id}:${state}`, asFrames(t[state] || t.idle), size, { alt: t.name, fps: state === 'sleep' ? 2 : 4 });
}
export const tempterName = id => TEMPTERS[id]?.name || '유혹 몬스터';

// ---------------------------------------------------------------- 이벤트 위임: data-act(클릭), data-in(입력)
const ACTS = {};
export const actions = obj => Object.assign(ACTS, obj);
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
  const fn = ACTS[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  if (!el.dataset.silent) sfx('tap');
  fn(el, e);
});
// 글자 입력은 input 이벤트로, 체크·선택·날짜·파일은 change 이벤트로 한 번만 처리
const TYPING = new Set(['text', 'search', 'number', 'password', 'textarea', 'tel', 'url']);
const onInput = typing => e => {
  const el = e.target.closest('[data-in]');
  if (!el || !ACTS[el.dataset.in]) return;
  const isTyping = TYPING.has(el.type || el.tagName.toLowerCase());
  if (isTyping === typing) ACTS[el.dataset.in](el, e);
};
document.addEventListener('input', onInput(true));
document.addEventListener('change', onInput(false));

// ---------------------------------------------------------------- 화면 ID 추적 (체험형 화면설계서에 현재 화면을 알림)
const screenStack = [];
let baseScreen = '';
export function setBaseScreen(id) { baseScreen = id; reportScreen(); }
export function currentScreen() { return screenStack[screenStack.length - 1] || baseScreen; }
function reportScreen() {
  if (window.parent !== window) window.parent.postMessage({ type: 'dd-screen', id: currentScreen() }, '*');
  document.documentElement.dataset.screen = currentScreen();
}

// ---------------------------------------------------------------- 오버레이 (모달·시트·연출)
const layer = () => document.getElementById('layer');
const stack = [];
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * opts: { type: 'modal'|'sheet'|'fx', screen, title, render: () => html, dismiss: true, cls, onClose, label }
 * 반환: { el, body, close(value), rerender(), done: Promise }
 */
export function openOverlay(opts) {
  const ov = document.createElement('div');
  ov.className = `ov ov-${opts.type || 'modal'} ${opts.cls || ''}`;
  ov.innerHTML = `<div class="ov-dim" data-dim></div><div class="ov-box ${opts.type === 'sheet' ? 'sheet' : opts.type === 'fx' ? 'fxbox' : 'panel modal'}" role="dialog" aria-modal="true" ${opts.title ? `aria-label="${esc(opts.title)}"` : ''}></div>`;
  const box = ov.querySelector('.ov-box');
  const prevFocus = document.activeElement;
  let resolveDone;
  const h = {
    el: ov, box, opts,
    done: new Promise(r => { resolveDone = r; }),
    rerender() {
      const keep = box.querySelector('.sheet-body')?.scrollTop;
      box.innerHTML = str(frame(opts, opts.render(h)));
      if (keep) box.querySelector('.sheet-body').scrollTop = keep;
      opts.onRender?.(h);
    },
    close(value) {
      if (h.closed) return;
      h.closed = true;
      ov.classList.add('closing');
      const i = stack.indexOf(h); if (i >= 0) stack.splice(i, 1);
      const si = screenStack.lastIndexOf(opts.screen); if (opts.screen && si >= 0) screenStack.splice(si, 1);
      reportScreen();
      setTimeout(() => ov.remove(), 120);
      opts.onClose?.(value);
      if (prevFocus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
      resolveDone(value);
    },
  };
  ov.addEventListener('click', e => { if (e.target.dataset.dim !== undefined && opts.dismiss !== false) h.close(); });
  layer().appendChild(ov);
  stack.push(h);
  if (opts.screen) { screenStack.push(opts.screen); reportScreen(); }
  h.rerender();
  requestAnimationFrame(() => {
    ov.classList.add('open');
    const f = box.querySelector('[autofocus]') || box.querySelector(FOCUSABLE);
    f?.focus({ preventScroll: true });
  });
  return h;
}
function frame(opts, body) {
  if (opts.type === 'sheet') {
    return html`<div class="sheet-head"><h2>${opts.title}</h2><button class="icon-btn" data-act="ov.close" aria-label="닫기">${uiIcon('close', 24)}</button></div><div class="sheet-body">${body}</div>${opts.foot ? html`<div class="sheet-foot">${opts.foot(opts)}</div>` : ''}`;
  }
  return body;
}
export const topOverlay = () => stack[stack.length - 1];
export const closeTop = v => topOverlay()?.close(v);
export const overlayOpen = () => stack.length > 0;
actions({ 'ov.close': () => closeTop() });

document.addEventListener('keydown', e => {
  const top = topOverlay();
  if (!top) return;
  if (e.key === 'Escape' && top.opts.dismiss !== false) { e.preventDefault(); top.close(); }
  if (e.key === 'Tab') { // 포커스 가두기
    const f = [...top.box.querySelectorAll(FOCUSABLE)].filter(x => x.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// ---------------------------------------------------------------- 확인 대화상자 (MO-COM-004)
export function confirmBox({ title, text = '', ok = '확인', cancel = '취소', danger = false, typeToConfirm = '' }) {
  const h = openOverlay({
    type: 'modal', screen: 'MO-COM-004', title, cls: 'ov-confirm',
    render: () => html`
      <h2 class="modal-title">${title}</h2>
      ${text ? html`<p class="modal-text">${text}</p>` : ''}
      ${typeToConfirm ? html`<label class="field"><span class="label">확인하려면 '${typeToConfirm}'을 입력하세요</span><input class="input" data-in="confirm.type" autocomplete="off" autofocus></label>` : ''}
      <div class="btn-row">
        <button class="btn" data-act="ov.close">${cancel}</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-act="confirm.ok" ${typeToConfirm ? 'disabled' : ''}>${ok}</button>
      </div>`,
  });
  h.typeToConfirm = typeToConfirm;
  return h.done.then(v => v === true);
}
actions({
  'confirm.ok': () => closeTop(true),
  'confirm.type': el => { const top = topOverlay(); top.box.querySelector('[data-act="confirm.ok"]').disabled = el.value.trim() !== top.typeToConfirm; },
});

// ---------------------------------------------------------------- 토스트 (MO-COM-003)
const toastQ = [];
let toastBusy = false;
export function toast(text, { icon = '', item = '', action = null, ms = 2500, cls = '' } = {}) {
  toastQ.push({ text, icon, item, action, ms, cls });
  if (!toastBusy) nextToast();
}
function nextToast() {
  const t = toastQ.shift();
  if (!t) { toastBusy = false; return; }
  toastBusy = true;
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast panel ${t.cls}`;
  el.setAttribute('role', 'status');
  el.innerHTML = str(html`${t.item ? itemIcon(t.item, 32) : t.icon ? uiIcon(t.icon, 24) : ''}<span class="toast-text">${t.text}</span>${t.action ? html`<button class="btn sm" data-toast-act>${t.action.label}</button>` : ''}`);
  if (t.action) el.querySelector('[data-toast-act]').onclick = () => { t.action.fn(); finish(); };
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const timer = setTimeout(finish, t.action ? Math.max(t.ms, 5000) : t.ms);
  function finish() {
    clearTimeout(timer);
    if (el.dataset.gone) return;
    el.dataset.gone = '1';
    el.classList.remove('show');
    setTimeout(() => { el.remove(); nextToast(); }, 160);
  }
}

// ---------------------------------------------------------------- 연출 대기열 (보상 팝업 → 레벨업 → 업적 순서)
let chain = Promise.resolve();
export function enqueue(fn) {
  chain = chain.then(() => fn()).catch(err => console.error(err));
  return chain;
}

// ---------------------------------------------------------------- 대화창 타자 효과
export function typeText(el, text, cps = 30) {
  if (!el) return { finish() {} };
  el._typing?.finish();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, timer = null;
  const ctl = {
    done: false,
    finish() { clearInterval(timer); el.textContent = text; ctl.done = true; el.classList.add('typed'); },
  };
  el._typing = ctl;
  el.classList.remove('typed');
  if (reduce) { ctl.finish(); return ctl; }
  el.textContent = '';
  timer = setInterval(() => {
    i += 1;
    el.textContent = text.slice(0, i);
    if (i >= text.length) ctl.finish();
  }, 1000 / cps);
  return ctl;
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const wait = ms => new Promise(r => setTimeout(r, ms));
