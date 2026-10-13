# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration** for Volvo cars: a Node.js service
(Node 22+, ESM, no build step) running in its own sandboxed Docker container,
talking to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. It reads the cars through the official Volvo Cars
APIs (Connected Vehicle v2, Energy v2, Location v1), signed in with the user's
Volvo ID (OAuth2 + PKCE) and the user's own developer application. Cloud only:
Volvo pushes nothing, the cars are read on a loop.

## Commands

```bash
npm install
npm test                                  # node --test, never touches the network
node --test test/app.test.js              # one file
node --test --test-name-pattern "widget"  # tests whose name matches
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store . --skip-image-check
```

## Architecture

```
index.js                     SDK wiring only: createApp(new GladysIntegration()) + connect
src/app.js                   every handler, registered before connect(); the tests drive
                             it with the fake Gladys of the SDK (test/app.test.js)
src/oauth.js                 Volvo ID: PKCE, single-flight refresh of the rotating token
src/volvo-api.js             Volvo API client (VCC API key, 404 = not offered, 429 = quota)
src/poller.js                two paces: live (poll_interval) and slow (30 min)
src/vehicle.js               raw answers -> snapshot (units, open/closed, warnings)
src/device.js                one device per VIN, features, states
src/events.js                scene triggers, on transitions only
src/commands.js              lock, climate, flash… (answered once the car ran them)
src/scene-actions.js         send_command, get_status
src/widgets.js               the `vehicle` widget (picture, tiles, buttons)
src/transport.js             cloud / unreachable / degraded badge of each car
src/i18n.js                  runtime texts in en / fr / de / es
src/config.js                config_schema normalization + internal keys
.github/scripts/release.mjs  version, changelog, version files, PR title checks
docs/illustrations/render.sh regenerates the widget illustrations (docs/assets)
```

## Rules

- **External ids are forever**: `gladys.externalIds('vehicle', vin)`, feature
  keys (`battery_level`, `lock`…), config, action, widget, scene trigger and
  action, field, variable and output keys too. Per feature, `category`,
  `type`, `unit`, `min`, `max` and `step` are compared by the "Update" button
  of the Discovery screen: `test/structure.test.js` checks them against
  `test/fixtures/discovery.baseline.json` (v1.0.0). A change needs an entry in
  its `ALLOWED_CHANGES` with the migration, in the changelog, the docs and the
  forum message.
- **Polling**: `should_poll: false`, the poller runs its own timer (Volvo has
  a daily quota, Gladys polls at most once a minute).
- **States**: `publishChangedStates` with a one-hour heartbeat, only for the
  features the user created; everything again in `onDeviceCreated`, then
  `requestWidgetRefresh`.
- **Scene events** on transitions only, flat scalar data, never in reaction to
  a scene action or a command the integration sent.
- **Language**: Gladys does not send it with a poll or a scene action. Texts
  written outside a widget request use `textLanguage()` (the `language`
  setting, or the language of the last widget request in `auto`).
- **The container rootfs is read-only**: the only state is in the Gladys
  config (tokens, pending sign-in). Never log a token, the API key or a full
  VIN (`redactVin`).
- **Honk and flash** drain the 12 V battery of some cars: never sent on the
  integration's own initiative, only from an explicit user action.
- **User-facing text** exists in en, fr, de and es: manifest, `src/i18n.js`,
  `docs/*.md`, `README*.md`. `test/i18n.test.js` checks it.
- **Widget illustrations**: `docs/assets/widgets.<lang>.png` are generated
  from the widget code by `docs/illustrations/render.sh`: run it again after
  any change to a widget content, and keep them labelled as illustrations.
- **Versions belong to the Release workflow**: never edit `version` in
  `package.json`, `package-lock.json` or the manifest, nor the `docker_image`
  tag.
- **Changelog**: Ne jamais éditer CHANGELOG.md à la main, il est généré à la
  release. Écris le titre de PR comme la ligne que l'utilisateur lira.
- **Style**: Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network.
