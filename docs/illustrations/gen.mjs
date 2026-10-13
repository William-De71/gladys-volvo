// Builds the widget contents of the illustrations with the integration's own
// code: node gen.mjs <repo> <out.json> (run by render.sh)
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [repo, out] = process.argv.slice(2);
const load = (path) => import(pathToFileURL(`${repo}/${path}`).href);
const { buildVehicleWidget, WIDGETS } = await load('src/widgets.js');
const { summarize } = await load('src/vehicle.js');
const { LANGUAGES } = await load('src/i18n.js');
// The answers of the Volvo API recorded by Home Assistant's tests.
const { infoOf, rawOf } = await load('test/helpers/fixtures.js');
const manifest = JSON.parse(readFileSync(`${repo}/gladys-assistant-integration.json`, 'utf8'));

const MINUTE = 60000;

// Two cars as the poller reads them, four minutes after their last report:
// an XC40 electric charging at home, and an XC90 petrol parked 12 km away,
// a rear window left open and the climate running.
const CARS = [
  { car: 'xc40_electric_2024', edit: () => {}, atHome: true, distanceHomeKm: 0, climateOn: false },
  {
    car: 'xc90_petrol_2019',
    edit: (raw) => {
      raw.windows.rearLeftWindow.value = 'OPEN';
    },
    atHome: false,
    distanceHomeKm: 12.4,
    climateOn: true,
  },
];

// The real widget shows the picture of the Volvo configurator; the
// illustration draws a plain silhouette in the colour of the car instead.
const PAINTS = { 'Silver Dawn': '#b9bec4', 'Passion Red Solid': '#a3161f' };
function silhouette(colour) {
  const paint = PAINTS[colour] ?? '#8a9099';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
<ellipse cx="320" cy="286" rx="250" ry="14" fill="#000" opacity=".12"/>
<path d="M92 262 L92 214 Q94 190 122 184 L196 172 L250 120 Q262 108 286 108 L430 108 Q452 108 466 122 L514 172 L540 178 Q560 184 560 204 L560 262 Z" fill="${paint}"/>
<path d="M264 128 Q270 120 284 120 L356 120 L356 172 L214 172 Z" fill="#2b3440"/>
<path d="M368 120 L428 120 Q444 120 454 132 L492 172 L368 172 Z" fill="#2b3440"/>
<rect x="92" y="222" width="468" height="6" fill="#000" opacity=".12"/>
<rect x="530" y="190" width="24" height="10" rx="3" fill="#f2d16b"/>
<rect x="96" y="194" width="16" height="10" rx="3" fill="#c0392b"/>
<g fill="#1f252c"><circle cx="190" cy="262" r="38"/><circle cx="462" cy="262" r="38"/></g>
<g fill="#9aa1a9"><circle cx="190" cy="262" r="18"/><circle cx="462" cy="262" r="18"/></g>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const widget = manifest.widgets.find((w) => w.key === WIDGETS.VEHICLE);
const cards = [];
const contents = {};
const images = {};
for (const [index, { car, edit, ...reading }] of CARS.entries()) {
  const info = infoOf(car);
  const raw = rawOf(car);
  edit(raw);
  const snapshot = summarize(info, raw);
  const now = snapshot.updatedAt + 4 * MINUTE;
  const imageKey = `car-${index}`;
  images[imageKey] = silhouette(info.colour);
  cards.push(car);
  for (const language of LANGUAGES) {
    contents[language] ??= {};
    contents[language][car] = buildVehicleWidget({
      info,
      reading: { snapshot, readAt: now, ...reading },
      imageKey,
      settings: { show_buttons: true },
      language,
      now,
    });
  }
}
writeFileSync(
  out,
  JSON.stringify(
    { card: { icon: widget.icon, label: widget.label }, cards, images, contents },
    null,
    1,
  ),
);
console.log('ok', cards.join(', '));
