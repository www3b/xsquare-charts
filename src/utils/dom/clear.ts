export function clear(node: Node): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function remove(node: Node | undefined | null): Node | undefined {
  if (node == null) {
    return undefined;
  }
  const removable = node as Node & { remove?: () => void };
  if (typeof removable.remove === 'function') {
    removable.remove();
    return node;
  }
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
  return node;
}
