// 체험 모드(?demo): 체험형 화면설계서(프로토타입)용 예시 데이터와 화면 ID로 바로 가기. 기기 저장소를 쓰지 않음
import { store } from './store.js';
import { starterState, today, makeQuest, completeQuest, grantItem, openChest, startDive, finishDive, checkAchievements, levelInfo, addExp, slipBad, useItem, savePreset } from './game.js';
import { addDays, setRandom, uid } from './util.js';
import { confirmBox, toast, closeTop, overlayOpen } from './ui.js';
import { showResult, chestPopup, levelUpPopup, slipPopup } from './fx.js';
import { openQuestEditor } from './views/quests.js';
import { openRewardEditor, pickIcon } from './views/shop.js';
import { openDdayEditor } from './views/dday.js';
import { askConflict } from './views/settings.js';
import { openPresetPicker, openAttrEditor } from './views/manage.js';
import { openDay } from './views/insights.js';
import { openMenu } from './views/menu.js';

function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

export function seedDemo() {
  setRandom(seeded(20261030));
  const S = starterState({ name: '여름이', avatar: 'straw' }, [0, 2, 3, 4, 5, 6, 7, 8]);
  const day = today(S);
  // 최근 10일은 실제로 완료 처리(연속 기록·레벨), 그 이전 17주는 잔디용 일별 기록만 채움
  const past = Date.now() - 120 * 864e5;
  for (const q of S.quests) { q.repeat.start = addDays(day, -120); q.createdAt = past; }
  S.quests.push(makeQuest({ name: '자격증 원서 접수', diff: 3, attrs: ['int'], repeat: { type: 'once', start: addDays(day, -3) }, slot: 'any', due: addDays(day, 4) }, day));
  S.quests.push(makeQuest({ name: '방 대청소', diff: 2, attrs: ['life'], repeat: { type: 'once', start: addDays(day, -2) }, slot: 'any' }, day));
  // v1.1 예시: 매월 반복, 유혹 3개, 보관한 퀘스트, 내 프리셋
  S.quests.push(makeQuest({ name: '저축 이체하기', diff: 2, attrs: ['wealth', 'grit'], icon: 'piggy_bank', repeat: { type: 'monthly', dates: [Number(day.slice(8)), 25], start: addDays(day, -90) } }, day));
  S.quests.push(makeQuest({ name: '가계부 쓰기', diff: 1, attrs: ['wealth'], icon: 'wallet', slot: 'evening', repeat: { type: 'daily', start: addDays(day, -30) } }, day));
  for (const [name, diff, attrs, monster, ago] of [['야식 먹기', 2, ['str'], 'slime', 12], ['자기 전 휴대폰 1시간', 2, ['grit'], 'imp', 3], ['충동구매', 3, ['wealth'], 'ghost', 20]]) {
    const q = makeQuest({ kind: 'bad', name, diff, attrs, monster, repeat: { type: 'daily', start: addDays(day, -40) } }, day);
    q.lastSlip = addDays(day, -ago); q.cleanBest = ago + 4; q.slips = 3; S.quests.push(q);
  }
  const arch = makeQuest({ name: '토익 단어장', diff: 3, attrs: ['int'], repeat: { type: 'daily', start: addDays(day, -60) }, best: 18 }, day);
  arch.archived = true; arch.archivedAt = Date.now() - 6 * 864e5; S.quests.push(arch);
  savePreset(S, { name: '헬스장 가기', diff: 3, attrs: ['str'], repeat: { type: 'weekly', days: [2, 4, 6] }, times: 1, slot: 'evening', icon: 'v:heart:red-vivid' });
  savePreset(S, { name: '책 한 챕터', diff: 2, attrs: ['int'], repeat: { type: 'daily' }, times: 1, slot: 'any', icon: 'book' });
  for (let i = 119; i > 10; i--) {
    const n = Math.random() < 0.15 ? 0 : Math.floor(Math.random() * 9);
    if (n) S.days[addDays(day, -i)] = { q: n, exp: n * 18, coins: n * 8, dive: 0 };
  }
  for (let i = 10; i >= 1; i--) {
    const d = addDays(day, -i);
    const t = Date.parse(d + 'T21:00:00');
    for (const q of S.quests.filter(x => x.repeat.type !== 'once')) {
      if (q.diff > 1 && i === 9) continue;
      for (let k = 0; k < q.times; k++) completeQuest(S, q.id, t + k * 1000);
    }
  }
  // 오늘 일부 완료
  const now = Date.now();
  completeQuest(S, S.quests[0].id, now - 3600e3); completeQuest(S, S.quests[0].id, now - 3000e3);
  completeQuest(S, S.quests[1].id, now - 2000e3);
  for (const id of ['chest_wood', 'chest_silver', 'potion_red', 'potion_green', 'charm', 'ramune', 'peach', 'shell', 'pearl']) grantItem(S, id);
  grantItem(S, 'r:' + S.rewards[2].id); grantItem(S, 'r:' + S.rewards[0].id, 2);
  grantItem(S, 'r:' + S.rewards[5].id); useItem(S, 'r:' + S.rewards[5].id); grantItem(S, 'r:' + S.rewards[0].id); useItem(S, 'r:' + S.rewards[0].id);
  S.slips = { [day]: {} };
  const tv = S.quests.find(q => q.name === '자기 전 휴대폰 1시간'); slipBad(S, tv.id, now - 1800e3);
  S.ddays = [
    { id: uid(), name: '여름 여행', date: addDays(day, 30), kind: 'dday', icon: 'parasol', memo: '오키나와 3박 4일', pinned: true, createdAt: now - 5e6 },
    { id: uid(), name: '루틴 시작한 날', date: addDays(day, -99), kind: 'dplus', icon: 'sunflower', memo: '', pinned: true, createdAt: now - 4e6 },
    { id: uid(), name: '엄마 생신', date: '1968-11-14', kind: 'yearly', icon: 'gift', memo: '케이크 예약', pinned: false, createdAt: now - 3e6 },
  ];
  S.stats.ddays = 3;
  S.stats.dives = 12; S.stats.diveMin = 330; S.stats.quests += 380;
  checkAchievements(S, day);
  S.lastSettled = addDays(day, -1);
  S.notice = null;
  S.meta.lastBackup = now - 2 * 864e5;
  for (const id of Object.keys(S.dex)) S.dex[id].seen = true;
  S.dex.pearl.seen = false;
  setRandom(Math.random);
  store.set(S, { replaced: true });
  return S;
}

/** 화면설계서에서 화면 ID를 누르면 그 화면을 띄움 */
export async function gotoScreen(id) {
  while (overlayOpen()) { closeTop(); await new Promise(r => setTimeout(r, 30)); }
  const S = store.S, day = today(S);
  const go = h => { if (location.hash !== h) location.hash = h; };
  if (S.dive && id !== 'MO-DIV-002') store.update(S2 => { S2.dive = null; });
  const routes = {
    'MO-HOM-001': '#/village', 'MO-QST-001': '#/quests', 'MO-SHP-001': '#/shop', 'MO-SHP-002': '#/shop/general', 'MO-BAG-001': '#/shop/bag',
    'MO-DIV-001': '#/dive', 'MO-ADV-001': '#/me', 'MO-ADV-002': '#/me/achievements', 'MO-ADV-003': '#/me/dex', 'MO-ADV-004': '#/me/records',
    'MO-DDY-001': '#/dday', 'MO-DDY-002': '#/dday/calc', 'MO-SET-001': '#/settings', 'MO-SET-002': '#/settings/data',
    'MO-ADV-005': '#/me/dashboard', 'MO-ADV-006': '#/me/history', 'MO-ADV-008': '#/me/calendar', 'MO-MNG-001': '#/manage', 'MO-MNG-002': '#/manage/presets', 'MO-MNG-003': '#/manage/archive', 'MO-MNG-004': '#/manage/attrs',
  };
  if (routes[id]) return go(routes[id]);
  if (id.startsWith('MO-ONB')) {
    const { startPage } = await import('./views/onboarding.js');
    go('#/start');
    const step = +id.slice(-1) - 1;
    startPage.setStep(step);
    store.emit({});
    return;
  }
  switch (id) {
    case 'MO-QST-002': go('#/quests'); return openQuestEditor(S.quests.find(q => q.name === '독서 20분') || S.quests[0]);
    case 'MO-SHP-003': go('#/shop'); return openRewardEditor(S.rewards[2]);
    case 'MO-SHP-004': go('#/shop'); return pickIcon('gamepad');
    case 'MO-BAG-002': go('#/shop/bag'); return document.querySelector('[data-key="potion_green"]')?.click();
    case 'MO-BAG-003': {
      go('#/shop/bag');
      store.update(S2 => grantItem(S2, 'chest_gold'));
      const res = store.update(S2 => openChest(S2, 'chest_gold'));
      return chestPopup(res);
    }
    case 'MO-DIV-002': go('#/dive'); return store.update(S2 => startDive(S2, 25, 'int', null, Date.now() - 7 * 60e3));
    case 'MO-DIV-003': {
      go('#/dive');
      const res = store.update(S2 => { startDive(S2, 25, 'int', null, Date.now() - 26 * 60e3); return finishDive(S2); });
      return showResult(res);
    }
    case 'MO-DDY-003': go('#/dday'); return openDdayEditor(S.ddays[0]);
    case 'MO-QST-003': go('#/quests'); openQuestEditor(); await new Promise(r => setTimeout(r, 200)); return openPresetPicker();
    case 'MO-QST-004': {
      go('#/quests');
      const q = S.quests.find(x => x.kind === 'bad' && x.name === '야식 먹기');
      const res = store.update(S2 => slipBad(S2, q.id));
      return slipPopup(res);
    }
    case 'MO-ADV-007': go('#/me/history'); return openDay(day);
    case 'MO-COM-006': go('#/me/dashboard'); return openMenu();
    case 'MO-MNG-005': go('#/manage/attrs'); return openAttrEditor(S.attrDefs.find(a => a.id === 'wealth'));
    case 'MO-COM-001': {
      go('#/village');
      const q = S.quests.find(x => x.repeat.type !== 'once' && x.times === 1 && !(S.done[day]?.[x.id]));
      if (!q) return;
      setRandom(() => 0.01); // 아이템이 떨어지는 경우를 보여줌
      const res = store.update(S2 => completeQuest(S2, q.id));
      setRandom(Math.random);
      return showResult(res);
    }
    case 'MO-COM-002': {
      go('#/village');
      // 다음 레벨까지 경험치를 채워 실제 레벨업(상자 지급)을 일으키고 레벨업 연출만 바로 보여줌
      const ups = store.update(S2 => { const L = levelInfo(S2.exp); return addExp(S2, L.need - L.cur, today(S2)); });
      return ups[0] && levelUpPopup(ups[0]);
    }
    case 'MO-COM-003': go('#/village'); toast('〈물 마시기〉 3/6', { icon: 'check', action: { label: '되돌리기', fn() {} } }); return toast('업적 달성! 〈첫 걸음〉 +🐚20', { item: 'feather', ms: 3000, cls: 'toast-achv' });
    case 'MO-COM-004': go('#/quests'); return confirmBox({ title: '〈독서 20분〉 퀘스트를 삭제할까요?', text: '지난 기록과 통계는 남아요.', ok: '삭제', danger: true });
    case 'MO-COM-005': {
      go('#/settings/data');
      const remote = JSON.parse(JSON.stringify(S));
      remote.exp += 180; remote.coins -= 120; remote.meta.updatedAt = Date.now() - 3600e3;
      return askConflict({ data: remote, savedAt: new Date(Date.now() - 3600e3).toISOString() });
    }
    default: return go('#/village');
  }
}
// 체험형 화면설계서(부모 창)에서 보내는 '이 화면 보기' 요청
addEventListener('message', e => { if (e.data?.type === 'dd-goto') gotoScreen(e.data.id); });
// ?demo&goto=MO-QST-002 처럼 열면 그 화면으로 바로 이동 (테스트·화면설계서용)
const gotoParam = new URLSearchParams(location.search).get('goto');
if (gotoParam) setTimeout(() => gotoScreen(gotoParam), 400);
