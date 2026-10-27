import type { TreeNode } from 'primevue/treenode';
import type { DataPointTypeSpecification } from '@clients/specificationservice';

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

export interface ExampleRow {
  field: string;
  value: string;
}

/**
 * Flattens a nested example object into rows with dotted field paths, e.g. `dataSource.page`.
 * Null or empty values are displayed as an en dash.
 * @param example the example object of a data point base type
 * @param prefix the path prefix of the current nesting level
 * @returns the flattened rows in the original order
 */
export function flattenExample(example: unknown, prefix = ''): ExampleRow[] {
  if (typeof example !== 'object' || example === null) {
    return [{ field: prefix, value: String(example) }];
  }
  return Object.entries(example).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return flattenExample(value, path);
    }
    const isEmpty = value === null || value === undefined || value === '';
    return [{ field: path, value: isEmpty ? '–' : String(value) }];
  });
}

/**
 * Collects the distinct data point type ids of all leaves below the given nodes.
 * @param nodes the nodes to traverse
 * @returns the distinct ids
 */
export function collectDataPointTypeIds(nodes: TreeNode[]): string[] {
  const ids = new Set<string>();
  const visit = (current: TreeNode[]): void => {
    current.forEach((node) => {
      const id = (node.data as DataModelNodeData).leaf?.dataPointTypeId;
      if (node.leaf && id) ids.add(id);
      visit(node.children ?? []);
    });
  };
  visit(nodes);
  return [...ids];
}

/**
 * Replaces the humanized labels of the leaves with the real names of their data point types where known.
 * @param nodes the tree nodes
 * @param names map from data point type id to its display name
 * @returns a copy of the tree with the updated labels
 */
export function applyDataPointNames(nodes: TreeNode[], names: Record<string, string>): TreeNode[] {
  return nodes.map((node) => {
    if (node.leaf) {
      const id = (node.data as DataModelNodeData).leaf?.dataPointTypeId;
      return id && names[id] ? { ...node, label: names[id] } : node;
    }
    return { ...node, children: applyDataPointNames(node.children ?? [], names) };
  });
}

export interface DataModelTableRow {
  dataPointTypeId: string;
  name: string;
  categoryPath: string;
  aliasExport: string;
  baseTypeId: string;
  constraints: string;
  usedByCount: number | undefined;
  searchText: string;
}

/**
 * Flattens the framework tree into table rows, one per data point, enriched with the loaded type specifications.
 * Columns that depend on a type specification stay empty until the specification has been loaded.
 * @param nodes the (already named) tree nodes of the framework
 * @param types map from data point type id to its specification
 * @returns one row per data point in tree order
 */
export function buildTableRows(
  nodes: TreeNode[],
  types: Record<string, DataPointTypeSpecification>
): DataModelTableRow[] {
  const rows: DataModelTableRow[] = [];
  const visit = (current: TreeNode[], trail: string[]): void => {
    current.forEach((node) => {
      const leaf = (node.data as DataModelNodeData).leaf;
      if (node.leaf && leaf) {
        const spec = types[leaf.dataPointTypeId];
        const row = {
          dataPointTypeId: leaf.dataPointTypeId,
          name: node.label ?? leaf.dataPointTypeId,
          categoryPath: trail.join(' > '),
          aliasExport: leaf.aliasExport ?? '',
          baseTypeId: spec?.dataPointBaseType.id ?? '',
          constraints: spec?.constraints?.join(', ') ?? '',
          usedByCount: spec?.usedBy.length,
          searchText: '',
        };
        row.searchText = [row.name, row.categoryPath, row.aliasExport, row.dataPointTypeId, spec?.businessDefinition]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        rows.push(row);
      } else {
        visit(node.children ?? [], [...trail, node.label ?? '']);
      }
    });
  };
  visit(nodes, []);
  return rows;
}

/**
 * Filters table rows by a case-insensitive query over name, category, alias, id and business definition.
 * @param rows the rows to filter
 * @param query the search query
 * @returns the matching rows
 */
export function filterTableRows(rows: DataModelTableRow[], query: string): DataModelTableRow[] {
  const needle = query.trim().toLowerCase();
  return needle ? rows.filter((row) => row.searchText.includes(needle)) : rows;
}

const CSV_HEADER = ['Name', 'Category', 'Data point type', 'Export alias', 'Data format', 'Constraints', 'Used by'];

/**
 * Serializes table rows to RFC 4180 compliant CSV.
 * @param rows the rows to serialize
 * @returns the CSV text
 */
export function tableRowsToCsv(rows: DataModelTableRow[]): string {
  const escape = (value: string | number | undefined): string => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = rows.map((row) =>
    [row.name, row.categoryPath, row.dataPointTypeId, row.aliasExport, row.baseTypeId, row.constraints, row.usedByCount]
      .map(escape)
      .join(',')
  );
  return [CSV_HEADER.join(','), ...lines].join('\n');
}

export type RelationFocus = { kind: 'framework' | 'type' | 'base'; id: string };

export interface RelationHighlights {
  frameworks: Set<string>;
  types: Set<string>;
  bases: Set<string>;
}

/**
 * Computes which items of the three relation columns are connected to the focused item.
 * The chain is framework -> data point type -> base type; `usedBy` of a type links back to the frameworks.
 * @param focus the focused item, or undefined if nothing is focused
 * @param types map from data point type id to its specification (only types of the current framework)
 * @returns the connected ids per column, or undefined if nothing is focused
 */
export function computeRelationHighlights(
  focus: RelationFocus | undefined,
  types: Record<string, DataPointTypeSpecification>
): RelationHighlights | undefined {
  if (!focus) return undefined;
  const result: RelationHighlights = { frameworks: new Set(), types: new Set(), bases: new Set() };
  Object.values(types).forEach((type) => {
    const typeId = type.dataPointType.id;
    const baseId = type.dataPointBaseType.id;
    const frameworkIds = type.usedBy.map((framework) => framework.id);
    const connected =
      (focus.kind === 'type' && typeId === focus.id) ||
      (focus.kind === 'base' && baseId === focus.id) ||
      (focus.kind === 'framework' && frameworkIds.includes(focus.id));
    if (connected) {
      result.types.add(typeId);
      result.bases.add(baseId);
      frameworkIds.forEach((id) => result.frameworks.add(id));
    }
  });
  if (focus.kind === 'framework') result.frameworks = new Set([focus.id]);
  if (focus.kind === 'base') result.bases = new Set([focus.id]);
  if (focus.kind === 'type') result.types = new Set([focus.id]);
  return result;
}
