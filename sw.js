const CACHE = 'payback-shell-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'widget-template.json', 'widget-data.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'payback-data').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// ---- Widgets (Windows 11 / Edge widgets board) ----
async function stats() {
  const r = await (await caches.open('payback-data')).match('/widget-data');
  return r ? r.text() : await (await fetch('widget-data.json')).text();
}
async function renderWidget(widget) {
  if (!self.widgets) return;
  const template = await (await fetch(widget.definition.msAcTemplate || 'widget-template.json')).text();
  await self.widgets.updateByInstanceId(widget.instance.id, { template, data: await stats() });
}
async function refreshAll() {
  if (!self.widgets) return;
  const list = await self.widgets.matchAll();
  await Promise.all(list.map(renderWidget));
}
self.addEventListener('widgetinstall', e => e.waitUntil(renderWidget(e.widget)));
self.addEventListener('widgetresume', e => e.waitUntil(renderWidget(e.widget)));
self.addEventListener('widgetclick', e => {
  if (e.action === 'add') e.waitUntil(self.clients.openWindow('./index.html'));
});
self.addEventListener('message', e => { if (e.data === 'refresh-widgets') e.waitUntil(refreshAll()); });
