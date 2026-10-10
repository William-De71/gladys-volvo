# Gladys Volvo

External [Gladys Assistant](https://gladysassistant.com) integration for **Volvo cars**, through the official
[Volvo Cars APIs](https://developer.volvocars.com/) (Connected Vehicle v2, Energy v2, Location v1), built on
`@gladysassistant/integration-sdk` 0.14. Modeled on Home Assistant's `volvo` integration (cloud polling, OAuth2 +
PKCE, features following what each car reports) and on the electric vehicle categories of the Gladys core.

User documentation: [English](docs/en.md) · [Français](docs/fr.md).

> Community integration, not affiliated with or endorsed by Volvo Cars.

## Features

### Devices

A device per car of the Volvo ID, offered on the Discovery screen. A feature is offered only when the car reports
its value (a diesel gets fuel, no battery; no sunroof, no sunroof feature):

| Feature                                                     | Category / type                             | Notes                                           |
| ----------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| Battery, electric range, energy                             | `electrical-vehicle-battery`                | energy = capacity × level                       |
| Plugged, charging power                                     | `electrical-vehicle-charge`                 | power in kW                                     |
| Charge target, current limit                                | `electrical-vehicle-charge` (read-only)     | the API cannot change them                      |
| Charging status, warnings                                   | `text` / `text`                             | localized text                                  |
| Charging time left, time to service                         | `duration` / `integer`                      | minutes, days                                   |
| Fuel, fuel range, distance to service                       | `volume-sensor`, `distance-sensor`          | liters, km                                      |
| Average consumption                                         | `electrical-vehicle-consumption`            | kWh/100 km                                      |
| Odometer, doors, tailgate, hood, tank lid, windows, sunroof | `electrical-vehicle-state`                  | 1 = open                                        |
| Lock                                                        | `electrical-vehicle-command` / `lock`       | 1 = locked; a command when LOCK + UNLOCK listed |
| Climate                                                     | `electrical-vehicle-climate` / `climate-on` | optimistic, back to 0 after 30 min              |
| Distance from home                                          | `distance-sensor` / `decimal`               | nearest located house (`location: true`)        |

External ids: `ext:<selector>:vehicle:<VIN>[:<feature>]`. Unknown values are omitted, never published as 0. States
are published when they change, and again every hour.

### Scene triggers

`lock_changed` (state), `left_open`, `engine_changed` (state), `charging_changed` (status),
`charger_connection_changed` (state), `home_changed` (arrived/left, 25 % hysteresis on the radius),
`warning_raised` (one event per new warning) and `authorization_expired`. All but the last filter on the car
(`source: "devices"`). The first reading after a start is a baseline.

### Scene actions

- `send_command`: lock, unlock, lock_reduced_guard, climatization start/stop, honk, flash, honk_flash, engine
  start (1–15 min)/stop. Refused unless the car lists it; waits for Volvo's invoke status (COMPLETED/DELIVERED).
- `get_status`: lock, openings, battery, fuel, ranges, charging, engine, odometer, home, position, map link,
  warnings, summary; from the last reading or a fresh one.

### Widget

`vehicle`: the configurator picture of the car (served through `onWidgetGetImage`, `w=640` asked to the Volvo image
service, keys bound to the URLs Volvo gave), battery/fuel and range tiles, a status list, and up to four buttons
(lock/unlock, climate, flash, map). Unlock and flash ask for confirmation.

## Configuration

| Key             | Type     | Notes                                           |
| --------------- | -------- | ----------------------------------------------- |
| `api_key`       | `secret` | VCC API key of the developer portal application |
| `client_id`     | `string` | OAuth2 client of the published application      |
| `client_secret` | `secret` |                                                 |
| `volvo_account` | `oauth2` | Volvo ID sign-in (authorization code + PKCE)    |
| `poll_interval` | `number` | live pace, 2–60 min, default 5                  |
| `home_radius`   | `number` | 50–5000 m, default 200                          |

Internal keys (outside the schema): `access_token`, `refresh_token`, `token_expires_at`, `oauth_state`,
`oauth_code_verifier`, `last_language`.

Manifest actions: `test_connection`, `refresh`, `disconnect`.

### Sign-in

The redirect URI is the one Gladys gives (`https://my.gladysassistant.com/redirect/oauth` by default, an HTTPS page
that sends the browser back to the instance — Volvo refuses `http://` and `localhost`). The state and the PKCE
verifier are stored (`setConfig`) so a container restart between Connect and the callback loses nothing. The token
endpoint authenticates the client with HTTP Basic.

**Volvo rotates the refresh token**: each one is single-use. Refreshes are single-flight and the new tokens are
stored before use. The grant of a personally published application is limited in time: once the refresh is refused
(4xx), reading pauses, the status asks to Connect again and `authorization_expired` fires once.

## How it works

Volvo pushes nothing. Two paces per car, like Home Assistant's coordinators:

- live, every `poll_interval`: `doors`, `windows`, `engine-status`, `statistics`, Energy `state` (when the
  capabilities say so), `fuel` (combustion cars, and battery level of older plug-in hybrids), `location` (when
  available: Volvo answers 403 outside the covered regions);
- slow, every 30 minutes: `odometer`, `diagnostics`, `warnings`, `tyres`, `brakes`, `engine`,
  `command-accessibility`.

About 6–7 calls per car per live round: ~2,000 a day at 5 minutes. A failing resource keeps its last answer; a 429
pauses the rounds for at least 15 minutes (or `Retry-After`); a 401 from the API after a token refresh means a
refused API key, not a sign-in problem. Commands from the dashboard are acked at once (5 s ack) and run in the
background; a live reading follows 20 s later.

Response shapes are those recorded by Home Assistant's tests (`test/fixtures/home-assistant.json`, Apache-2.0):
numbers may be strings, `UNSPECIFIED` means not reported, Energy fields in `ERROR` are unsupported, the electric
range of the Energy API may be in miles while the trip computer (preferred) gives km.

## Development

```bash
npm install
npm run lint
npm run format:check
npm test
```

The manifest is validated by the core `validateManifest` (v5.1.1 and master): `gladys_version` is `>=5.1.1`
(widgets, scene triggers/actions, `source: "devices"`, the HTTPS OAuth redirect page).

Docker image: `ghcr.io/william-de71/gladys-volvo`, multi-arch (amd64/arm64), non-root, read-only rootfs. The
package must be public for Gladys to pull it.

## License

Apache-2.0
