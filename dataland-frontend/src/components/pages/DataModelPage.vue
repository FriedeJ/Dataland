<template>
  <TheContent data-test="data-model-page">
    <MarginWrapper class="data-model-page">
      <h1>Data Model Documentation</h1>
      <p class="data-model-intro">
        Explore which data points each framework consists of, how they are defined, and which frameworks share them.
      </p>

      <div
        v-if="!frameworkListQuery.isError.value && !frameworkListQuery.isPending.value"
        class="data-model-framework-row"
      >
        <div v-if="frameworkId && frameworkSpec" data-test="data-model-framework-header">
          <h2>{{ frameworkSpec.name }}</h2>
          <p>{{ frameworkSpec.businessDefinition }}</p>
          <small>{{ dataPointCount }} {{ dataPointCount === 1 ? 'data point' : 'data points' }}</small>
        </div>
        <span v-else />
        <PrimeSelect
          :model-value="frameworkId"
          :options="frameworks"
          option-label="name"
          option-value="id"
          placeholder="Select a framework"
          class="data-model-framework-select"
          data-test="data-model-framework-select"
          @update:model-value="selectFramework"
        />
      </div>

      <Message v-if="frameworkListQuery.isError.value" severity="error"
        >The list of frameworks could not be loaded.</Message
      >
      <ProgressSpinner v-else-if="frameworkListQuery.isPending.value" />

      <div v-else-if="!frameworkId" class="data-model-cards" data-test="data-model-framework-cards">
        <Card
          v-for="framework in frameworks"
          :key="framework.id"
          class="cursor-pointer"
          :data-test="`data-model-card-${framework.id}`"
          @click="selectFramework(framework.id)"
        >
          <template #title>{{ framework.name }}</template>
          <template #content
            ><code>{{ framework.id }}</code></template
          >
        </Card>
      </div>

      <template v-else>
        <Message v-if="frameworkQuery.isError.value" severity="error" data-test="data-model-framework-error">
          This framework could not be loaded. It may not have a documented data model yet.
        </Message>
        <ProgressSpinner v-else-if="frameworkQuery.isPending.value" />
        <template v-else-if="frameworkSpec">
          <DataModelUsage :framework-id="frameworkSpec.framework.id" />

          <div class="data-model-toolbar">
            <SelectButton
              :model-value="activeView"
              :options="viewOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              data-test="data-model-view-switch"
              @update:model-value="selectView"
            />
            <IconField class="data-model-search">
              <InputIcon class="pi pi-search" />
              <InputText v-model="searchQuery" placeholder="Search data points" fluid data-test="data-model-search" />
            </IconField>
          </div>

          <div :class="['data-model-layout', { 'data-model-layout--stacked': activeView !== 'tree' }]">
            <div class="data-model-main-column">
              <template v-if="activeView === 'tree'">
                <Tree
                  v-model:expandedKeys="expandedKeys"
                  v-model:selectionKeys="selectionKeys"
                  :value="visibleNodes"
                  selection-mode="single"
                  data-test="data-model-tree"
                  @node-select="onNodeSelect"
                />
                <p v-if="visibleNodes.length === 0" data-test="data-model-no-results">
                  No data points match your search.
                </p>
              </template>
              <DataModelErd
                v-else-if="activeView === 'diagram'"
                :rows="diagramRows"
                :framework-names="frameworkNames"
                :selected-id="selectedFieldId"
                @select="selectField"
                @select-framework="selectFrameworkKeepingField"
              />
              <DataModelTable
                v-else-if="activeView === 'table'"
                :rows="visibleRows"
                :selected-id="selectedFieldId"
                @select="selectField"
                @download-csv="downloadCsv"
              />
            </div>
            <div v-if="activeView !== 'diagram'" class="data-model-details-column">
              <DataModelFieldDetails
                v-if="selectedLeaf"
                :key="selectedLeaf.dataPointTypeId"
                :data-point-type-id="selectedLeaf.dataPointTypeId"
                :alias-export="selectedLeaf.aliasExport"
                :current-framework-id="frameworkId"
                :framework-names="frameworkNames"
                @select-framework="selectFrameworkKeepingField"
                @select-field="selectField"
              />
              <p v-else class="data-model-hint" data-test="data-model-no-selection">
                Select a data point to see its definition.
              </p>
            </div>
          </div>
        </template>
      </template>
    </MarginWrapper>
  </TheContent>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Card from 'primevue/card';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import PrimeSelect from 'primevue/select';
import ProgressSpinner from 'primevue/progressspinner';
import SelectButton from 'primevue/selectbutton';
import Tree from 'primevue/tree';
import type { TreeNode } from 'primevue/treenode';
import TheContent from '@/components/generics/TheContent.vue';
import MarginWrapper from '@/components/wrapper/MarginWrapper.vue';
import DataModelErd from '@/components/resources/dataModel/DataModelErd.vue';
import DataModelUsage from '@/components/resources/dataModel/DataModelUsage.vue';
import DataModelTable from '@/components/resources/dataModel/DataModelTable.vue';
import DataModelFieldDetails from '@/components/resources/dataModel/DataModelFieldDetails.vue';
import {
  useDataPointTypesQuery,
  useFrameworkListQuery,
  useFrameworkSpecificationQuery,
} from '@/api-queries/specification-service/useSpecificationQueries.ts';
import {
  applyDataPointNames,
  buildTableRows,
  filterTableRows,
  tableRowsToCsv,
  collectDataPointTypeIds,
  collectExpandableKeys,
  countDataPoints,
  filterTree,
  parseFrameworkSchema,
  type DataModelLeafData,
  type DataModelTableRow,
  type DataModelNodeData,
} from '@/utils/DataModelUtils.ts';

const route = useRoute();
const router = useRouter();

const frameworkId = computed(() => (route.params.frameworkId as string | undefined) || undefined);
const selectedFieldId = computed(() => (route.query.field as string | undefined) || undefined);

type DataModelView = 'tree' | 'table' | 'diagram';
const viewOptions: { label: string; value: DataModelView }[] = [
  { label: 'Tree', value: 'tree' },
  { label: 'Table', value: 'table' },
  { label: 'Diagram', value: 'diagram' },
];
const activeView = computed<DataModelView>(() =>
  ['table', 'diagram'].includes(route.query.view as string) ? (route.query.view as DataModelView) : 'tree'
);

const frameworkListQuery = useFrameworkListQuery();
const frameworks = computed(() =>
  (frameworkListQuery.data.value ?? [])
    .map((entry) => ({ id: entry.framework.id, name: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
);
const frameworkNames = computed(() => Object.fromEntries(frameworks.value.map((f) => [f.id, f.name])));

const frameworkQuery = useFrameworkSpecificationQuery(frameworkId);
const frameworkSpec = computed(() => frameworkQuery.data.value);

const parsedNodes = computed<TreeNode[]>(() =>
  frameworkSpec.value ? parseFrameworkSchema(frameworkSpec.value.schema) : []
);
const dataPointTypes = useDataPointTypesQuery(() => collectDataPointTypeIds(parsedNodes.value));
const dataPointNames = computed(() =>
  Object.fromEntries(Object.entries(dataPointTypes.value).map(([id, spec]) => [id, spec.name]))
);
const searchableTexts = computed(() =>
  Object.fromEntries(
    Object.entries(dataPointTypes.value).map(([id, spec]) => [id, `${spec.name} ${spec.businessDefinition}`])
  )
);
// Labels are the humanized schema keys until the real names have been loaded.
const allNodes = computed<TreeNode[]>(() => applyDataPointNames(parsedNodes.value, dataPointNames.value));
const dataPointCount = computed(() => countDataPoints(allNodes.value));

const searchQuery = ref('');
const visibleNodes = computed(() => filterTree(allNodes.value, searchQuery.value, searchableTexts.value));

const tableRows = computed(() => buildTableRows(allNodes.value, dataPointTypes.value));
const visibleRows = computed(() => filterTableRows(tableRows.value, searchQuery.value));

// The diagram picker always contains the selected data point, even if the search would hide it.
const diagramRows = computed(() => {
  const selected = tableRows.value.find((row) => row.dataPointTypeId === selectedFieldId.value);
  return selected && !visibleRows.value.includes(selected) ? [selected, ...visibleRows.value] : visibleRows.value;
});

const expandedKeys = ref<Record<string, boolean>>({});
const selectionKeys = ref<Record<string, boolean>>({});

/**
 * Finds the tree key of the leaf node that represents the given data point type.
 */
function findLeafKey(nodes: TreeNode[], dataPointTypeId: string): string | undefined {
  for (const node of nodes) {
    if (node.leaf && (node.data as DataModelNodeData).leaf?.dataPointTypeId === dataPointTypeId) {
      return node.key;
    }
    const found = findLeafKey(node.children ?? [], dataPointTypeId);
    if (found) return found;
  }
  return undefined;
}

const selectedLeaf = computed<DataModelLeafData | undefined>(() => {
  const key = selectedFieldId.value ? findLeafKey(allNodes.value, selectedFieldId.value) : undefined;
  if (!key) return undefined;
  const find = (nodes: TreeNode[]): TreeNode | undefined =>
    nodes.reduce<TreeNode | undefined>(
      (acc, node) => acc ?? (node.key === key ? node : find(node.children ?? [])),
      undefined
    );
  return (find(allNodes.value)?.data as DataModelNodeData | undefined)?.leaf;
});

/**
 * Collects the keys of all category nodes above the leaf of the given data point type.
 */
function findAncestorKeys(nodes: TreeNode[], dataPointTypeId: string, trail: string[] = []): string[] | undefined {
  for (const node of nodes) {
    if (node.leaf) {
      if ((node.data as DataModelNodeData).leaf?.dataPointTypeId === dataPointTypeId) return trail;
    } else {
      const found = findAncestorKeys(node.children ?? [], dataPointTypeId, [...trail, node.key as string]);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Expands the categories above the selected data point without collapsing anything the user has opened.
 */
function revealSelectedField(): void {
  if (!selectedFieldId.value) return;
  const ancestors = findAncestorKeys(allNodes.value, selectedFieldId.value) ?? [];
  expandedKeys.value = { ...expandedKeys.value, ...Object.fromEntries(ancestors.map((key) => [key, true])) };
}

let expandedKeysBeforeSearch: Record<string, boolean> | undefined;

// The tree starts fully collapsed; only the path to a deep-linked data point is opened.
watch(
  parsedNodes,
  () => {
    expandedKeysBeforeSearch = undefined;
    expandedKeys.value = {};
    revealSelectedField();
  },
  { immediate: true }
);

// Selecting an item must not change the expansion state of the tree.
watch(
  [parsedNodes, selectedFieldId],
  () => {
    const key = selectedFieldId.value ? findLeafKey(allNodes.value, selectedFieldId.value) : undefined;
    selectionKeys.value = key ? { [key]: true } : {};
    revealSelectedField();
  },
  { immediate: true }
);

watch(frameworkId, () => {
  searchQuery.value = '';
});

watch(searchQuery, (query) => {
  if (query.trim()) {
    expandedKeysBeforeSearch ??= expandedKeys.value;
    expandedKeys.value = collectExpandableKeys(visibleNodes.value);
  } else if (expandedKeysBeforeSearch) {
    expandedKeys.value = expandedKeysBeforeSearch;
    expandedKeysBeforeSearch = undefined;
  }
});

/**
 * Scrolls the selected tree node into view, so that the tree shows the same item as the table and the diagram.
 */
async function scrollSelectedNodeIntoView(): Promise<void> {
  await nextTick();
  document.querySelector('[data-test="data-model-tree"] .p-tree-node-selected')?.scrollIntoView({ block: 'nearest' });
}
onMounted(scrollSelectedNodeIntoView);
watch([activeView, selectedFieldId], scrollSelectedNodeIntoView);

/**
 * Switches between the views and keeps the selected data point. A search that would hide the selected data point in
 * the new view is cleared, so that all views show the same item.
 */
async function selectView(view: DataModelView): Promise<void> {
  if (selectedFieldId.value && !visibleRows.value.some((row) => row.dataPointTypeId === selectedFieldId.value)) {
    searchQuery.value = '';
  }
  await router.replace({ query: { ...route.query, view: view === 'tree' ? undefined : view } });
}

/**
 * Selects a data point (e.g. from the table) by storing it in the URL.
 */
async function selectField(dataPointTypeId: string): Promise<void> {
  await router.replace({ query: { ...route.query, field: dataPointTypeId } });
}

/**
 * Downloads the currently visible table rows as CSV file.
 */
function downloadCsv(rows: DataModelTableRow[] = visibleRows.value): void {
  const blob = new Blob([tableRowsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${frameworkId.value ?? 'data-model'}-data-points.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Navigates to the documentation of the given framework.
 */
async function selectFramework(newFrameworkId: string | undefined): Promise<void> {
  if (!newFrameworkId) return;
  await router.push({ path: `/data-model/${newFrameworkId}` });
}

/**
 * Navigates to another framework and keeps the currently selected data point in the URL.
 */
async function selectFrameworkKeepingField(newFrameworkId: string): Promise<void> {
  await router.push({
    path: `/data-model/${newFrameworkId}`,
    query: { field: selectedFieldId.value, view: route.query.view },
  });
}

/**
 * Stores the selected data point in the URL so that the view is shareable.
 * Clicking a category only toggles it and keeps the current selection.
 */
async function onNodeSelect(node: TreeNode): Promise<void> {
  const leaf = (node.data as DataModelNodeData).leaf;
  if (!leaf) {
    const key = node.key as string;
    expandedKeys.value = { ...expandedKeys.value, [key]: !expandedKeys.value[key] };
    const selectedKey = selectedFieldId.value ? findLeafKey(allNodes.value, selectedFieldId.value) : undefined;
    selectionKeys.value = selectedKey ? { [selectedKey]: true } : {};
    return;
  }
  await router.replace({ query: { ...route.query, field: leaf.dataPointTypeId } });
}
</script>

<style scoped>
/* PrimeFlex's .grid has a negative right margin that causes horizontal scrolling; other pages reset it as well. */
.data-model-page {
  margin-right: 0;
}
.data-model-page :deep(.col-12) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
  max-width: 100%;
}
.data-model-page h1,
.data-model-page h2,
.data-model-page p {
  margin: 0;
}
.data-model-framework-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.data-model-framework-select {
  width: 20rem;
  max-width: 100%;
}
.data-model-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 1rem;
}
.data-model-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}
.data-model-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.data-model-main-column {
  flex: 1 1 22rem;
  min-width: 0;
}
.data-model-details-column {
  flex: 2 1 28rem;
  min-width: 0;
}
.data-model-search {
  width: 22rem;
  max-width: 100%;
}
.data-model-hint {
  color: var(--p-text-muted-color);
}
/* The Dataland theme uses a dark highlight colour with dark text, which makes selected tree nodes unreadable. */
.data-model-main-column :deep(.p-tree-node-content.p-tree-node-selected) {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}
.data-model-main-column :deep(.p-tree-node-content.p-tree-node-selected .p-tree-node-icon),
.data-model-main-column :deep(.p-tree-node-content.p-tree-node-selected .p-tree-node-toggle-button) {
  color: var(--p-primary-contrast-color);
}
.data-model-layout--stacked {
  flex-direction: column;
  align-items: stretch;
}
.data-model-layout--stacked .data-model-main-column,
.data-model-layout--stacked .data-model-details-column {
  flex: none;
  width: 100%;
}
@media (max-width: 800px) {
  .data-model-layout {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
