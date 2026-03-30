const CACHE_VERSION = 'v20260330';
const CACHE_NAME = `work-guide-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  '/',
  `/index.html?v=${CACHE_VERSION}`,
  `/css/style.css?v=${CACHE_VERSION}`,
  `/js/app.js?v=${CACHE_VERSION}`,
  '/data/guide-data.json',
  `/manifest.json?v=${CACHE_VERSION}`
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 激活时清理所有旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('work-guide-'))
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 网络优先，失败则回退到缓存
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // 先克隆，再返回原response
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
