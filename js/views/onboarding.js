// 온보딩: 타이틀(MO-ONB-001) → 모험가 만들기(MO-ONB-002) → 첫 퀘스트 고르기(MO-ONB-003) → 몽글이 소개
import { store, readBackupFile } from '../store.js';
import { starterState } from '../game.js';
import { STARTER_QUESTS, SLOTS, AVATAR_IDS, APP_VERSION, DIFF } from '../data.js';
import { AVATARS } from '../art.js';
import { html } from '../util.js';
import { actions, openOverlay, toast, confirmBox, uiIcon, attrIcon, typeText, wait } from '../ui.js';
import { mountScene } from '../scene.js';
import { sfx, unlockAudio } from '../sound.js';
import { levelInfo } from '../game.js';
import { mascotImg, stars } from './common.js';
import { repeatText } from './quests.js';
import { avatarImg } from './me.js';

const ob = { step: 0, name: '', avatar: 'straw', picked: new Set(STARTER_QUESTS.map((q, i) => (q.pick ? i : -1)).filter(i => i >= 0)) };
let unmount = null;

const SCREENS = ['MO-ONB-001', 'MO-ONB-002', 'MO-ONB-003'];
export const startPage = {
  get screen() { return SCREENS[ob.step]; },
  setStep(n) { ob.step = n; }, // 체험 모드에서 단계 바로 가기
  fullscreen: true,
  render() {
    if (ob.step === 0) return html`<div class="title-screen">
      <canvas class="scene full" id="title-canvas" role="img" aria-label="노을 지는 물빛 마을"></canvas>
      <div class="title-box">
        <h1 class="logo"><span class="logo-main">도트 데이즈</span><span class="logo-sub">여름날의 루틴 RPG</span></h1>
        <div class="title-menu panel">
          <button class="menu-item cursor" data-act="ob.start" autofocus>모험 시작</button>
          <label class="menu-item cursor">백업 불러오기<input type="file" accept=".json,application/json" data-in="ob.import" hidden></label>
        </div>
        <p class="ver">v${APP_VERSION}</p>
      </div>
    </div>`;
    if (ob.step === 1) return html`<div class="ob">
      <div class="talk panel">${mascotImg(40)}<p class="talk-text">물빛 마을에 온 걸 환영해! 너의 이름은?</p></div>
      <label class="field"><span class="label">모험가 이름 <small>1~10자</small></span><input class="input big" data-in="ob.name" maxlength="10" value="${ob.name}" placeholder="모험가" autocomplete="off" autofocus></label>
      <div class="field"><span class="label">캐릭터</span>
        <div class="avatar-pick big">${AVATAR_IDS.map(id => html`<button class="avatar-card ${ob.avatar === id ? 'on' : ''}" data-act="ob.avatar" data-v="${id}" aria-pressed="${ob.avatar === id}">
          ${avatarImg(id, 48)}<b>${AVATARS[id].name}</b><small>${AVATARS[id].desc}</small></button>`)}</div></div>
      <div class="btn-row"><button class="btn" data-act="ob.back">이전</button><button class="btn primary grow" data-act="ob.next">다음</button></div>
    </div>`;
    const groups = ['morning', 'afternoon', 'evening', 'any'];
    return html`<div class="ob">
      <div class="talk panel">${mascotImg(40)}<p class="talk-text">매일의 루틴이 곧 퀘스트야. 해보고 싶은 걸 골라 봐!</p></div>
      ${groups.map(g => {
        const items = STARTER_QUESTS.map((q, i) => [q, i]).filter(([q]) => q.slot === g);
        return items.length ? html`<h3 class="group-head">${SLOTS[g].name}</h3><div class="starter-list">${items.map(([q, i]) => html`
          <button class="starter panel ${ob.picked.has(i) ? 'on' : ''}" data-act="ob.pick" data-v="${i}" aria-pressed="${ob.picked.has(i)}">
            <span class="check-box">${ob.picked.has(i) ? uiIcon('check', 16) : ''}</span>
            ${attrIcon(q.attrs[0], 24)}<span class="starter-body"><b>${q.name}</b><small>${repeatText({ repeat: { days: [], ...q.repeat } })}${q.times > 1 ? ` ${q.times}회` : ''} · ${DIFF[q.diff].name} ${stars(q.diff)}</small></span>
          </button>`)}</div>` : '';
      })}
      <p class="muted center">${ob.picked.size}개 선택 · 나중에 얼마든지 바꿀 수 있어요</p>
      <div class="btn-row"><button class="btn" data-act="ob.back">이전</button><button class="btn primary grow" data-act="ob.finish">모험 떠나기!</button></div>
    </div>`;
  },
  mounted(root) {
    unmount?.(); unmount = null;
    const c = root.querySelector('#title-canvas');
    if (c) unmount = mountScene(c, 'village', () => ({ time: 'sunset', avatar: ob.avatar }));
  },
  unmounted() { unmount?.(); unmount = null; },
};

/** 몽글이 소개 대화 3단계 (FR-ONB-007) */
async function introTalk() {
  const lines = [
    '좋아! 퀘스트를 완료하면 경험치와 조개를 받아. 가끔 아이템도 떨어지지!',
    '모은 조개로는 상점에서 내가 정한 보상을 살 수 있어. 게임 1시간, 달콤한 간식 같은 거!',
    '놓친 날이 있어도 괜찮아. 조개는 사라지지 않아. 그럼 같이 여름 모험을 시작해 볼까?',
  ];
  for (let i = 0; i < lines.length; i++) {
    const h = openOverlay({
      type: 'modal', screen: 'MO-ONB-003', title: '몽글이', cls: 'ov-talk', dismiss: true,
      render: () => html`<div class="talk-modal" data-act="ov.close" data-silent="1">${mascotImg(64, i === 2)}<p class="talk-text" id="intro-text"></p><span class="talk-next">${i + 1}/3 ▼</span></div>`,
    });
    typeText(document.getElementById('intro-text'), lines[i]);
    await h.done;
    sfx('tap');
  }
}

actions({
  'ob.start': () => { unlockAudio(); sfx('complete'); ob.step = 1; store.emit({}); },
  'ob.back': () => { ob.step = Math.max(0, ob.step - 1); store.emit({}); },
  'ob.name': el => { ob.name = el.value; },
  'ob.avatar': el => { ob.avatar = el.dataset.v; store.emit({}); },
  'ob.next': () => { ob.name = ob.name.trim(); ob.step = 2; store.emit({}); },
  'ob.pick': el => { const i = +el.dataset.v; ob.picked.has(i) ? ob.picked.delete(i) : ob.picked.add(i); store.emit({}); },
  'ob.finish': async () => {
    sfx('level');
    store.set(starterState({ name: ob.name || '모험가', avatar: ob.avatar }, [...ob.picked].sort((a, b) => a - b)));
    ob.step = 0;
    location.hash = '#/village';
    await wait(300);
    await introTalk();
  },
  'ob.import': async el => {
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    const data = await readBackupFile(file);
    if (!data) { sfx('error'); toast('도트 데이즈 백업 파일이 아니에요', { icon: 'close' }); return; }
    const ok = await confirmBox({ title: '이 백업으로 시작할까요?', text: `${data.profile.name} · Lv.${levelInfo(data.exp).lv} · 퀘스트 ${data.quests.length}개`, ok: '시작' });
    if (!ok) return;
    store.set(data, { replaced: true });
    location.hash = '#/village';
  },
});
