// 화면 공통 조각: 페이지 머리글, 빈 상태, 세그먼트 탭, 진행 바, 몽글이 대화창
import { html, num } from '../util.js';
import { uiIcon, itemIcon } from '../ui.js';
import { MASCOT, AVATARS } from '../art.js';
import { levelInfo } from '../game.js';
import { pixelURL } from '../pixel.js';
import { SITE, trail, currentKey } from '../nav.js';

/** 전체 메뉴 버튼 (모든 화면 머리글, REQ-06) */
const menuBtn = () => html`<button class="icon-btn menu-btn" data-act="nav.menu" aria-label="전체 메뉴 (단축키 M)" aria-haspopup="dialog" title="전체 메뉴 (M)">${uiIcon('menu', 24)}</button>`;

/** 현재 위치: 상위 화면 링크 (2단계 이상일 때만) */
function crumbs() {
  const t = trail(currentKey());
  if (t.length < 2) return '';
  return html`<nav class="crumbs" aria-label="현재 위치"><ol>${t.slice(0, -1).map(k => html`<li><a href="#/${k}">${SITE[k].title}</a></li>`)}</ol></nav>`;
}

/** 탭 첫 화면(back 없음)은 좁은 화면에서 한 줄 HUD를 보여 줌 (와이어프레임 공통 레이아웃 ②) */
export function pageHead(S, title, { back = '', right = '' } = {}) {
  const coins = html`<span class="coin-pill" aria-label="보유 조개 ${num(S.coins)}">${uiIcon('coin', 16)}${num(S.coins)}</span>`;
  if (!back) {
    const L = levelInfo(S.exp);
    const f = (AVATARS[S.profile.avatar] || AVATARS.straw).frames[0].slice(0, 16);
    const face = pixelURL('face:' + S.profile.avatar, f, Math.max(1, Math.round(24 * (window.devicePixelRatio || 1) / 16)));
    return html`<header class="page-head root">
      <div class="mini-hud"><img class="px mini-face" src="${face}" width="24" height="24" alt=""><b class="mini-name">${S.profile.name}</b><span class="lv">Lv.${L.lv}</span>${bar(L.cur, L.need, { cls: 'exp mini', label: '경험치' })}</div>
      <h1 class="page-title" tabindex="-1">${title}</h1>
      ${right || coins}${menuBtn()}
    </header>`;
  }
  const up = SITE[trail(currentKey()).slice(-2, -1)[0]]?.title;
  return html`<header class="page-head">
    <a class="icon-btn back" href="${back}" aria-label="${up ? `${up} 화면으로 돌아가기` : '뒤로'}">${uiIcon('arrow_left', 24)}</a>
    <div class="head-titles">${crumbs()}<h1 class="page-title" tabindex="-1">${title}</h1></div>
    ${right || coins}${menuBtn()}
  </header>`;
}

/** 같은 묶음 화면 사이를 옮겨 다니는 보조 탭 (링크) */
export const subnav = (items, cur, label) => html`<nav class="subnav" aria-label="${label}">${items.map(([k, l]) => html`<a class="subnav-a ${k === cur ? 'on' : ''}" href="#/${k}" ${k === cur ? html`aria-current="page"` : ''}>${uiIcon(SITE[k].icon, 16)}<span>${l}</span></a>`)}</nav>`;

export const empty = (text, btn = '') => html`<div class="empty panel">${mascotImg(48)}<p>${text}</p>${btn}</div>`;

/** 세그먼트 탭. items: [[값, 라벨, 개수?]] */
export const seg = (items, cur, act, label = '') => html`<div class="seg" role="tablist" ${label ? html`aria-label="${label}"` : ''}>
  ${items.map(([v, l, n]) => html`<button class="seg-btn ${v === cur ? 'on' : ''}" role="tab" aria-selected="${v === cur}" data-act="${act}" data-v="${v}">${l}${n != null ? html` <span class="seg-n">${n}</span>` : ''}</button>`)}
</div>`;

/** 칸 나뉜 픽셀 진행 바 */
export const bar = (cur, max, { cls = '', label = '', segs = 10 } = {}) => {
  const p = max ? Math.max(0, Math.min(1, cur / max)) : 0;
  return html`<span class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${cur}" ${label ? html`aria-label="${label}"` : ''} style="--p:${p};--segs:${segs}"><span class="bar-fill"></span></span>`;
};

export const mascotImg = (size = 48, happy = false) => {
  const f = (happy && MASCOT.happy ? MASCOT.happy : MASCOT.frames);
  const s = Math.max(1, Math.round(size * (window.devicePixelRatio || 1) / 16));
  return html`<span class="mascot-anim" style="--w:${size}px" aria-hidden="true">
    <img class="px f1" src="${pixelURL('mascot0' + happy, f[0], s)}" width="${size}" height="${size}" alt="">
    <img class="px f2" src="${pixelURL('mascot1' + happy, f[1], s)}" width="${size}" height="${size}" alt="">
  </span>`;
};

/** 몽글이 대화창 (텍스트는 마운트 후 typeText로 채움) */
export const talkBox = (text, { act = '', id = '' } = {}) => html`<div class="talk panel" ${act ? html`data-act="${act}" data-silent="1" role="button" tabindex="0"` : ''}>
  ${mascotImg(40)}<p class="talk-text" ${id ? html`id="${id}"` : ''} aria-live="polite">${text}</p><span class="talk-next" aria-hidden="true">▼</span>
</div>`;

export const itemSlot = (S, info, { act = '', count = 0, size = 40, isNew = false, sil = false, label = '' } = {}) => html`<button class="slot r${info.rarity || 0} ${sil ? 'unknown' : ''}" ${act ? html`data-act="${act}" data-key="${info.key}"` : 'tabindex="-1"'} aria-label="${label || info.name}">
  ${itemIcon(info.icon, size, '', sil)}${count > 1 ? html`<span class="slot-count">x${count}</span>` : ''}${isNew ? html`<span class="slot-new">NEW</span>` : ''}
</button>`;

export const stars = n => html`<span class="stars" aria-label="난이도 ${n}">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;

export { itemIcon };
