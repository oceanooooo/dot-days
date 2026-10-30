// 집중 다이빙: 준비(MO-DIV-001), 진행(MO-DIV-002). 결과(MO-DIV-003)는 fx.js
import { store } from '../store.js';
import { today, todayQuests, isDone, diveReward, startDive, diveProgress, finishDive, abandonDive, attrList, attrDef } from '../game.js';
import { DIVE } from '../data.js';
import { html, fmtMMSS, num } from '../util.js';
import { actions, confirmBox, uiIcon, attrIcon } from '../ui.js';
import { mountScene } from '../scene.js';
import { showResult } from '../fx.js';
import { sfx } from '../sound.js';
import { pageHead, bar } from './common.js';

let pick = { minutes: 25, attr: null, questId: '' };
let unmountScene = null, timer = 0, wakeLock = null;

function setupHTML(S) {
  const day = today(S);
  const open = todayQuests(S, day).filter(q => !isDone(S, q, day));
  if (pick.questId && !open.some(q => q.id === pick.questId)) pick.questId = '';
  const r = diveReward(pick.minutes);
  return html`${pageHead(S, '집중 다이빙')}
  <div class="content dive-setup">
    <div class="scene-wrap small"><canvas class="scene" id="dive-canvas" role="img" aria-label="바닷속 풍경"></canvas></div>
    <p class="lead">집중하는 동안 바다 깊이 잠수해요. 끝까지 버티면 보상과 바다 아이템을 얻어요.</p>
    <div class="field"><span class="label">잠수 시간</span>
      <div class="chips four">${DIVE.minutes.map(m => html`<button class="chip ${pick.minutes === m ? 'on' : ''}" data-act="dive.min" data-v="${m}" aria-pressed="${pick.minutes === m}">${m}분</button>`)}</div></div>
    <div class="field"><span class="label">능력치 <small>선택</small></span>
      <div class="chips attrs"><button class="chip ${!pick.attr ? 'on' : ''}" data-act="dive.attr" data-v="">없음</button>
      ${attrList(S).map(({ id, name }) => html`<button class="chip ${pick.attr === id ? 'on' : ''}" data-act="dive.attr" data-v="${id}" aria-pressed="${pick.attr === id}">${attrIcon(id, 16)}${name}</button>`)}</div></div>
    <label class="field"><span class="label">연결 퀘스트 <small>성공하면 함께 완료</small></span>
      <select class="input" data-in="dive.quest">
        <option value="">연결 안 함</option>
        ${open.map(q => html`<option value="${q.id}" ${pick.questId === q.id ? 'selected' : ''}>${q.name}</option>`)}
      </select></label>
    <div class="preview panel inset"><b>예상 보상</b> +${r.exp} EXP · 🐚 ${r.coins}${pick.attr ? ` · ${attrDef(S, pick.attr).name} +${r.attr}` : ''} · 바다 아이템 판정 ${r.rolls}회</div>
    <button class="btn primary block big" data-act="dive.start">${uiIcon('dive', 24)} 다이빙 시작</button>
    <p class="muted center">지금까지 ${num(S.stats.dives)}회 · ${num(S.stats.diveMin)}분 잠수했어요</p>
  </div>`;
}

function runHTML(S) {
  const p = diveProgress(S);
  const q = S.quests.find(x => x.id === S.dive.questId);
  return html`<div class="dive-run">
    <canvas class="scene full" id="dive-canvas" role="img" aria-label="잠수 중인 바닷속"></canvas>
    <div class="dive-hud">
      <p class="dive-time" id="dive-time" aria-live="off">${fmtMMSS(p.left)}</p>
      <p class="dive-depth" id="dive-depth">수심 ${p.depth}m / ${p.maxDepth}m</p>
      <div class="oxygen"><span class="ox-label">${uiIcon('dive', 16)} 산소</span><span id="dive-ox">${bar(p.left, p.total, { cls: 'ox', label: '남은 산소' })}</span></div>
      ${q ? html`<p class="dive-link">연결: ${q.name}</p>` : ''}
      ${S.dive.attr ? html`<p class="dive-link">${attrIcon(S.dive.attr, 16)} ${attrDef(S, S.dive.attr).name}</p>` : ''}
    </div>
    <button class="btn dive-quit" data-act="dive.quit">수면으로 올라가기</button>
  </div>`;
}

export const divePage = {
  get screen() { return store.S?.dive ? 'MO-DIV-002' : 'MO-DIV-001'; },
  tab: 'dive',
  get fullscreen() { return !!store.S?.dive; },
  render(S) { return S.dive ? runHTML(S) : setupHTML(S); },
  mounted(root) {
    const c = root.querySelector('#dive-canvas');
    unmountScene?.();
    unmountScene = c ? mountScene(c, 'dive', () => ({ depth: store.S?.dive ? diveProgress(store.S).ratio : 0 })) : null;
    clearInterval(timer);
    if (store.S.dive) {
      timer = setInterval(tick, 1000);
      requestWake();
    } else releaseWake();
  },
  unmounted() { clearInterval(timer); unmountScene?.(); unmountScene = null; releaseWake(); },
};

/** 1초마다: 숫자만 갱신, 끝나면 결과 (FR-DIV-002, 003) */
export function tick() {
  const S = store.S;
  if (!S?.dive) { clearInterval(timer); return; }
  const p = diveProgress(S);
  if (p.done) { completeDive(); return; }
  const t = document.getElementById('dive-time');
  if (t) {
    t.textContent = fmtMMSS(p.left);
    document.getElementById('dive-depth').textContent = `수심 ${p.depth}m / ${p.maxDepth}m`;
    const fill = document.querySelector('#dive-ox .bar');
    if (fill) fill.style.setProperty('--p', p.left / p.total);
  }
}
export function completeDive() {
  clearInterval(timer);
  const res = store.update(S => finishDive(S));
  releaseWake();
  if (res) showResult(res);
}

async function requestWake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch { /* 미지원·거부 시 무시 (FR-DIV-007) */ }
}
function releaseWake() { try { wakeLock?.release(); } catch { /* 무시 */ } wakeLock = null; }

actions({
  'dive.min': el => { pick.minutes = +el.dataset.v; store.emit({}); },
  'dive.attr': el => { pick.attr = el.dataset.v || null; store.emit({}); },
  'dive.quest': el => {
    pick.questId = el.value;
    const q = store.S.quests.find(x => x.id === el.value);
    if (q?.attrs[0] && !pick.attr) pick.attr = q.attrs[0];
    store.emit({});
  },
  'dive.start': () => {
    sfx('dive');
    store.update(S => startDive(S, pick.minutes, pick.attr, pick.questId));
  },
  'dive.quit': async () => {
    const ok = await confirmBox({ title: '수면으로 올라갈까요?', text: '지금 올라가면 이번 다이빙 보상은 받을 수 없어요.', ok: '올라가기', cancel: '계속 잠수', danger: true });
    if (!ok || !store.S.dive) return;
    const res = store.update(S => abandonDive(S));
    showResult(res);
  },
});
