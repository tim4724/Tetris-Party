'use strict';

// =====================================================================
// AirConsole Controller Bootstrap
// Loaded AFTER all normal controller scripts but BEFORE controller.js init.
// Overrides PartyConnection so that connect() — which sets up callbacks
// and calls party.connect() — works with AirConsole instead.
// =====================================================================

var airconsole = new AirConsole({ orientation: AirConsole.ORIENTATION_PORTRAIT });

// Capture early onReady — the SDK may fire it before our adapter is wired up.
var _acEarlyReadyCode = undefined;
var _acEarlyReady = false;
airconsole.onReady = function(code) {
  _acEarlyReady = true;
  _acEarlyReadyCode = code;
};

// controller.js reads roomCode from location.pathname. In AirConsole the URL
// is /controller.html which would be parsed as roomCode="controller.html".
// Replace the path with a fake room code so the main init block executes
// and sessionStorage keys align.
history.replaceState(null, '', '/airconsole' + location.search + location.hash);

// Pre-set clientId (adapter maps real AirConsole device IDs at message time)
clientId = 'ac_controller';

// Force hadStoredId so controller.js auto-connects on load (skips name screen)
sessionStorage.setItem('clientId_airconsole', clientId);

// Replace PartyConnection with a factory that returns AirConsoleAdapter.
PartyConnection = function() {
  return new AirConsoleAdapter(airconsole, { role: 'controller' });
};

// Wrap connect() to inject AirConsole nickname and replay early onReady
var _originalConnect = connect;
var _acOnReadyWrapped = false;
connect = function() {
  if (party && party.connected) return;
  _originalConnect();
  // Wrap onReady AFTER adapter is created to inject nickname from AirConsole profile
  if (!_acOnReadyWrapped) {
    _acOnReadyWrapped = true;
    var _adapterOnReady = airconsole.onReady;
    airconsole.onReady = function(code) {
      var nickname = airconsole.getNickname(airconsole.getDeviceId());
      if (nickname) playerName = nickname;
      if (_adapterOnReady) _adapterOnReady.call(airconsole, code);
    };
    // Replay early onReady if the SDK fired before the adapter was wired
    if (_acEarlyReady) {
      airconsole.onReady(_acEarlyReadyCode);
    }
  }
};

// Hide ping display — AirConsole manages connectivity
if (pingDisplay) pingDisplay.style.display = 'none';

// Debug overlay — shows adapter state visually (remove after testing)
var _dbg = document.createElement('div');
_dbg.id = 'ac-debug';
_dbg.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(0,0,0,0.85);color:#0f0;font:11px monospace;padding:8px;z-index:99999;white-space:pre-wrap;pointer-events:none';
document.body.appendChild(_dbg);
setInterval(function() {
  _dbg.textContent = [
    'screen: ' + currentScreen,
    'roomCode: ' + roomCode,
    'playerName: ' + playerName,
    'clientId: ' + clientId,
    'party: ' + (party ? party.constructor.name : 'null'),
    'connected: ' + (party ? party.connected : '-'),
    'acReady: ' + (party ? party._acReady : '-'),
    'earlyReady: ' + _acEarlyReady + ' code=' + _acEarlyReadyCode,
    'connectCalled: ' + (party ? party._connectCalled : '-'),
    'ac.device_id: ' + (airconsole.device_id !== undefined ? airconsole.device_id : 'unset'),
  ].join('\n');
}, 500);
