// 설정(MO-SET-001), 백업·동기화(MO-SET-002), 동기화 충돌 선택(MO-COM-005)
import { store, exportBackup, readBackupFile, saveRestorePoint, getRestorePoint, clearRestorePoint, DEMO } from '../store.js';
import { levelInfo } from '../game.js';
import { AVATARS } from '../art.js';
import { APP_VERSION, AVATAR_IDS } from '../data.js';
import { html, num, fmtDateTime, ago } from '../util.js';
import { actions, openOverlay, toast, confirmBox, uiIcon, closeTop } from '../ui.js';
import { setSoundEnabled, sfx } from '../sound.js';
import { getSync, connect, disconnect, syncNow, syncState, setAuto, resolve } from '../sync.js';
import { pageHead } from './common.js';
import { avatarImg } from './me.js';

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const radio = (act, cur, items, cls = '') => html`<div class="chips ${cls}">${items.map(([v, l]) => html`<button class="chip ${String(cur) === String(v) ? 'on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`)}</div>`;

export const settingsPage = {
  screen: 'MO-SET-001', tab: 'me',
  render(S) {
    const st = S.settings;
    const sync = getSync();
    const lastSafe = Math.max(S.meta.lastBackup || 0, S.meta.lastSync || 0);
    return html`${pageHead(S, '설정', { back: '#/me' })}
    <div class="content settings">
      <section class="panel set-sec"><h2 class="sec-title">프로필</h2>
        <label class="field"><span class="label">이름</span><input class="input" data-in="set.name" maxlength="10" value="${S.profile.name}" autocomplete="off"></label>
        <div class="avatar-pick">${AVATAR_IDS.map(id => html`<button class="avatar-card ${S.profile.avatar === id ? 'on' : ''}" data-act="set.avatar" data-v="${id}" aria-pressed="${S.profile.avatar === id}">${avatarImg(id, 32)}<span>${AVATARS[id].name}</span></button>`)}</div>
      </section>
      <section class="panel set-sec"><h2 class="sec-title">화면·소리</h2>
        <label class="toggle-row"><span>${uiIcon(st.sound ? 'sound_on' : 'sound_off', 24)} 효과음</span><input type="checkbox" class="toggle" data-in="set.sound" ${st.sound ? 'checked' : ''}></label>
        <div class="field"><span class="label">마을 배경</span>${radio('set.theme', st.theme, [['auto', '자동'], ['day', '낮'], ['sunset', '노을'], ['night', '밤']], 'four')}</div>
        <div class="field"><span class="label">하루 시작 시각 <small>이 시각 전에 한 일은 전날 기록</small></span>${radio('set.dayStart', st.dayStart, [0, 1, 2, 3, 4, 5, 6].map(h => [h, `${h}시`]), 'four')}</div>
        <div class="field"><span class="label">D+day 계산</span>${radio('set.dplus', st.dplusFrom1 ? 1 : 0, [[1, '시작일 = 1일째'], [0, '시작일 = 0일째']], 'two')}</div>
      </section>
      <nav class="menu panel">
        <a class="menu-item" href="#/settings/data">${uiIcon('cloud_sync', 24)}<span>백업·동기화</span><b class="muted">${sync?.gistId ? 'GitHub 연결됨' : lastSafe ? `백업 ${ago(lastSafe)}` : '백업 없음'}</b></a>
      </nav>
      <details class="panel set-sec"><summary class="sec-title">${uiIcon('download', 16)} 홈 화면에 설치하기 ${isStandalone() ? html`<span class="badge ok">설치됨 ✓</span>` : ''}</summary>
        <dl class="install">
          <dt>iPhone · iPad</dt><dd>Safari로 열기 → 아래(또는 위) <b>공유</b> 버튼 → <b>홈 화면에 추가</b></dd>
          <dt>Android</dt><dd>Chrome으로 열기 → 오른쪽 위 <b>⋮</b> → <b>앱 설치</b> (또는 홈 화면에 추가)</dd>
          <dt>Mac</dt><dd>Safari: <b>파일 → Dock에 추가</b> / Chrome: 주소창 오른쪽 <b>설치</b> 아이콘</dd>
        </dl>
        <p class="hint">설치하면 주소창 없이 앱처럼 열리고, 인터넷 없이도 쓸 수 있어요.</p>
      </details>
      <details class="panel set-sec"><summary class="sec-title">${uiIcon('info', 16)} 앱 정보</summary>
        <p>도트 데이즈 v${APP_VERSION}</p>
        <p class="hint">모든 도트 그림(아이템·캐릭터·마을)과 효과음은 이 앱을 위해 새로 만들었어요.</p>
        <p class="hint">글꼴: 갈무리(Galmuri) © Lee Minseo — SIL Open Font License 1.1 (<a href="fonts/OFL.txt" target="_blank" rel="noopener">라이선스 보기</a>)</p>
        <p class="hint">데이터는 이 기기와, 연결한 경우 내 GitHub 비공개 Gist에만 저장돼요. 광고·분석 도구는 없어요.</p>
      </details>
      <section class="panel set-sec danger-zone"><h2 class="sec-title">데이터 초기화</h2>
        <p class="hint">모든 퀘스트·아이템·기록을 지우고 처음부터 시작해요. 되돌릴 수 없어요.</p>
        <button class="btn danger" data-act="set.reset">${uiIcon('trash', 16)} 모든 데이터 초기화</button></section>
    </div>`;
  },
};

export const dataPage = {
  screen: 'MO-SET-002', tab: 'me',
  render(S) {
    const sync = getSync();
    const rp = getRestorePoint();
    return html`${pageHead(S, '백업·동기화', { back: '#/settings' })}
    <div class="content settings">
      <section class="panel set-sec"><h2 class="sec-title">${uiIcon('download', 16)} 백업 파일</h2>
        <p class="hint">모든 기록을 파일 하나로 저장해요. 다른 기기에서 불러오면 그대로 이어서 쓸 수 있어요.</p>
        <p class="muted">마지막 백업: ${S.meta.lastBackup ? fmtDateTime(S.meta.lastBackup) : '없음'}</p>
        <div class="btn-row wrap"><button class="btn primary" data-act="data.export">${uiIcon('download', 16)} 백업 파일 저장</button>
          <label class="btn">${uiIcon('upload', 16)} 백업 불러오기<input type="file" accept=".json,application/json" data-in="data.import" hidden></label></div>
      </section>
      <section class="panel set-sec"><h2 class="sec-title">${uiIcon('cloud_sync', 16)} GitHub 동기화 <small class="muted">무료 · 선택</small></h2>
        ${DEMO ? html`<p class="hint">체험 모드에서는 동기화를 쓸 수 없어요.</p>` : sync?.gistId ? html`
          <p class="sync-ok">${uiIcon('check', 16)} <b>${sync.login}</b> 계정에 연결됨</p>
          <p class="muted">마지막 동기화: ${sync.lastSyncAt ? fmtDateTime(sync.lastSyncAt) : '-'} ${syncState.busy ? '· 동기화 중…' : ''}</p>
          ${syncState.error ? html`<p class="error">${syncState.error}</p>` : ''}
          <label class="toggle-row"><span>자동 동기화 <small class="muted">열 때 받기, 바뀌면 10초 뒤 올리기</small></span><input type="checkbox" class="toggle" data-in="sync.auto" ${sync.auto ? 'checked' : ''}></label>
          <div class="btn-row wrap"><button class="btn primary" data-act="sync.now" ${syncState.busy ? 'disabled' : ''}>지금 동기화</button><button class="btn" data-act="sync.off">연결 해제</button></div>` : html`
          <p class="hint">GitHub 개인 토큰을 넣으면 내 계정의 <b>비공개 Gist</b>에 기록을 저장해 아이폰·아이패드·맥·안드로이드에서 같은 데이터를 써요.</p>
          <label class="field"><span class="label">개인 토큰 (gist 권한)</span><input class="input" type="password" id="gist-token" autocomplete="off" placeholder="github_pat_… 또는 ghp_…"></label>
          ${syncState.error ? html`<p class="error">${syncState.error}</p>` : ''}
          <button class="btn primary" data-act="sync.connect" ${syncState.busy ? 'disabled' : ''}>${syncState.busy ? '연결 중…' : '연결'}</button>
          <details class="howto"><summary>토큰 만드는 법</summary><ol>
            <li>github.com 로그인 → 오른쪽 위 프로필 → <b>Settings</b></li>
            <li>맨 아래 <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b></li>
            <li>이름: dot-days, 만료: 원하는 기간 → <b>Account permissions</b>의 <b>Gists</b>를 <b>Read and write</b>로</li>
            <li>만든 토큰을 복사해 위 칸에 붙여넣기 (토큰은 이 기기에만 저장되고 백업 파일에도 들어가지 않아요)</li>
          </ol></details>`}
      </section>
      <section class="panel set-sec"><h2 class="sec-title">복원 지점</h2>
        ${rp ? html`<p>${fmtDateTime(rp.savedAt)} 저장 · ${rp.data?.profile?.name} Lv.${levelInfo(rp.data?.exp || 0).lv} <small class="muted">(${rp.reason})</small></p>
          <button class="btn" data-act="data.restore">이 상태로 되돌리기</button>` : html`<p class="hint">불러오기·동기화로 데이터를 덮어쓰기 전 상태를 하나 보관해요. 아직 없어요.</p>`}
      </section>
    </div>`;
  },
};

const summary = d => html`<b>${d.profile.name}</b> · Lv.${levelInfo(d.exp).lv} · 🐚 ${num(d.coins)} · 퀘스트 ${d.quests.length}개`;

/** 동기화 충돌 선택 (MO-COM-005) */
export function askConflict(remote) {
  const local = store.S;
  const h = openOverlay({
    type: 'modal', screen: 'MO-COM-005', title: '동기화 충돌', dismiss: false,
    render: () => html`<h2 class="modal-title">어느 쪽 기록을 남길까요?</h2>
      <p class="modal-text">두 곳의 데이터가 모두 바뀌었어요. 고르지 않은 쪽은 복원 지점에 보관돼요.</p>
      <button class="choice panel" data-act="conflict.pick" data-v="local"><span class="choice-h">${uiIcon('home', 24)} 이 기기</span>${summary(local)}<small>마지막 수정 ${fmtDateTime(local.meta.updatedAt)}</small></button>
      <button class="choice panel" data-act="conflict.pick" data-v="remote"><span class="choice-h">${uiIcon('cloud_sync', 24)} 클라우드</span>${summary(remote.data)}<small>저장 ${fmtDateTime(Date.parse(remote.savedAt))}</small></button>
      <button class="btn ghost block" data-act="ov.close">나중에 정하기</button>`,
  });
  return h.done.then(v => v || null);
}

actions({
  // 입력 중에는 화면을 다시 그리지 않음(커서 유지). 다른 화면으로 가면 반영됨
  'set.name': el => { const v = el.value.trim(); if (v) store.update(S => { S.profile.name = v; }, { silent: true }); },
  'set.avatar': el => store.update(S => { S.profile.avatar = el.dataset.v; }),
  'set.sound': el => { store.update(S => { S.settings.sound = el.checked; }); setSoundEnabled(el.checked); sfx('tap'); },
  'set.theme': el => store.update(S => { S.settings.theme = el.dataset.v; }),
  'set.dayStart': el => store.update(S => { S.settings.dayStart = +el.dataset.v; }),
  'set.dplus': el => store.update(S => { S.settings.dplusFrom1 = el.dataset.v === '1'; }),
  'set.reset': async () => {
    const ok = await confirmBox({ title: '모든 데이터를 초기화할까요?', text: '퀘스트, 아이템, 기록이 모두 사라져요. 백업 파일이 있다면 나중에 불러올 수 있어요.', ok: '초기화', danger: true, typeToConfirm: '초기화' });
    if (!ok) return;
    saveRestorePoint(store.S, '초기화 전');
    store.clear();
    location.hash = '#/start';
  },
  'data.export': async () => {
    const r = await exportBackup(store.S);
    if (r === 'cancel') return;
    store.update(S => { S.meta.lastBackup = Date.now(); }, { noTouch: true });
    toast('백업 파일을 저장했어요', { icon: 'download' });
  },
  'data.import': async el => {
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    const data = await readBackupFile(file);
    if (!data) { sfx('error'); toast('도트 데이즈 백업 파일이 아니에요', { icon: 'close' }); return; }
    const ok = await confirmBox({ title: '이 백업으로 덮어쓸까요?', text: `${data.profile.name} · Lv.${levelInfo(data.exp).lv} · 퀘스트 ${data.quests.length}개 (${data.meta?.updatedAt ? fmtDateTime(data.meta.updatedAt) : '시각 모름'} 저장). 지금 데이터는 복원 지점에 보관돼요.`, ok: '덮어쓰기', danger: true });
    if (!ok) return;
    if (store.S) saveRestorePoint(store.S, '백업 불러오기 전');
    data.meta.updatedAt = Date.now();
    store.set(data, { replaced: true });
    toast('백업을 불러왔어요', { icon: 'upload' });
    location.hash = '#/village';
  },
  'data.restore': async () => {
    const rp = getRestorePoint();
    if (!rp) return;
    const ok = await confirmBox({ title: '복원 지점으로 되돌릴까요?', text: '지금 데이터와 복원 지점을 서로 바꿔요.', ok: '되돌리기' });
    if (!ok) return;
    const cur = store.S;
    rp.data.meta.updatedAt = Date.now();
    store.set(rp.data, { replaced: true });
    if (cur) saveRestorePoint(cur, '되돌리기 전'); else clearRestorePoint();
    toast('되돌렸어요', { icon: 'check' });
  },
  'sync.connect': async () => {
    const token = document.getElementById('gist-token')?.value || '';
    if (!token.trim()) { toast('토큰을 넣어 주세요', { icon: 'info' }); return; }
    syncState.busy = true; syncState.error = ''; store.emit({});
    try {
      const r = await connect(token);
      syncState.busy = false;
      if (r.found) {
        const choice = await askConflict(r.found);
        if (choice) await resolve(choice, r.found);
      }
      toast(`GitHub(${r.login})에 연결됐어요`, { icon: 'cloud_sync' });
    } catch (e) {
      syncState.busy = false; syncState.error = e.message || '연결 실패'; sfx('error');
    }
    store.emit({});
  },
  'sync.now': async () => {
    const r = await syncNow({ onConflict: askConflict, manual: true });
    if (r === 'pushed' || r === 'pulled' || r === 'same' || r === 'resolved') toast('동기화했어요', { icon: 'cloud_sync' });
    store.emit({});
  },
  'sync.auto': el => { setAuto(el.checked); store.emit({}); },
  'sync.off': async () => {
    const ok = await confirmBox({ title: 'GitHub 연결을 해제할까요?', text: '이 기기에서 토큰을 지워요. Gist의 데이터는 남아요.', ok: '해제' });
    if (ok) { disconnect(); store.emit({}); }
  },
  'conflict.pick': el => closeTop(el.dataset.v),
});
