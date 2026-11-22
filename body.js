'use strict';
/* =========================================================
   BODY MAP — anatomical chart (martsan, Pixabay free license) as vector regions.
   Art.body(view, {muscleId: tierIndex}, px) -> SVG string.
   Each muscle region is a clickable <path data-muscle="...">.
   ========================================================= */
(function () {
  const VB = { front: '0 0 870 1710', back: '0 0 870 1710' };
  Art.body = function (view, colors, px) {
    colors = colors || {}; px = px || 320; view = view === 'back' ? 'back' : 'front';
    const R = BODY_REGIONS[view], w = px * 870 / 1710;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB[view]}" width="${w.toFixed(1)}" height="${px}" class="art-body" data-view="${view}" role="img">`;
    s += `<path d="${R._sil}" fill="#5b5690" stroke="#5b5690" stroke-width="4" stroke-linejoin="round"/>`;
    s += `<path d="${R._hair}" fill="#2a2650"/>`;
    Object.keys(R).forEach(m => {
      if (m[0] === '_') return;
      const t = colors[m], has = t != null && t >= 0, ti = has ? Math.min(8, t | 0) : -1;
      s += `<path data-muscle="${m}"${has ? ` data-tier="${ti}"` : ''} d="${R[m]}" fill="${has ? Art.TIERS[ti].c2 : '#2a2650'}" stroke="${has ? Art.TIERS[ti].c2 : '#2a2650'}" stroke-width="1.5" stroke-linejoin="round"/>`;
    });
    return s + '</svg>';
  };
})();
