export class Node {
  constructor(document, name = 'div') {
    this.ownerDocument = document;
    this.localName = name;
    this.nodeName = name.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.attributes = new Map();
    this.style = {};
    this.clientWidth = 400;
    this.clientHeight = 300;
    this.offsetWidth = 400;
    this.offsetHeight = 300;
  }

  appendChild(node) { node.remove(); node.parentNode = this; this.children.push(node); return node; }
  insertBefore(node, before) { node.remove(); node.parentNode = this; const index = before ? this.children.indexOf(before) : -1; this.children.splice(index < 0 ? this.children.length : index, 0, node); return node; }
  remove() { if (this.parentNode) { this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; } }
  get nextSibling() {
    return this.parentNode && this.parentNode.children[this.parentNode.children.indexOf(this) + 1];
  }
  get lastElementChild() {
    return this.children[this.children.length - 1];
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) || null; }
  hasAttribute(name) { return this.attributes.has(name); }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() { return {left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight}; }
}

export function createCanvasContext(canvas, record) {
  const context = {canvas, measureText: (text) => ({width: String(text).length * 8}), clearRect: () => record && record.push('clearRect')};
  return new Proxy(context, {
    get: (target, property) => property in target ? target[property] : (...args) => record && record.push([property, ...args]),
    set: (target, property, value) => { if (record) record.push(['set', property, value]); target[property] = value; return true; }
  });
}

export function createDocument(record) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElement(name) { const node = new Node(document, name); if (name === 'canvas') node.getContext = () => createCanvasContext(node, record); return node; },
    createElementNS(_namespace, name) { return new Node(document, name); }
  };
  return document;
}

export function createHost(document = createDocument(), width = 400, height = 300) {
  const host = new Node(document);
  host.clientWidth = host.offsetWidth = width;
  host.clientHeight = host.offsetHeight = height;
  return host;
}

export function chartConfig(renderer = 'svg', overrides = {}) {
  return {type: 'line', renderer, data: {labels: ['A', 'B'], series: [{name: 'Values', data: [1, 2]}]}, animation: false, responsive: false, legend: false, tooltip: false, ...overrides};
}
