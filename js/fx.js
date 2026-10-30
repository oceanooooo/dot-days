// 보상 연출: 보상 팝업(MO-COM-001) → 레벨업(MO-COM-002) → 업적 알림(MO-COM-003), 상자 열기(MO-BAG-003), 다이빙 결과(MO-DIV-003)
import { store } from './store.js';
import { itemInfo, attrDef } from './game.js';
import { CHEST_OPEN } from './data.js';
import { html, josa, num } from './util.js';
import { openOverlay, enqueue, toast, itemIcon, uiIcon, uiAnim, attrIcon, fxHTML, tempterHTML, wait, reducedMotion, closeTop } from './ui.js';
import { sfx, buzz } from './sound.js';

const count = (el, to, ms = 400) => {
  if (!el) return;
  if (reducedMotion()) { el.textContent = num(to); return; }
  const t0 = performance.now();
  const step = t => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = num(Math.round(to * p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const itemLine = (it, verb = '얻었다') => {
  const info = itemInfo(store.S, it.id);
  return html`<li class="got ${info.rarity ? 'r' + info.rarity : ''}">
    <span class="slot sm r${info.rarity || 0}">${itemIcon(info.icon, 32, '')}${info.rarity >= 3 ? html`<span class="fx-over">${fxHTML('twinkle', 48)}</span>` : ''}</span>
    <span>${josa(info.name, '을/를')} ${verb}!</span>${it.isNew ? html`<b class="new">NEW!</b>` : ''}</li>`;
};
const attrLines = attrs => Object.entries(attrs || {}).map(([a, n]) =>
  html`<span class="attr-gain" style="--c:${attrDef(store.S, a).color}">${attrIcon(a, 16)} ${attrDef(store.S, a).name} +${n}</span>`);

/** 공통 보상 팝업. r: { title, exp, coins, attrs, items, mult, streak, extra } */
function rewardPopup(r) {
  return enqueue(async () => {
    sfx(r.items?.length ? 'item' : 'complete');
    if (r.coins) setTimeout(() => sfx('coin'), 160);
    buzz(15);
    const h = openOverlay({
      type: 'fx', screen: 'MO-COM-001', title: r.title, cls: 'ov-reward',
      render: () => html`
        <div class="panel reward-pop" data-act="ov.close" data-silent="1">
          <span class="fx-top" aria-hidden="true">${fxHTML(r.fx || 'burst', 96, { loop: false })}</span>
          <h2 class="reward-title">${r.title}</h2>
          ${r.sub ? html`<p class="reward-sub">${r.sub}</p>` : ''}
          <div class="reward-nums">
            ${r.exp ? html`<span class="gain exp">${uiAnim('exp', 24)} +<b data-count="${r.exp}">0</b> EXP</span>` : ''}
            ${r.coins ? html`<span class="gain coin">${uiAnim('coin', 24)} +<b data-count="${r.coins}">0</b></span>` : ''}
          </div>
          ${r.mult > 1 ? html`<p class="streak-bonus">${uiAnim('fire', 16)} 연속 ${r.streak}일 보너스 ×${r.mult}</p>` : ''}
          ${Object.keys(r.attrs || {}).length ? html`<div class="attr-gains">${attrLines(r.attrs)}</div>` : ''}
          ${r.items?.length ? html`<ul class="got-list">${r.items.map(it => itemLine(it))}</ul>` : ''}
          ${r.extra || ''}
          <p class="tap-hint">화면을 누르면 닫혀요 ▼</p>
        </div>`,
    });
    h.box.querySelectorAll('[data-count]').forEach(el => count(el, +el.dataset.count));
    const auto = !r.items?.length && !r.extra ? setTimeout(() => h.close(), 1600) : null;
    await h.done; clearTimeout(auto);
  });
}

function levelUpPopup(up) {
  return enqueue(async () => {
    sfx('level'); buzz(40);
    const h = openOverlay({
      type: 'fx', screen: 'MO-COM-002', title: '레벨 업', cls: 'ov-level',
      render: () => html`
        <div class="panel levelup">
          <span class="fx-top" aria-hidden="true">${fxHTML('confetti', 128, { loop: true })}</span>
          <div class="lvup-word" aria-hidden="true">${'LEVEL UP!'.split('').map((c, i) => html`<span style="--i:${i}">${c === ' ' ? '\u00a0' : c}</span>`)}</div>
          <p class="lvup-lv">Lv.${up.lv - 1} → <b>Lv.${up.lv}</b></p>
          ${up.titleChanged ? html`<p class="lvup-title">새 칭호 〈${up.title}〉</p>` : ''}
          <div class="lvup-gift"><span class="slot r2">${itemIcon(up.chest, 48)}</span><span>${josa(itemInfo(store.S, up.chest).name, '을/를')} 얻었다!</span></div>
          <button class="btn primary block" data-act="ov.close" autofocus>확인</button>
        </div>`,
    });
    await h.done;
  });
}

export function achievementToasts(list) {
  for (const a of list || []) enqueue(async () => { sfx('achv'); toast(`업적 달성! 〈${a.name}〉 +🐚${a.coins}`, { item: a.icon, ms: 3000, cls: 'toast-achv' }); await wait(400); });
}
function attrToasts(list) {
  for (const u of list || []) toast(`${attrDef(store.S, u.attr).name} Lv.${u.lv}!`, { icon: 'sparkle' });
}

/** 결과 객체(game.js)를 받아 순서대로 연출 */
export function showResult(res, opts = {}) {
  if (!res) return;
  if (res.kind === 'quest') {
    const q = res.quest;
    rewardPopup({
      title: `〈${q.name}〉 ${res.finished ? '완료!' : `${res.count}/${res.target}`}`,
      exp: res.exp, coins: res.coins, attrs: res.attrs, items: res.items, mult: res.mult, streak: res.streak,
      sub: res.perfect ? '오늘 퀘스트를 전부 완료했어! 완벽한 하루 ✨' : '',
    });
  } else if (res.kind === 'use') {
    if (res.info.reward) return;
    rewardPopup({ title: `${res.info.name} 사용!`, exp: res.exp, attrs: res.attrs, items: [], extra: res.luck ? html`<p class="reward-sub">행운 효과: 다음 완료 ${res.luck}회 드롭 확률 2배</p>` : '' });
  } else if (res.kind === 'dive') {
    divePopup(res);
  }
  for (const up of res.levelUps || []) levelUpPopup(up);
  enqueue(async () => attrToasts(res.attrUps));
  achievementToasts(res.achievements);
  if (res.kind === 'dive' && res.quest) achievementToasts(res.quest.achievements);
}

function divePopup(res) {
  return enqueue(async () => {
    sfx(res.success ? 'surface' : 'fail');
    const h = openOverlay({
      type: 'modal', screen: 'MO-DIV-003', title: '다이빙 결과', cls: 'ov-dive', dismiss: false,
      render: () => res.success ? html`
        <h2 class="modal-title">무사히 수면으로 올라왔다!</h2>
        <p class="modal-text">${res.minutes}분 동안 깊은 바다를 탐험했어.</p>
        <div class="reward-nums"><span class="gain exp">${uiIcon('exp', 24)} +${res.exp} EXP</span><span class="gain coin">${uiIcon('coin', 24)} +${res.coins}</span></div>
        ${Object.keys(res.attrs).length ? html`<div class="attr-gains">${attrLines(res.attrs)}</div>` : ''}
        ${res.items.length ? html`<ul class="got-list">${res.items.map(it => itemLine(it, '발견했다'))}</ul>` : html`<p class="muted">이번엔 바다 아이템을 찾지 못했어.</p>`}
        ${res.quest ? html`<div class="dive-quest panel inset"><b>〈${res.quest.quest.name}〉 완료!</b> +${res.quest.exp} EXP · 🐚 ${res.quest.coins}${res.quest.items.length ? html`<ul class="got-list">${res.quest.items.map(it => itemLine(it))}</ul>` : ''}</div>` : ''}
        <button class="btn primary block" data-act="ov.close" autofocus>확인</button>` : html`
        <h2 class="modal-title">산소가 부족해 수면으로 올라왔다…</h2>
        <p class="modal-text">괜찮아, 다음엔 더 깊이 가 보자! 이번 다이빙 보상은 없어.</p>
        <button class="btn primary block" data-act="ov.close" autofocus>확인</button>`,
    });
    await h.done;
  });
}

/** 상자 열기 연출 (MO-BAG-003) */
export function chestPopup(res) {
  return enqueue(async () => {
    const open = CHEST_OPEN[res.key];
    const shake = !reducedMotion();
    let opened = false;
    const h = openOverlay({
      type: 'modal', screen: 'MO-BAG-003', title: '상자 열기', cls: 'ov-chest', dismiss: false,
      render: () => html`
        <div class="chest-stage ${opened ? 'opened' : shake ? 'shaking' : ''}">
          <span class="chest-glow"></span>${itemIcon(opened ? open : res.key, 96, itemInfo(store.S, res.key).name)}${opened ? html`<span class="fx-over big">${fxHTML('twinkle', 140)}</span>` : ''}
        </div>
        ${opened ? html`
          <h2 class="modal-title">${itemInfo(store.S, res.key).name}에서 나온 것</h2>
          <ul class="got-list stagger">${res.items.map((it, i) => html`<li style="--i:${i}" class="got-wrap">${itemLine(it)}</li>`)}</ul>
          <p class="gain coin center">${uiIcon('coin', 24)} +${res.coins} 조개</p>
          <button class="btn primary block" data-act="ov.close" autofocus>확인</button>` : html`<p class="modal-text center">덜컹덜컹…</p>`}`,
    });
    sfx('chest');
    await wait(shake ? 850 : 200);
    opened = true; h.rerender();
    sfx('item');
    await h.done;
    achievementToasts(res.achievements);
  });
}

/** 유혹 기록 결과 (MO-QST-004): 비구름 + 웃는 몬스터 */
export function slipPopup(res) {
  return enqueue(async () => {
    sfx('fail');
    const h = openOverlay({
      type: 'modal', screen: 'MO-QST-004', title: '유혹 기록', cls: 'ov-slip',
      render: () => html`<div class="slip-stage"><span class="slip-rain">${fxHTML('rain', 72, { loop: true })}</span>${tempterHTML(res.quest.monster, 'laugh', 64)}</div>
        <h2 class="modal-title center">〈${res.quest.name}〉 기록 완료</h2>
        <p class="modal-text center">괜찮아. 기록한 것만으로도 한 걸음이야.</p>
        <div class="reward-nums"><span class="gain lose">${uiIcon('coin', 24)} −${res.coins}</span></div>
        <p class="muted center">참은 기록 ${res.clean}일 → 0일 · 최고 ${res.best}일</p>
        <button class="btn primary block" data-act="ov.close" autofocus>다시 참아 볼게</button>`,
    });
    await h.done;
  });
}

export { rewardPopup, levelUpPopup, closeTop };
