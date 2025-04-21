const CACHE = 'nutri-app-v1';
const ASSETS = [
  '/', 
  '/static/vendor/bootstrap-5.3.5-dist/css/bootstrap.min.css',
  '/static/js/main.js',
  '/static/data/nutrients.json'
  // 如有其它静态文件，可一并列入
];

// 安装时预缓存
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
);

// 拦截网络请求，离线时走缓存
self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);