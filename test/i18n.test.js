// The four languages of the Gladys interface (en, fr, de, es) everywhere a
// user reads the integration: the manifest, the runtime texts and the docs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { LANGUAGES, TEXTS } from '../src/i18n.js';

const manifest = JSON.parse(
  readFileSync(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const doc = (language) => new URL(`../docs/${language}.md`, import.meta.url);

/**
 * @description Every multi-language object of a value, with its path.
 * @param {unknown} value - The value.
 * @param {string} path - Its path.
 * @returns {Array<[string, object]>} The objects.
 */
function texts(value, path = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => texts(item, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    if (typeof value.en === 'string') {
      return [[path, value]];
    }
    return Object.entries(value).flatMap(([key, item]) => texts(item, `${path}.${key}`));
  }
  return [];
}

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('every text of the manifest exists in the four languages', () => {
  const found = texts(manifest);
  assert.ok(found.length > 100);
  for (const [path, text] of found) {
    for (const language of LANGUAGES) {
      assert.equal(typeof text[language], 'string', `${path}.${language}`);
      assert.ok(text[language].trim().length > 0, `${path}.${language}`);
    }
  }
});

test('the catalog description and the widget labels fit the store limits', () => {
  for (const language of LANGUAGES) {
    const { length } = manifest.description[language];
    assert.ok(length >= 10 && length <= 100, `description.${language}: ${length}`);
    for (const widget of manifest.widgets) {
      const label = widget.label[language];
      assert.ok(label.length >= 3 && label.length <= 30, `widget ${widget.key}.${language}`);
    }
  }
});

test('every runtime text exists in the four languages, with the same placeholders', () => {
  for (const [key, text] of Object.entries(TEXTS)) {
    for (const language of LANGUAGES) {
      assert.equal(typeof text[language], 'string', `${key}.${language}`);
      assert.deepEqual(placeholders(text[language]), placeholders(text.en), `${key}.${language}`);
    }
  }
});

test('the degraded transport messages fit in 200 characters', () => {
  for (const [key, text] of Object.entries(TEXTS).filter(([k]) => k.startsWith('transport_'))) {
    for (const language of LANGUAGES) {
      assert.ok(text[language].length <= 200, `${key}.${language}`);
    }
  }
});

test('the four docs exist, are long enough and share the same structure', () => {
  const shape = (text) => ({
    headings: text.match(/^#+ /gm).map((h) => h.trim()),
    tableRows: (text.match(/^\|/gm) ?? []).length,
  });
  const reference = shape(readFileSync(doc('en'), 'utf8'));
  for (const language of LANGUAGES) {
    assert.ok(existsSync(doc(language)), `docs/${language}.md`);
    const text = readFileSync(doc(language), 'utf8');
    assert.ok(text.length > 300, `docs/${language}.md is too short`);
    assert.deepEqual(shape(text), reference, `docs/${language}.md structure`);
  }
});

test('the four READMEs exist and link to each other', () => {
  const files = { en: 'README.md', fr: 'README.fr.md', de: 'README.de.md', es: 'README.es.md' };
  for (const file of Object.values(files)) {
    const url = new URL(`../${file}`, import.meta.url);
    assert.ok(existsSync(url), file);
    const text = readFileSync(url, 'utf8');
    for (const other of Object.values(files)) {
      if (other !== file) {
        assert.ok(text.includes(`(${other})`), `${file} links to ${other}`);
      }
    }
  }
});
