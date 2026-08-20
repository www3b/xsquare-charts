import {ensureImported, ns} from './ensureImported.js';

export {ns} from './ensureImported.js';

/** Попытаться распарсить SVG-строку; null при неудаче. */
export function parseSvg(xml: string): SVGSVGElement | null {
  try {
    const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');
    const root = doc.documentElement;
    if (root && root.localName === 'svg') {
      ensureImported(root);
    }
    return parseError ? null : (root as unknown as SVGSVGElement | null);
  } catch {
    return null;
  }
}

/** Сериализация узла в XML-строку с нормализацией пробелов. */
export function serialize(el: Node): string {
  const mapper = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) {
      return formatText(n.nodeValue ?? '');
    }
    if (n.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    return formatElement(n as Element, mapper);
  };
  return normalizeWhitespace(mapper(el));
}

function formatText(text: string): string {
  // оставляем только значимые пробелы между узлами
  return (/\S/).test(text) ? text.replace(/\s+/g, ' ') : '';
}

function formatElement(el: Element, mapper: (n: Node) => string): string {
  const nsUri = el.namespaceURI ?? '';
  const tagName = el.localName;

  const seeds: string[] = [];
  if (el.prefix) {
    seeds.push(`xmlns:${el.prefix}="${nsUri}"`);
  } else if (nsUri !== ns.svg) {
    seeds.push(`xmlns="${nsUri}"`);
  }

  let markup = `<${tagName}${seeds.length ? ' ' + seeds.join(' ') : ''}`;

  for (let i = 0; i < el.attributes.length; i++) {
    const name = el.attributes[i].name;
    const value = escapeXml(el.attributes[i].value);
    markup += ` ${name}="${value}"`;
  }

  const children = Array.prototype.map.call(el.childNodes, mapper) as string[];
  if (children.length) {
    markup += `>${children.join('')}</${tagName}>`;
  } else {
    markup += '/>';
  }

  return markup;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/ +/g, ' ').trim();
}
