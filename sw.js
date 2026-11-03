// 오프라인 실행용 서비스 워커 (NFR-OFF-001). 배포할 때마다 VERSION을 올리면 새 버전으로 교체됨 (NFR-OFF-002)
const VERSION = '1.2.0';
const CACHE = `dotdays-${VERSION}`;
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'fonts/Galmuri11.woff2', 'fonts/Galmuri11-Bold.woff2', 'fonts/OFL.txt',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'js/app.js', 'js/nav.js', 'js/art.js', 'js/data.js', 'js/dday.js', 'js/fx.js', 'js/game.js', 'js/pixel.js', 'js/scene.js', 'js/sound.js',
  'js/sprites-items.js', 'js/sprites-ui.js', 'js/sprites-variants.js', 'js/sprites-fx.js', 'js/store.js', 'js/sync.js', 'js/ui.js', 'js/util.js',
  'js/views/common.js', 'js/views/dday.js', 'js/views/insights.js', 'js/views/menu.js', 'js/views/manage.js', 'js/views/dive.js', 'js/views/me.js', 'js/views/onboarding.js',
  'js/views/quests.js', 'js/views/settings.js', 'js/views/shop.js', 'js/views/village.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('dotdays-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 같은 출처 파일은 캐시 우선(오프라인), GitHub API(동기화)는 항상 네트워크
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && !url.pathname.includes('/tools/')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('index.html'))),
  );
});
