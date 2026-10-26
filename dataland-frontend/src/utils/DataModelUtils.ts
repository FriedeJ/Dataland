import type { TreeNode } from 'primevue/treenode';

export interface DataModelLeafData {
  dataPointTypeId: string;
  aliasExport?: string;
}

export interface DataModelNodeData {
  /** Present only on leaf nodes (data points). */
  leaf?: DataModelLeafData;
}

interface RawLeaf {
  id: string;
  ref?: string;
  aliasExport?: string;
}

/**
 * Converts a camelCase key (e.g. "fiscalYearEnd") into a human readable label ("Fiscal Year End").
 * @param key the camelCase key
 * @returns the readable label
 */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Checks whether a schema entry is a data point reference (leaf) instead of a category.
 */
function isRawLeaf(value: unknown): value is RawLeaf {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RawLeaf).id === 'string' &&
    typeof (value as RawLeaf).ref === 'string'
  );
}

/**
 * Recursively builds PrimeVue tree nodes from the parsed schema object.
 */
function buildNodes(schema: Record<string, unknown>, parentKey: string): TreeNode[] {
  return Object.entries(schema).map(([key, value]) => {
    const nodeKey = parentKey ? `${parentKey}.${key}` : key;
    if (isRawLeaf(value)) {
      const data: DataModelNodeData = { leaf: { dataPointTypeId: value.id, aliasExport: value.aliasExport } };
      return { key: nodeKey, label: humanizeKey(key), data, leaf: true, icon: 'pi pi-tag' } as TreeNode;
    }
    const children = buildNodes(value as Record<string, unknown>, nodeKey);
    return { key: nodeKey, label: humanizeKey(key), data: {}, children, leaf: false } as TreeNode;
  });
}

/**
 * Parses the schema string of a framework specification into PrimeVue tree nodes.
 * Categories and subcategories without any data points are removed.
 * @param schemaJson the JSON string provided in the `schema` field of a framework specification
 * @returns the tree nodes
 */
export function parseFrameworkSchema(schemaJson: string): TreeNode[] {
  const parsed = JSON.parse(schemaJson) as Record<string, unknown>;
  return pruneEmptyNodes(buildNodes(parsed, ''));
}

/**
 * Removes categories that do not contain any data points.
 */
function pruneEmptyNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((node) => (node.leaf ? node : { ...node, children: pruneEmptyNodes(node.children ?? []) }))
    .filter((node) => node.leaf || (node.children?.length ?? 0) > 0);
}

/**
 * Counts the leaves (data points) below the given nodes.
 * @param nodes the nodes to count in
 * @returns the number of data points
 */
export function countDataPoints(nodes: TreeNode[]): number {
  return nodes.reduce((sum, node) => sum + (node.leaf ? 1 : countDataPoints(node.children ?? [])), 0);
}

/**
 * Collects the keys of all nodes that have children, so that the tree can be fully expanded.
 * @param nodes the nodes to traverse
 * @returns a map of expanded node keys as expected by PrimeVue Tree
 */
export function collectExpandableKeys(nodes: TreeNode[]): Record<string, boolean> {
  const keys: Record<string, boolean> = {};
  const visit = (current: TreeNode[]): void => {
    current.forEach((node) => {
      if (!node.leaf) {
        keys[node.key as string] = true;
        visit(node.children ?? []);
      }
    });
  };
  visit(nodes);
  return keys;
}

/**
 * Filters the tree to only the leaves matching the query (case-insensitive on label, alias export and type id).
 * Parent nodes are kept when they contain at least one match.
 * @param nodes the tree nodes
 * @param query the search query
 * @param typeNames optional map from data point type id to resolved display name
 * @returns the filtered tree
 */
export function filterTree(nodes: TreeNode[], query: string, typeNames: Record<string, string> = {}): TreeNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return nodes;
  const matches = (node: TreeNode): boolean => {
    const leaf = (node.data as DataModelNodeData).leaf;
    const haystack = [node.label, leaf?.aliasExport, leaf?.dataPointTypeId, leaf ? typeNames[leaf.dataPointTypeId] : '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  };
  return nodes
    .map((node) =>
      node.leaf
        ? matches(node)
          ? node
          : undefined
        : { ...node, children: filterTree(node.children ?? [], query, typeNames) }
    )
    .filter((node): node is TreeNode => node !== undefined && (node.leaf || (node.children?.length ?? 0) > 0));
}
