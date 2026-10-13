// Renders integration widget contents the way the Gladys front does
// (front/src/components/boxs/external-widget, ExternalWidgetBox +
// WidgetComponents), in plain DOM, with the same slots, order and class
// names. Only the components this widget uses: value, image, status,
// button. Query: ?lang=fr&cards=xc40_electric_2024,xc90_petrol_2019&theme=dark
/* global DATA */
const params = new URLSearchParams(location.search);
const LANG = params.get('lang') || 'en';
const CARDS = (params.get('cards') || DATA.cards.join(',')).split(',');

const text = (value) =>
  value && typeof value === 'object' ? (value[LANG] ?? value.en ?? '') : (value ?? '');
const formatNumber = (value) =>
  typeof value === 'number'
    ? new Intl.NumberFormat(LANG, { maximumFractionDigits: 2 }).format(value)
    : text(value);
const COLOR = {
  neutral: 'colorNeutral',
  primary: 'colorPrimary',
  success: 'colorSuccess',
  warning: 'colorWarning',
  danger: 'colorDanger',
  info: 'colorInfo',
};
const el = (tag, cls, children = []) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
};
const icon = (name, cls = '') => el('i', `fe fe-${name} ${cls}`);

// widgetContentUtils.splitIntoSlots
function splitIntoSlots(components) {
  const slots = { header: [], tiles: [], focal: null, body: null, status: null, buttons: [] };
  for (const c of components) {
    if (c.type === 'text') c.variant === 'body' ? (slots.body = c) : slots.header.push(c);
    else if (c.type === 'value' || c.type === 'gauge') slots.tiles.push(c);
    else if (['chart', 'card-list', 'image'].includes(c.type)) slots.focal = c;
    else if (c.type === 'status') slots.status = c;
    else if (c.type === 'button') slots.buttons.push(c);
  }
  return slots;
}

const tiles = (components) =>
  el(
    'div',
    'tilesBox',
    el(
      'div',
      `tiles tilesCount${Math.min(components.length, 6)}`,
      components.map((c) =>
        el('div', 'tile', [
          c.icon ? icon(c.icon, `tileIcon ${COLOR[c.color] || ''}`) : null,
          el('span', `tileValue ${COLOR[c.color] || ''}`, [
            formatNumber(c.value),
            c.unit ? el('span', 'tileUnit', text(c.unit)) : null,
          ]),
          c.label ? el('span', 'tileLabel', text(c.label)) : null,
        ]),
      ),
    ),
  );

// LazyWidgetImage, once the image route answered.
function image(component) {
  const img = el('img', component.fit === 'contain' ? 'imageContain' : 'imageCover');
  img.src = DATA.images[component.key];
  img.alt = text(component.alt);
  return el('div', 'imageFrame', img);
}

const statusList = (component) =>
  el(
    'ul',
    'statusList',
    component.items.map((item) =>
      el('li', 'statusRow', [
        item.icon
          ? icon(item.icon, `statusIcon ${COLOR[item.color || 'neutral']}`)
          : el('span', `statusDot ${COLOR[item.color || 'neutral']}`),
        el('span', 'statusLabel', text(item.label)),
        el('span', 'statusValue', formatNumber(item.value)),
      ]),
    ),
  );

// WidgetButtons: a link shows the domain it opens.
const buttons = (components) =>
  el(
    'div',
    'buttons',
    components.map((c) => {
      const cls = `button ${c.style === 'primary' ? 'buttonPrimary' : ''} ${c.style === 'danger' ? 'buttonDanger' : ''}`;
      if (c.link) {
        return el('a', cls, [
          el('span', 'buttonIcon', icon(c.icon || 'external-link')),
          el('span', 'buttonLabel', text(c.label)),
          el('span', 'buttonDomain', `(${(c.link.url || '').split('/')[2] || ''})`),
        ]);
      }
      const node = el('button', cls, [
        el('span', 'buttonIcon', icon(c.icon || 'play')),
        el('span', 'buttonLabel', text(c.label)),
      ]);
      node.type = 'button';
      return node;
    }),
  );

function card(name) {
  const content = DATA.contents[LANG][name];
  const slots = splitIntoSlots(content.components);
  return el('div', 'card', [
    el(
      'div',
      'card-header',
      el('h3', 'card-title', [
        icon(DATA.card.icon || 'grid'),
        el('span', 'm-1', text(DATA.card.label)),
      ]),
    ),
    el(
      'div',
      'card-body',
      el('div', 'slots', [
        slots.tiles.length ? tiles(slots.tiles) : null,
        slots.focal && slots.focal.type === 'image' ? image(slots.focal) : null,
        slots.body ? el('p', 'body', text(slots.body.text)) : null,
        slots.status ? statusList(slots.status) : null,
        slots.buttons.length ? buttons(slots.buttons) : null,
      ]),
    ),
  ]);
}

const row = document.getElementById('row');
for (const name of CARDS) {
  row.append(el('div', 'col', card(name)));
}
document.body.dataset.ready = '1';
