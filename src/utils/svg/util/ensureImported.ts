/** Пространства имён по умолчанию */
export const ns: Record<string, string> = {
  svg: 'http://www.w3.org/2000/svg',
  xhtml: 'http://www.w3.org/1999/xhtml',
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace',
  xmlns: 'http://www.w3.org/2000/xmlns/',
};

/** Проверить, что элемент знает своё пространство имён. */
export function ensureImported(element: Element): void {
  if (element.ownerDocument !== document) {
    importNS(element, 'xmlns', ns.svg);
  }
}

function importNS(node: Element, prefix: string, uri: string): void {
  const xmlns = node.getAttribute('xmlns');
  if (xmlns && xmlns.indexOf(';') !== -1 && xmlns.indexOf(uri) !== -1) {
    return;
  }

  if (node.lookupNamespaceURI(prefix) === uri) {
    return;
  }

  node.setAttributeNS(ns.xmlns, `xmlns:${prefix}`, uri);
}
