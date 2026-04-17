'use strict';

// Scenarios that don't vary by style tier or player color.
var SCREENS = [
  { key: 'welcome',          title: 'Welcome' },
  { key: 'countdown',        title: 'Countdown (3)' }
];

// Lobby-style scenarios: rendered once per host index so the Start button's
// host-tinted color is visible for each of the first 4 players.
var HOST_VARIANT_SCENARIOS = [
  { key: 'lobby',            title: 'Lobby' },
  { key: 'airconsole-lobby', title: 'Lobby (AirConsole)' }
];
// Overlay scenarios whose primary CTA is host-tinted (pause Continue, results
// Play Again, disconnected Reconnect). Rendered once per host index like the
// lobby so the tint is visible for each of the first 4 players.
var HOST_VARIANT_OVERLAYS = [
  { key: 'pause',        title: 'Paused' },
  { key: 'disconnected', title: 'Disconnected' },
  { key: 'results',      title: 'Results' }
];
var HOST_VARIANT_COUNT = 4;

// Gameplay scenarios — shown once per style tier so normal/pillow/neon
// differences are visible side-by-side.
var TIER_SCENARIOS = [
  { key: 'playing',        title: 'Playing' },
  { key: 'line-clear',     title: 'Line clear', animated: true },
  { key: 'garbage-add',    title: 'Garbage incoming', animated: true },
  { key: 'garbage-defend', title: 'Garbage defended', animated: true },
  { key: 'ko',             title: 'All players KO', animated: true }
];

// Style tiers (see theme.js getStyleTier): level→tier mapping.
var TIERS = [
  { label: 'Normal (Lv 1)',  level: 1 },
  { label: 'Pillow (Lv 8)',  level: 8 },
  { label: 'Neon (Lv 12)',   level: 12 }
];

// Plain overlays — shown once each (no host-tinted CTA to vary).
var OVERLAYS = [
  { key: 'reconnecting', title: 'Reconnecting' }
];

var LEGAL = [
  { key: 'privacy', title: 'Privacy', staticPath: '/privacy' },
  { key: 'imprint', title: 'Imprint', staticPath: '/imprint' }
];

var state = Gallery.loadState();
var nonce = 0;

// Display uses its own cards-per-row key so switching between display
// and controller pages doesn't clobber each other's preference (the
// ranges differ: 1–5 vs 1–8).
var DISPLAY_MAX_COLS = 5;
var stored = parseInt(state.displayCardsPerRow, 10);
state.displayCardsPerRow = Math.max(1, Math.min(stored || DISPLAY_MAX_COLS, DISPLAY_MAX_COLS));

function frameClass() { return 'display'; }
function dims() { return Gallery.DISPLAY_AR_DIMS[state.displayAR] || Gallery.DISPLAY_AR_DIMS['16x9']; }

var allCards = [];

function scenarioURL(s, levelOverride, extra) {
  if (s.staticPath) return Gallery.staticURL(state, s.staticPath, nonce || undefined);
  return Gallery.displayURL(state, s.key, nonce || undefined, levelOverride, extra);
}

function hostVariantURL(s, hostIdx) {
  return Gallery.displayURL(state, s.key, nonce || undefined, undefined, { host: hostIdx });
}

function buildRow(label, scenarios, levelOverride) {
  var row = document.createElement('div');
  row.className = 'scenario-row';

  var h = document.createElement('h3');
  var title = document.createElement('span'); title.textContent = label;
  var meta = document.createElement('span'); meta.className = 'row-meta';
  meta.textContent = scenarios.length + ' screen' + (scenarios.length === 1 ? '' : 's');
  h.appendChild(title); h.appendChild(meta);
  row.appendChild(h);

  var strip = document.createElement('div');
  strip.className = 'scenario-strip wrap';
  strip.style.setProperty('--row-cols', state.displayCardsPerRow);

  var cards = [];
  for (var i = 0; i < scenarios.length; i++) {
    var s = scenarios[i];
    var card = Gallery.makeCard({
      title: s.title,
      tag: s.animated ? 'anim' : (s.staticPath ? 'static' : ''),
      frameClass: frameClass(),
      logical: dims(),
      url: scenarioURL(s, levelOverride)
    });
    strip.appendChild(card);
    cards.push(card);
  }
  row.appendChild(strip);
  return { row: row, cards: cards };
}

// Row variant where each "scenario" produces HOST_VARIANT_COUNT cards
// (host=0..N-1). Used for lobby-family scenes where the Start button's color
// depends on which player is host.
function buildHostVariantRow(s) {
  // Only render variants for hosts that have a corresponding player —
  // pointing host at an empty slot would fall back to whichever real
  // player has the lowest playerIndex, producing duplicate cards.
  var variantCount = Math.min(HOST_VARIANT_COUNT, state.players);

  var row = document.createElement('div');
  row.className = 'scenario-row';
  var h = document.createElement('h3');
  var title = document.createElement('span'); title.textContent = s.title;
  var meta = document.createElement('span'); meta.className = 'row-meta';
  meta.textContent = variantCount + ' host variant' + (variantCount === 1 ? '' : 's');
  h.appendChild(title); h.appendChild(meta);
  row.appendChild(h);

  var strip = document.createElement('div');
  strip.className = 'scenario-strip wrap';
  strip.style.setProperty('--row-cols', state.displayCardsPerRow);

  var cards = [];
  var d = dims();
  for (var i = 0; i < variantCount; i++) {
    var card = Gallery.makeCard({
      title: 'Host P' + (i + 1),
      tag: Gallery.PLAYER_COLOR_NAMES[i],
      frameClass: 'display',
      logical: d,
      url: hostVariantURL(s, i)
    });
    strip.appendChild(card);
    cards.push(card);
  }
  row.appendChild(strip);
  return { row: row, cards: cards };
}

function render() {
  Gallery.resetQueue();
  var host = document.getElementById('display-rows');
  host.innerHTML = '';

  allCards = [];
  function add(built) {
    host.appendChild(built.row);
    allCards = allCards.concat(built.cards);
  }

  for (var h = 0; h < HOST_VARIANT_SCENARIOS.length; h++) {
    add(buildHostVariantRow(HOST_VARIANT_SCENARIOS[h]));
  }
  add(buildRow('Screens', SCREENS));
  for (var i = 0; i < TIERS.length; i++) {
    add(buildRow('Style · ' + TIERS[i].label, TIER_SCENARIOS, TIERS[i].level));
  }
  for (var o = 0; o < HOST_VARIANT_OVERLAYS.length; o++) {
    add(buildHostVariantRow(HOST_VARIANT_OVERLAYS[o]));
  }
  add(buildRow('Overlays', OVERLAYS));
  add(buildRow('Legal', LEGAL));

  Gallery.lazyMount(allCards);
}

// AR change only affects frame geometry — re-layout existing cards.
function updateDims() {
  var d = dims();
  for (var i = 0; i < allCards.length; i++) {
    if (allCards[i]._applyDims) allCards[i]._applyDims(d, 0);
  }
}
function updateLayout() {
  var strips = document.querySelectorAll('.scenario-strip');
  for (var i = 0; i < strips.length; i++) {
    strips[i].style.setProperty('--row-cols', state.displayCardsPerRow);
  }
}

Gallery.bindSelect(state, 'display-ar', 'displayAR', updateDims);
Gallery.bindNumber(state, 'player-count', 'players', 1, 8, render);
Gallery.bindNumber(state, 'level', 'level', 1, 15, render);
Gallery.bindSelect(state, 'language', 'lang', render);
Gallery.bindSelect(state, 'cards-per-row', 'displayCardsPerRow', updateLayout, function(v) { return parseInt(v, 10) || 5; });
document.getElementById('reload-all').addEventListener('click', function() {
  nonce = Date.now(); render();
});

state.players = parseInt(state.players, 10) || 4;
state.level = parseInt(state.level, 10) || 1;
state.displayCardsPerRow = parseInt(state.displayCardsPerRow, 10) || 5;

render();
