/* Service worker: makes the app work 100% offline.
   If you change any file, bump the version number below. */
const V = 'calisthenics-v8';
const FILES = ['./', 'index.html', 'style.css', 'js/core.js', 'js/catalog.js', 'js/rank.js', 'js/art.js', 'js/bodydata.js', 'js/body.js', 'js/figs.js', 'img/fig-pullup.png', 'img/fig-pushup.png', 'img/fig-dips.png', 'img/fig-muscleup.png', 'img/fig-kneeraise.png', 'img/fig-legraise.png', 'img/fig-flraise.png', 'img/fig-frontlever.png', 'img/fig-backlever.png', 'img/fig-planche.png', 'img/fig-handstand.png', 'img/fig-hspu.png', 'img/fig-lsit.png', 'img/fig-humanflag.png', 'img/fig-nordic.png', 'img/fig-calfraise.png', 'img/fig-pistol.png', 'js/avmeta.js', 'js/chars.js', 'js/ui.js', 'js/sheets.js', 'js/main.js',
  'img/av/b01.png', 'img/av/b02.png', 'img/av/b03.png', 'img/av/b04.png', 'img/av/b05.png', 'img/av/b06.png', 'img/av/b07.png', 'img/av/b08.png', 'img/av/b09.png', 'img/av/b10.png', 'img/av/b11.png', 'img/av/b12.png', 'img/av/b13.png', 'img/av/b14.png', 'img/av/b15.png', 'img/av/b16.png', 'img/av/b17.png', 'img/av/b18.png', 'img/av/b19.png', 'img/av/b20.png', 'img/av/b21.png', 'img/av/b22.png', 'img/av/b23.png', 'img/av/b24.png', 'img/av/b25.png', 'img/av/b26.png', 'img/av/b27.png', 'img/av/c01.png', 'img/av/c02.png', 'img/av/c03.png', 'img/av/c04.png', 'img/av/c05.png', 'img/av/c06.png', 'img/av/c07.png', 'img/av/c08.png', 'img/av/c09.png', 'img/av/c10.png', 'img/av/c11.png', 'img/av/c12.png', 'img/av/c13.png', 'img/av/c14.png', 'img/av/c15.png', 'img/av/c16.png', 'img/av/c17.png', 'img/av/c18.png', 'img/av/c19.png', 'img/av/c20.png', 'img/av/c21.png', 'img/av/c22.png', 'img/av/c23.png', 'img/av/c24.png', 'img/av/c25.png', 'img/av/c26.png', 'img/av/c27.png', 'img/av/m01.png', 'img/av/m02.png', 'img/av/m03.png', 'img/av/m04.png', 'img/av/m05.png', 'img/av/m06.png', 'img/av/m07.png', 'img/av/m08.png', 'img/av/m09.png', 'img/av/m10.png', 'img/av/m11.png', 'img/av/m12.png', 'img/av/m13.png', 'img/av/m14.png', 'img/av/m15.png', 'img/av/m16.png', 'img/av/m17.png', 'img/av/m18.png', 'img/av/m19.png', 'img/av/m20.png', 'img/av/m21.png', 'img/av/m22.png', 'img/av/m23.png', 'img/av/m24.png', 'img/av/m25.png', 'img/av/m26.png', 'img/av/m27.png', 'img/av/s01.png', 'img/av/s02.png', 'img/av/s03.png', 'img/av/s04.png', 'img/av/s05.png', 'img/av/s06.png', 'img/av/s07.png', 'img/av/s08.png', 'img/av/s09.png', 'img/av/s10.png', 'img/av/s11.png', 'img/av/s12.png', 'img/av/s13.png', 'img/av/s14.png', 'img/av/s15.png', 'img/av/s16.png', 'img/av/s17.png', 'img/av/s18.png', 'img/av/s19.png', 'img/av/s20.png', 'img/av/s21.png', 'img/av/s22.png', 'img/av/s23.png', 'img/av/s24.png', 'img/av/s25.png', 'img/av/s26.png', 'img/av/s27.png',
  'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* opens from cache instantly and refreshes in the background when online */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(r => {
      if (r && r.ok && new URL(e.request.url).origin === location.origin) {
        const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp));
      }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
