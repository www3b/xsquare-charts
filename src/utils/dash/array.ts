/** Flatten array, one level deep. */
export function flatten<T>(arr?: T[][] | T[] | null): T[] {
  return Array.prototype.concat.apply([], arr as T[][]) as T[];
}
