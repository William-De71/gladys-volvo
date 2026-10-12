// -----------------------------------------------------------------------------
// Entry point of the Volvo external integration.
//
// Brings the Volvo cars of a Volvo ID into Gladys through the official Volvo
// Cars APIs (developer.volvocars.com), like Home Assistant's `volvo`
// integration:
//   - a device per car (Discovery screen): battery or fuel, range, charge,
//     odometer, lock (a command when the car offers it), doors, tailgate,
//     windows, climate, service, warnings, distance from home (device.js);
//   - scene triggers: locked/unlocked, locked but left open, engine, charge,
//     cable, arrived/left home, new warning, sign-in to renew (events.js);
//   - scene actions: send a command, read the status (scene-actions.js);
//   - a dashboard widget with the picture of the car (widgets.js).
//
// Sign-in: OAuth2 + PKCE with the Volvo ID, through the `volvo_account`
// oauth2 field (oauth.js). Volvo pushes nothing: the cars are read on a loop
// (poller.js), every 5 minutes by default.
//
// Environment variables provided by the Gladys supervisor:
//   GLADYS_HOST_API_URL / GLADYS_INTEGRATION_TOKEN / GLADYS_INTEGRATION_SELECTOR
// The SDK reads them automatically: `new GladysIntegration()` is enough.
//
// This file only wires the SDK client: the handlers are in src/app.js, which
// the tests drive with the fake Gladys of the SDK.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { createApp } from './src/app.js';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const gladys = new GladysIntegration();
createApp(gladys);

// --- Startup ------------------------------------------------------------------------
logger.info(`Starting the Volvo integration ${version}...`);
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
