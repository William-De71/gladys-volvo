// -----------------------------------------------------------------------------
// The picture of a car in the widget.
//
// Volvo gives each car a configurator rendering of its exact model and colour
// (`images.exteriorImageUrl`, cas.volvocars.com). A widget refers to an image
// by a key; the core fetches its bytes through onWidgetGetImage and caches
// them one hour per key. The key is a hash of the URL: it changes when the
// picture does, and the handler only ever fetches a URL Volvo gave (a key
// unknown to the registry is refused — no arbitrary download).
//
// The renderings come 1920 px wide, far above the 300 KB a widget image may
// weigh: the `w` parameter of the image services (cas.volvocars.com for most
// cars, wizz.volvocars.com for the EX30) asks for a smaller one.
// -----------------------------------------------------------------------------

import { createHash } from 'node:crypto';

const RENDER_DOMAIN = '.volvocars.com';
const RENDER_WIDTH = '640';

/**
 * @description The URL to download: a smaller rendering on the image service.
 * @param {string} url - The URL given by Volvo.
 * @returns {string} The URL to fetch.
 * @example
 * sizedUrl('https://cas.volvocars.com/image/…/default.png?angle=1&w=1920'); // -> '…&w=640'
 */
function sizedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(RENDER_DOMAIN) && parsed.searchParams.has('w')) {
      parsed.searchParams.set('w', RENDER_WIDTH);
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * @description The widget key of a picture URL.
 * @param {string} url - The URL.
 * @returns {string} The key.
 * @example
 * keyOf('https://cas.volvocars.com/…'); // -> 'car-0123456789ab'
 */
function keyOf(url) {
  return `car-${createHash('sha256').update(url).digest('hex').slice(0, 12)}`;
}

/**
 * @description A registry of the pictures the widget may show.
 * @returns {{ register: Function, urlOf: Function, markBroken: Function }} The registry.
 * @example
 * const pictures = createPictureRegistry();
 * const key = pictures.register(info.imageUrl);
 */
function createPictureRegistry() {
  const urls = new Map();
  const broken = new Set();
  return {
    /**
     * @description Register a picture.
     * @param {string|null} url - The URL given by Volvo.
     * @returns {string|null} Its key, null without a (working) picture.
     */
    register(url) {
      if (typeof url !== 'string' || !url.startsWith('https://')) {
        return null;
      }
      const key = keyOf(url);
      if (broken.has(key)) {
        return null;
      }
      urls.set(key, sizedUrl(url));
      return key;
    },
    /**
     * @description The URL of a key.
     * @param {string} key - The key.
     * @returns {string|null} The URL, null for an unknown key.
     */
    urlOf(key) {
      return urls.get(String(key)) ?? null;
    },
    /**
     * @description Stop offering a picture that cannot be served.
     * @param {string} key - The key.
     */
    markBroken(key) {
      broken.add(String(key));
      urls.delete(String(key));
    },
  };
}

export { sizedUrl, keyOf, createPictureRegistry };
