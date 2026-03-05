// @ts-check
const { test, expect } = require('@playwright/test');
const {
  applyScenario,
  createRoom,
  delayNextJoin,
  joinController,
  resetTestServer,
  waitForControllerGame,
  waitForControllerResults,
  waitForFont,
} = require('./helpers');

async function setupJoinedRoom(displayPage, context, names) {
  const { roomCode } = await createRoom(displayPage);
  const controllers = [];

  for (const name of names) {
    controllers.push(await joinController(context, roomCode, name));
  }

  return { roomCode, controllers };
}

test.beforeEach(async ({ request }) => {
  await resetTestServer(request);
});

test.afterEach(async ({ request }) => {
  await resetTestServer(request);
});

test.describe('Controller', () => {
  test('name entry screen', async ({ page, context }) => {
    const { roomCode } = await createRoom(page);
    const controller = await context.newPage();
    await controller.goto(`/${roomCode}`);
    await waitForFont(controller);
    await expect(controller).toHaveScreenshot('01a-name-entry.png');
  });

  test('name entry - keyboard open', async ({ page, context }) => {
    const { roomCode } = await createRoom(page);
    const controller = await context.newPage();
    await controller.goto(`/${roomCode}`);
    await waitForFont(controller);
    await controller.fill('#name-input', 'Player 1');
    await controller.focus('#name-input');
    // Simulate soft keyboard: keep full viewport but shrink app height
    await controller.evaluate(() => {
      document.body.classList.add('keyboard-open');
      document.documentElement.style.setProperty('--app-height', '544px');
    });
    await expect(controller).toHaveScreenshot('01b-name-keyboard.png');
  });

  test('connecting screen', async ({ page, request }) => {
    const displayPage = page;
    const { roomCode } = await createRoom(displayPage);

    await delayNextJoin(request, 1500);

    const controller = await displayPage.context().newPage();
    await controller.goto(`/${roomCode}`);
    await waitForFont(controller);
    await controller.fill('#name-input', 'Player 1');
    await controller.click('#name-join-btn');
    await controller.waitForFunction(() => {
      const btn = document.getElementById('name-join-btn');
      return btn.disabled && btn.textContent === 'CONNECTING...';
    });
    await expect(controller).toHaveScreenshot('02-connecting.png');
    await controller.waitForSelector('#player-identity:not(.hidden)');
  });

  test('lobby - host view', async ({ page, context }) => {
    const { controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2']);
    const host = controllers[0];
    await host.waitForFunction(() => document.getElementById('start-btn').textContent.includes('2 players'));
    await expect(host).toHaveScreenshot('03-lobby-host.png');
  });

  test('lobby - non-host view', async ({ page, context }) => {
    const { controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2']);
    const nonHost = controllers[1];
    await nonHost.waitForFunction(() => document.getElementById('waiting-action-text').textContent.includes('Waiting for host'));
    await expect(nonHost).toHaveScreenshot('04-lobby-nonhost.png');
  });

  test('game screen - host', async ({ page, context, request }) => {
    const { roomCode, controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2']);
    const host = controllers[0];
    await applyScenario(request, roomCode, 'game');
    await waitForControllerGame(host);
    await expect(host).toHaveScreenshot('05-game-host.png');
  });

  test('game screen - non-host', async ({ page, context, request }) => {
    const { roomCode, controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2']);
    const nonHost = controllers[1];
    await applyScenario(request, roomCode, 'game');
    await waitForControllerGame(nonHost);
    await expect(nonHost).toHaveScreenshot('06-game-nonhost.png');
  });

  test('game screen - paused (host)', async ({ page, context, request }) => {
    const { roomCode, controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2']);
    const host = controllers[0];
    await applyScenario(request, roomCode, 'pause');
    await host.waitForSelector('#pause-overlay:not(.hidden)');
    await host.waitForTimeout(150);
    await expect(host).toHaveScreenshot('07-pause-host.png');
  });

  test('game screen - paused (non-host)', async ({ page, context, request }) => {
    const { roomCode, controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2']);
    const nonHost = controllers[1];
    await applyScenario(request, roomCode, 'pause');
    await nonHost.waitForSelector('#pause-overlay:not(.hidden)');
    await nonHost.waitForTimeout(150);
    await expect(nonHost).toHaveScreenshot('08-pause-nonhost.png');
  });

  test('game screen - KO', async ({ page, context, request }) => {
    const { roomCode, controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2']);
    const knockedOut = controllers[1];
    await applyScenario(request, roomCode, 'ko', { deadPlayerId: 2 });
    await knockedOut.waitForFunction(() => document.getElementById('game-screen').classList.contains('dead'));
    await knockedOut.waitForSelector('#ko-overlay');
    await expect(knockedOut).toHaveScreenshot('09-game-ko.png');
  });

  test('results - host view', async ({ page, context, request }) => {
    const { roomCode, controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2', 'Player 3', 'Player 4']);
    const host = controllers[0];
    await applyScenario(request, roomCode, 'results');
    await waitForControllerResults(host);
    await expect(host).toHaveScreenshot('10-results-host.png');
  });

  test('results - non-host view', async ({ page, context, request }) => {
    const { roomCode, controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2', 'Player 3', 'Player 4']);
    const nonHost = controllers[1];
    await applyScenario(request, roomCode, 'results');
    await waitForControllerResults(nonHost);
    await expect(nonHost).toHaveScreenshot('11-results-nonhost.png');
  });

  test('error - room not found', async ({ page }) => {
    await page.goto('/ZZZZ');
    await waitForFont(page);
    await page.fill('#name-input', 'Player 1');
    await page.click('#name-join-btn');
    await page.waitForFunction(() => {
      return document.getElementById('room-gone-heading').textContent === 'Room Not Found'
        && !document.getElementById('room-gone-message').classList.contains('hidden');
    });
    await expect(page).toHaveScreenshot('12-error-room-notfound.png');
  });

  test('error - host disconnected', async ({ page, context }) => {
    const { controllers } = await setupJoinedRoom(page, context, ['Player 1', 'Player 2']);
    const host = controllers[0];
    const nonHost = controllers[1];
    await host.click('#lobby-back-btn');
    await nonHost.waitForFunction(() => {
      const btn = document.getElementById('name-join-btn');
      return document.getElementById('name-status-detail').textContent === 'Host disconnected'
        && !btn.disabled;
    });
    await expect(nonHost).toHaveScreenshot('13-error-host-disconnected.png');
  });

  test('error - room reset', async ({ page, context, request }) => {
    const { controllers } = await setupJoinedRoom(page, context, ['Player 1']);
    const controller = controllers[0];
    await resetTestServer(request);
    await controller.waitForFunction(() => {
      return document.getElementById('room-gone-heading').textContent === 'Room Not Found'
        && !document.getElementById('room-gone-message').classList.contains('hidden');
    });
    await expect(controller).toHaveScreenshot('14-error-room-reset.png');
  });

  test('error - reconnection failed', async ({ page, context }) => {
    const { roomCode } = await createRoom(page);
    const controller = await context.newPage();
    await controller.addInitScript(([key, value]) => {
      sessionStorage.setItem(key, value);
    }, [`reconnectToken_${roomCode}`, 'invalid-token']);
    await controller.goto(`/${roomCode}`);
    await waitForFont(controller);
    await controller.waitForFunction(() => {
      const btn = document.getElementById('name-join-btn');
      return document.getElementById('name-status-detail').textContent === 'Reconnection failed'
        && !btn.disabled;
    });
    await expect(controller).toHaveScreenshot('15-error-reconnection-failed.png');
  });
});
