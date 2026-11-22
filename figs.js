'use strict';
/* Exercise figures: pre-rendered 3D-style PNGs (img/fig-<key>.png). Source: js/fig3d.js (dev only). */
(function () {
  Art.figure = function (key, px) {
    px = px || 96;
    return Art._poses[key] ? `<img class="art-figure" src="img/fig-${key}.png" width="${px}" height="${px}" alt="" draggable="false">` : '';
  };
})();
