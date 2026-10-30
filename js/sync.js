// GitHub Gist 동기화 (기능명세서 9장, FR-DAT-004~007). 토큰·Gist ID는 이 기기에만 저장 (NFR-SEC-002)
import { store, localGet, localSet, localDel, packBackup, unpackBackup, saveRestorePoint, DEMO } from './store.js';

const KEY = 'dotdays:sync';
const FILE = 'dot-days.json';
const API = 'https://api.github.com';

export const syncState = { busy: false, error: '', listeners: new Set() };
const notify = () => syncState.listeners.forEach(fn => fn());

export function getSync() {
  try { return JSON.parse(localGet(KEY)) || null; } catch { return null; }
}
function setSync(patch) {
  const cur = getSync() || {};
  const next = { ...cur, ...patch };
  localSet(KEY, JSON.stringify(next));
  return next;
}
export const isConnected = () => !!getSync()?.token && !!getSync()?.gistId;

async function gh(path, token, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error('토큰을 확인해 주세요. gist 권한이 필요해요'), { auth: true });
  if (!res.ok) throw new Error(`GitHub 응답 오류 (${res.status})`);
  return res.status === 204 ? null : res.json();
}
const payload = S => JSON.stringify(packBackup(S, 'sync'));

async function readRemote(sync) {
  const g = await gh(`/gists/${sync.gistId}`, sync.token);
  const f = g.files?.[FILE];
  if (!f) throw new Error('동기화 파일을 찾지 못했어요');
  let text = f.content;
  if (f.truncated) text = await (await fetch(f.raw_url)).text();
  const obj = JSON.parse(text);
  return { obj, savedAt: obj.savedAt, data: unpackBackup(obj) };
}
async function writeRemote(sync, S, keepalive = false) {
  const body = JSON.stringify({ files: { [FILE]: { content: payload(S) } } });
  const res = await fetch(`${API}/gists/${sync.gistId}`, {
    method: 'PATCH', keepalive, body,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${sync.token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`올리기 실패 (${res.status})`);
  const g = await res.json().catch(() => null);
  const savedAt = g?.files?.[FILE] ? JSON.parse(g.files[FILE].content).savedAt : new Date().toISOString();
  setSync({ lastSyncAt: Date.now(), remoteSavedAt: savedAt });
  store.update(S2 => { S2.meta.lastSync = Date.now(); }, { noTouch: true, silent: true });
}

/** 토큰으로 연결: 사용자 확인 → 기존 Gist 찾기/만들기. 반환 { login, found: {data, savedAt} | null } */
export async function connect(token) {
  token = token.trim();
  const user = await gh('/user', token);
  let gistId = null;
  for (let page = 1; page <= 3 && !gistId; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`, token);
    const g = list.find(x => x.files && x.files[FILE]);
    if (g) gistId = g.id;
    if (list.length < 100) break;
  }
  if (gistId) {
    setSync({ token, gistId, login: user.login, auto: true, lastSyncAt: 0, remoteSavedAt: null });
    const remote = await readRemote(getSync());
    return { login: user.login, found: remote };
  }
  const g = await gh('/gists', token, { method: 'POST', body: JSON.stringify({ description: 'Dot Days 동기화 데이터', public: false, files: { [FILE]: { content: payload(store.S) } } }) });
  setSync({ token, gistId: g.id, login: user.login, auto: true, lastSyncAt: Date.now(), remoteSavedAt: JSON.parse(g.files[FILE].content).savedAt });
  return { login: user.login, found: null };
}
export function disconnect() { localDel(KEY); syncState.error = ''; notify(); }
export function setAuto(on) { setSync({ auto: on }); notify(); }

/** 충돌 선택 결과 적용: 'local' | 'remote' */
export async function resolve(choice, remote) {
  const sync = getSync();
  if (choice === 'remote') {
    saveRestorePoint(store.S, '동기화로 덮어쓰기 전');
    store.set(remote.data, { replaced: true });
    setSync({ lastSyncAt: Date.now(), remoteSavedAt: remote.savedAt });
  } else {
    saveRestorePoint(remote.data, '동기화 충돌에서 선택하지 않은 클라우드 데이터');
    await writeRemote(sync, store.S);
  }
  notify();
}

/** 동기화 판단 (9-2). onConflict(remote) → 'local' | 'remote' | null(나중에) */
export async function syncNow({ onConflict, manual = false } = {}) {
  const sync = getSync();
  if (!sync?.token || !sync?.gistId || syncState.busy || DEMO) return 'skip';
  if (!navigator.onLine) { syncState.error = '인터넷에 연결되면 다시 동기화할게요'; notify(); return 'offline'; }
  syncState.busy = true; syncState.error = ''; notify();
  try {
    const remote = await readRemote(sync);
    const localChanged = (store.S.meta.updatedAt || 0) > (sync.lastSyncAt || 0);
    const remoteChanged = remote.savedAt !== sync.remoteSavedAt;
    if (localChanged && remoteChanged && sync.remoteSavedAt) {
      const choice = onConflict ? await onConflict(remote) : null;
      if (choice) await resolve(choice, remote);
      return choice ? 'resolved' : 'conflict';
    }
    if (remoteChanged && (!localChanged || !sync.remoteSavedAt) && remote.data) {
      saveRestorePoint(store.S, '동기화로 받기 전');
      store.set(remote.data, { replaced: true });
      setSync({ lastSyncAt: Date.now(), remoteSavedAt: remote.savedAt });
      return 'pulled';
    }
    if (localChanged || manual) { await writeRemote(sync, store.S); return 'pushed'; }
    return 'same';
  } catch (e) {
    syncState.error = e.message || '동기화 실패';
    return 'error';
  } finally {
    syncState.busy = false; notify();
  }
}

/** 앱을 떠날 때: 바뀐 게 있으면 올리기만 (keepalive) */
export function pushOnLeave() {
  const sync = getSync();
  if (!sync?.token || !sync?.gistId || !sync.auto || DEMO || !store.S) return;
  if ((store.S.meta.updatedAt || 0) <= (sync.lastSyncAt || 0)) return;
  writeRemote(sync, store.S, true).catch(() => {});
}

let timer = null;
/** 변경 후 10초 뒤 동기화 */
export function scheduleSync(onConflict) {
  const sync = getSync();
  if (!sync?.auto || !sync.token || DEMO) return;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow({ onConflict }), 10000);
}
