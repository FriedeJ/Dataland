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

const FIELD_TYPES: Record<string, string> = {
  String: 'Text',
  LocalDate: 'Date',
  BigDecimal: 'Number',
  Long: 'Whole number',
  Int: 'Whole number',
  Boolean: 'True / False',
  QualityOptions: 'Quality (selection)',
  YesNo: 'Yes / No',
  YesNoNa: 'Yes / No / N/A',
  CurrencyCode: 'Currency code',
};

/**
 * Translates the type name from a base type schema (e.g. `LocalDate`) into a readable name.
 * @param type the type entry of the schema
 * @returns the readable type, or an en dash if the schema has no simple type for the field
 */
export function friendlyFieldType(type: unknown): string {
  return typeof type === 'string' ? (FIELD_TYPES[type] ?? type) : '–';
}

export interface ExampleRow {
  field: string;
  type: string;
  value: string;
}

/**
 * Flattens a nested example object into rows with dotted field paths, e.g. `dataSource.page`.
 * Null or empty values are displayed as an en dash.
 * @param example the example object of a data point base type
 * @param prefix the path prefix of the current nesting level
 * @returns the flattened rows in the original order
 */
export function flattenExample(example: unknown, schema?: unknown, prefix = ''): ExampleRow[] {
  const typeAt = (key?: string): unknown =>
    typeof schema === 'object' && schema !== null && key !== undefined
      ? (schema as Record<string, unknown>)[key]
      : undefined;
  if (typeof example !== 'object' || example === null) {
    return [{ field: prefix, type: friendlyFieldType(schema), value: String(example) }];
  }
  return Object.entries(example).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return flattenExample(value, typeAt(key), path);
    }
    const isEmpty = value === null || value === undefined || value === '';
    return [{ field: path, type: friendlyFieldType(typeAt(key)), value: isEmpty ? '–' : String(value) }];
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
  baseName: string;
  detail: string;
  categoryPath: string;
  aliasExport: string;
  baseTypeId: string;
  valueType: string;
  constraints: string;
  allowedValues: string;
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
          ...splitDataPointName(node.label ?? leaf.dataPointTypeId),
          categoryPath: trail.join(' > '),
          aliasExport: leaf.aliasExport ?? '',
          baseTypeId: spec?.dataPointBaseType.id ?? '',
          valueType: spec ? friendlyValueType(spec.dataPointBaseType.id) : '',
          constraints: spec?.constraints?.join(', ') ?? '',
          allowedValues: friendlyConstraints(spec?.constraints),
          usedByCount: spec?.usedBy.length,
          searchText: '',
        };
        row.searchText = [
          row.name,
          row.categoryPath,
          row.valueType,
          row.aliasExport,
          row.dataPointTypeId,
          spec?.businessDefinition,
        ]
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
// The CSV export intentionally keeps the technical columns, they are the ones developers need.

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

/**
 * Splits a data point name of the form `Parent - Detail` into its two levels.
 * Names without the separator have no detail.
 * @param name the full data point name
 * @returns the part before the separator and the part after it
 */
export function splitDataPointName(name: string): { baseName: string; detail: string } {
  const index = name.lastIndexOf(' - ');
  return index < 0
    ? { baseName: name, detail: '' }
    : { baseName: name.slice(0, index).trim(), detail: name.slice(index + 3).trim() };
}

const VALUE_TYPE_RULES: Array<[RegExp, string]> = [
  [/^extendedCurrency/, 'Currency amount'],
  [/^extendedDecimal/, 'Number'],
  [/^extendedInteger/, 'Whole number'],
  [/^(extended|plain)Date/, 'Date'],
  [/^extendedEnumYesNoNa$/, 'Yes / No / N/A'],
  [/^extendedEnumYesNo$/, 'Yes / No'],
  [/(Activities|Denominator|Numerator|Aligned|Eligible)Component$/, 'Activity breakdown'],
  [/Enum|Sectors$/, 'Selection from a list'],
];

/**
 * Translates the technical id of a data point base type into a name that business users understand.
 * Unknown ids fall back to a humanized version of the id.
 * @param baseTypeId the id of the data point base type, e.g. `extendedDecimal`
 * @returns a readable value type, e.g. `Number`
 */
export function friendlyValueType(baseTypeId: string): string {
  return VALUE_TYPE_RULES.find(([pattern]) => pattern.test(baseTypeId))?.[1] ?? humanizeKey(baseTypeId);
}

/**
 * Translates technical constraints such as `between:0,100` or `min:0` into readable text.
 * @param constraints the constraints of a data point type
 * @returns readable text, or an empty string if there are no constraints
 */
export function friendlyConstraints(constraints: string[] | undefined): string {
  return (constraints ?? [])
    .map((constraint) => {
      const [kind, argument = ''] = constraint.split(':');
      if (kind === 'between') return argument.split(',').join(' – ');
      if (kind === 'min') return `at least ${argument}`;
      if (kind === 'max') return `at most ${argument}`;
      return constraint;
    })
    .join(', ');
}

const CALCULATION_METHODS: Record<string, string> = {
  Identity: 'Same value as',
  Sum: 'Sum of',
  Subtraction: 'Difference of',
  MultiplicationByPercent: 'Multiplication by a percentage of',
  MultiplicationByComplementPercent: 'Multiplication by the complement of a percentage of',
  MultiplicationByPercentMinusCurrency: 'Multiplication by a percentage, minus a currency amount, of',
  DivisionByPercent: 'Division by a percentage of',
  ComplementToPercent: 'Complement to 100 % of',
  EuTaxonomyShare: 'EU Taxonomy share derived from',
  EuTaxonomyActivityMerge: 'EU Taxonomy activities merged from',
};

/**
 * Translates the name of a calculation method into a readable phrase.
 * @param method the calculation method, e.g. `Sum`
 * @returns a readable phrase that can be followed by the input names
 */
export function friendlyCalculationMethod(method: string): string {
  return CALCULATION_METHODS[method] ?? `${humanizeKey(method)} of`;
}

export interface DataPointPlacement {
  categoryPath: string;
  aliasExport: string;
}

/**
 * Finds where a data point type is placed in a framework tree.
 * @param nodes the tree nodes of the framework
 * @param dataPointTypeId the data point type to look for
 * @returns the category path and export alias, or undefined if the framework does not contain the type
 */
export function findPlacement(nodes: TreeNode[], dataPointTypeId: string): DataPointPlacement | undefined {
  const visit = (current: TreeNode[], trail: string[]): DataPointPlacement | undefined => {
    for (const node of current) {
      const leaf = (node.data as DataModelNodeData).leaf;
      if (node.leaf && leaf?.dataPointTypeId === dataPointTypeId) {
        return { categoryPath: trail.join(' > '), aliasExport: leaf.aliasExport ?? '' };
      }
      const found = node.leaf ? undefined : visit(node.children ?? [], [...trail, node.label ?? '']);
      if (found) return found;
    }
    return undefined;
  };
  return visit(nodes, []);
}
