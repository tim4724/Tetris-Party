'use strict';

// Renders one hex of each piece color into a canvas at a target size,
// using the real engine stamp cache so the concept page shows exact
// in-game pixels.
(function () {
  var tiers = {
    normal: STYLE_TIERS.NORMAL,
    pillow: STYLE_TIERS.PILLOW,
    neonFlat: STYLE_TIERS.NEON_FLAT,
  };
  var pieceIds = [1, 2, 3, 4, 5, 6, 7, 8];

  function render(canvas, tier) {
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth || parseInt(canvas.getAttribute('width'), 10);
    var cssH = canvas.clientHeight || parseInt(canvas.getAttribute('height'), 10);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var size = Math.min(cssH - 20, (cssW - 40) / pieceIds.length * 1.1);
    var stepX = (cssW - size) / (pieceIds.length - 1);
    var y = (cssH - size) / 2;
    var colors = (tier === STYLE_TIERS.NEON_FLAT) ? NEON_PIECE_COLORS : PIECE_COLORS;

    for (var i = 0; i < pieceIds.length; i++) {
      var color = colors[pieceIds[i]];
      var stamp = getHexStamp(tier, color, size);
      var x = i * stepX + (size - stamp.cssW) / 2;
      ctx.drawImage(stamp, x, y, stamp.cssW, stamp.cssH);
    }
  }

  function renderAll() {
    document.querySelectorAll('canvas[data-tier]').forEach(function (c) {
      var tier = tiers[c.getAttribute('data-tier')];
      if (tier) render(c, tier);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }

  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', renderAll);
  }

  window.addEventListener('resize', (function () {
    var t;
    return function () { clearTimeout(t); t = setTimeout(renderAll, 150); };
  })());
})();
