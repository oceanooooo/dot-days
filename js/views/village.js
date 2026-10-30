// 마을(MO-HOM-001): 왼쪽(넓은 화면)·위쪽(좁은 화면) 무대 = HUD + 마을 씬 + 몽글이 대화 + 고정 디데이, 본문 = 오늘의 퀘스트
import { store } from '../store.js';
import { today, todayQuests, isDone, levelInfo, titleOf } from '../game.js';
import { TIPS } from '../data.js';
import { AVATARS } from '../art.js';
import { pixelURL } from '../pixel.js';
import { ddayView } from '../dday.js';
import { html, str, num, pick } from '../util.js';
import { actions, uiIcon, uiAnim, itemIcon, typeText } from '../ui.js';
import { mountScene, timeOfDay } from '../scene.js';
import { sfx } from '../sound.js';
import { bar, talkBox } from './common.js';
import { todayGroups } from './quests.js';

// ---------------------------------------------------------------- 몽글이 대사 우선순위 (기능명세서 8-1)
export function celebrations(S, day) {
  return S.ddays.map(dd => ({ dd, v: ddayView(dd, day, S.settings.dplusFrom1) })).filter(x => x.v.celebrate);
}
export function mongleMessage(S, day, now = new Date()) {
  const cel = celebrations(S, day);
  if (cel.length) {
    const { dd, v } = cel[0];
    return { text: dd.kind === 'dplus' ? `〈${dd.name}〉 D+${v.count}! 축하해! 🎉` : `오늘은 〈${dd.name}〉 D-DAY야! 🎉`, happy: true };
  }
  const n = S.notice;
  if (n && n.day === day) {
    if (n.protectedDays) return { text: `놓친 퀘스트가 있었지만 부적이 연속 기록을 지켜줬어! (남은 부적 ${n.charmsLeft}개)` };
    if (n.clean && !n.broken.length) return { text: `어제는 〈${n.clean.name}〉${n.cleanCount > 1 ? ` 외 ${n.cleanCount - 1}개` : ''}를 참았어! 🛡 참기 보너스 받았어.`, happy: true };
    if (n.broken.length) return { text: `〈${n.broken[0]}〉${n.broken.length > 1 ? ` 외 ${n.broken.length - 1}개` : ''} 연속 기록이 끊겼어. 괜찮아, 오늘부터 다시 1일!` };
  }
  if (!S.quests.length) return { text: '퀘스트 게시판이 비어 있어. 첫 퀘스트를 붙여 볼까?' };
  const list = todayQuests(S, day);
  const left = list.filter(q => !isDone(S, q, day));
  if (list.length && !left.length) return { text: '오늘 퀘스트 전부 완료! 상점에서 나를 위한 보상을 골라 봐 ✨', happy: true };
  const h = now.getHours();
  if (h >= 18 || h < 4) {
    const risk = left.filter(q => q.repeat.type !== 'once' && q.streak >= 3).sort((a, b) => b.streak - a.streak)[0];
    if (risk) return { text: `〈${risk.name}〉 ${risk.streak}일 연속 기록이 오늘 끊길지도 몰라!` };
  }
  const lastSafe = Math.max(S.meta.lastBackup || 0, S.meta.lastSync || 0, S.profile.createdAt);
  if (Date.now() - lastSafe > 7 * 864e5) return { text: '기록을 지키려면 가끔 백업해 두자. 설정 > 백업·동기화!' };
  if (!list.length) return { text: '오늘은 쉬어가는 날! 새 퀘스트를 만들어 볼까?' };
  if (h >= 4 && h < 12) return { text: `좋은 아침! 오늘 퀘스트가 ${left.length}개 남았어.` };
  if (h >= 12 && h < 18) return { text: `오후도 힘내자! ${left.length}개 남았어.` };
  if (h >= 18) return { text: `오늘 하루 어땠어? ${left.length}개 남았어.` };
  return { text: '늦었네! 무리하지 말고 쉬어도 돼.' };
}

// ---------------------------------------------------------------- 무대 (HUD·씬·대화·고정 디데이)
let mounted = false, lastTalk = '', tipMode = false, tipTimer = 0, celebrateUntil = 0, happy = false;
const faceURL = (avatar, size) => {
  const f = (AVATARS[avatar] || AVATARS.straw).frames[0].slice(0, 16);
  return pixelURL('face:' + avatar, f, Math.max(1, Math.round(size * (window.devicePixelRatio || 1) / 16)));
};

export function hud(S) {
  const L = levelInfo(S.exp);
  return html`<div class="hud panel">
    <img class="px hud-face" src="${faceURL(S.profile.avatar, 40)}" width="40" height="40" alt="">
    <div class="hud-main">
      <div class="hud-row"><b class="hud-name">${S.profile.name}</b><span class="lv">Lv.${L.lv}</span><span class="hud-title">${titleOf(L.lv)}</span></div>
      <div class="hud-exp">${bar(L.cur, L.need, { cls: 'exp', label: '경험치' })}<span class="hud-num">${num(L.cur)}/${num(L.need)}</span></div>
    </div>
    <div class="hud-side">
      <span class="hud-coins" aria-label="보유 조개 ${num(S.coins)}">${uiAnim('coin', 24)}<b>${num(S.coins)}</b></span>
      ${S.buffs.luck > 0 ? html`<span class="hud-luck" title="행운 물약 효과">${itemIcon('clover', 16, '행운')}×${S.buffs.luck}</span>` : ''}
    </div>
  </div>`;
}

function ddChips(S, day) {
  const pins = S.ddays.filter(d => d.pinned).slice(0, 3);
  if (!pins.length) return '';
  return html`<nav class="dd-chips" aria-label="고정한 디데이">${pins.map(dd => {
    const v = ddayView(dd, day, S.settings.dplusFrom1);
    return html`<a class="dd-chip panel" href="#/dday">${itemIcon(dd.icon || 'letter', 16)}<span class="dd-chip-name">${dd.name}</span><b>${v.text}</b></a>`;
  })}</nav>`;
}

export function renderStage(S) {
  const stage = document.getElementById('stage');
  const day = today(S);
  if (!mounted) {
    stage.innerHTML = `<div id="hud-wrap"></div>
      <div class="scene-wrap"><canvas id="village-canvas" class="scene" role="img" aria-label="물빛 마을 풍경"></canvas></div>
      <div id="talk-wrap"></div><div id="dd-wrap"></div>`;
    mountScene(document.getElementById('village-canvas'), 'village', () => ({
      time: timeOfDay(store.S?.settings.theme), avatar: store.S?.profile.avatar, celebrate: Date.now() < celebrateUntil, happy,
    }));
    document.getElementById('talk-wrap').innerHTML = str(talkBox('', { act: 'mongle.tap', id: 'talk-text' }));
    mounted = true;
  }
  document.getElementById('hud-wrap').innerHTML = str(hud(S));
  document.getElementById('dd-wrap').innerHTML = str(ddChips(S, day));

  // 디데이 축하: 그날 첫 마을 진입 때 불꽃놀이 (FR-HOM-009)
  const cel = celebrations(S, day).filter(x => S.celebrated[x.dd.id] !== day);
  if (cel.length && location.hash.startsWith('#/village')) {
    celebrateUntil = Date.now() + 8000;
    sfx('firework');
    store.update(S2 => { for (const x of cel) S2.celebrated[x.dd.id] = day; }, { noTouch: true });
  }
  if (!tipMode) {
    const m = mongleMessage(S, day);
    happy = !!m.happy;
    if (m.text !== lastTalk) { lastTalk = m.text; typeText(document.getElementById('talk-text'), m.text); }
  }
}

// ---------------------------------------------------------------- 오늘의 퀘스트 (본문)
export const villagePage = {
  screen: 'MO-HOM-001', tab: 'village', stage: true,
  render(S) {
    const day = today(S);
    const list = todayQuests(S, day);
    const doneN = list.filter(q => isDone(S, q, day)).length;
    const groups = todayGroups(S, day);
    return html`<div class="content village-list">
      <div class="today-head">
        <h2 class="section-title">오늘의 퀘스트 <span class="muted">${doneN}/${list.length}</span></h2>
        <button class="btn sm primary" data-act="quest.new" aria-label="퀘스트 만들기">${uiIcon('plus', 16)} 추가</button>
      </div>
      ${list.length ? html`<div class="today-progress">${bar(doneN, list.length, { cls: 'mint', label: '오늘 진행률', segs: Math.min(12, list.length) })}</div>` : ''}
      ${groups || html`<div class="empty panel"><p>오늘은 쉬어가는 날! 새 퀘스트를 만들어 볼까?</p><button class="btn primary" data-act="quest.new">퀘스트 만들기</button></div>`}
    </div>`;
  },
};

actions({
  'mongle.tap': () => {
    const el = document.getElementById('talk-text');
    if (el?._typing && !el._typing.done) { el._typing.finish(); return; }
    sfx('tap');
    tipMode = true;
    let t = pick(TIPS);
    if (t === lastTalk) t = pick(TIPS);
    lastTalk = t;
    typeText(el, t);
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => { tipMode = false; }, 15000);
  },
});

export function resetStageTalk() { lastTalk = ''; tipMode = false; }
