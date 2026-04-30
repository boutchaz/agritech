/**
 * Build a parent-child tree from a flat list of nodes.
 *
 * - `getId(item)` returns the node's stable id
 * - `getParentId(item)` returns the parent's id, or null/undefined for roots
 *
 * Items whose parent isn't present in the list are treated as roots.
 */
export interface TreeNode<T> {
  data: T;
  children: TreeNode<T>[];
}

export function buildTree<T>(
  items: T[],
  getId: (item: T) => string,
  getParentId: (item: T) => string | null | undefined,
): TreeNode<T>[] {
  const nodes = new Map<string, TreeNode<T>>();
  for (const item of items) {
    nodes.set(getId(item), { data: item, children: [] });
  }

  const roots: TreeNode<T>[] = [];
  for (const item of items) {
    const node = nodes.get(getId(item))!;
    const parentId = getParentId(item);
    if (parentId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/**
 * Returns the set of ids that have at least one child in the list.
 * Useful for "Expand all" buttons (only nodes with children matter).
 */
export function collectParentIds<T>(
  items: T[],
  getParentId: (item: T) => string | null | undefined,
): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    const p = getParentId(item);
    if (p) ids.add(p);
  }
  return ids;
}

/**
 * Filter items by a predicate, but keep all ancestors of matching items so
 * the resulting list still forms a valid tree when re-built. Useful for
 * search-in-tree.
 */
export function filterTreePreservingAncestors<T>(
  items: T[],
  match: (item: T) => boolean,
  getId: (item: T) => string,
  getParentId: (item: T) => string | null | undefined,
): T[] {
  const byId = new Map(items.map((i) => [getId(i), i] as const));
  const keep = new Set<string>();
  for (const item of items) {
    if (!match(item)) continue;
    let current: T | undefined = item;
    while (current) {
      keep.add(getId(current));
      const p = getParentId(current);
      current = p ? byId.get(p) : undefined;
    }
  }
  return items.filter((i) => keep.has(getId(i)));
}
