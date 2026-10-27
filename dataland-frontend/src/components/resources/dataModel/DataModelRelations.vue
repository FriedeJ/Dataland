<template>
  <div class="relations" data-test="data-model-relations-view">
    <p class="relations-hint" data-test="data-model-relations-hint">
      Select a framework, data point or data format to highlight everything it is connected to.
      <span v-if="loadingCount > 0">Loading {{ loadingCount }} more data point definitions…</span>
    </p>
    <div class="relations-columns">
      <section class="relations-column">
        <h4>Frameworks</h4>
        <ul>
          <li v-for="framework in frameworks" :key="framework.id">
            <button
              type="button"
              :class="itemClass('framework', framework.id)"
              :data-state="stateOf('framework', framework.id)"
              :data-test="`relations-framework-${framework.id}`"
              @click="focusOn('framework', framework.id)"
            >
              <span>{{ framework.name }}</span>
              <span v-if="framework.id === currentFrameworkId" class="relations-badge">current</span>
            </button>
          </li>
        </ul>
      </section>
      <section class="relations-column">
        <h4>Data points of {{ currentFrameworkName }}</h4>
        <ul>
          <li v-for="row in rows" :key="row.dataPointTypeId">
            <button
              type="button"
              :class="itemClass('type', row.dataPointTypeId)"
              :data-state="stateOf('type', row.dataPointTypeId)"
              :data-test="`relations-type-${row.dataPointTypeId}`"
              @click="focusOn('type', row.dataPointTypeId)"
            >
              <span>{{ row.name }}</span>
              <small v-if="row.usedByCount !== undefined">used by {{ row.usedByCount }}</small>
            </button>
          </li>
        </ul>
        <p v-if="rows.length === 0" data-test="data-model-no-results">No data points match your search.</p>
      </section>
      <section class="relations-column">
        <h4>Data formats</h4>
        <ul>
          <li v-for="base in bases" :key="base.id">
            <button
              type="button"
              :class="itemClass('base', base.id)"
              :data-state="stateOf('base', base.id)"
              :data-test="`relations-base-${base.id}`"
              @click="focusOn('base', base.id)"
            >
              <code>{{ base.id }}</code>
              <small>{{ base.count }} data points</small>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DataPointTypeSpecification } from '@clients/specificationservice';
import { computeRelationHighlights, type DataModelTableRow, type RelationFocus } from '@/utils/DataModelUtils.ts';

const props = defineProps<{
  frameworks: { id: string; name: string }[];
  currentFrameworkId?: string;
  /** All data points of the current framework (unfiltered); used to derive the relations. */
  allRows: DataModelTableRow[];
  /** The data points to display in the middle column (filtered by the search). */
  rows: DataModelTableRow[];
  types: Record<string, DataPointTypeSpecification>;
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [dataPointTypeId: string];
}>();

const focus = ref<RelationFocus | undefined>(props.selectedId ? { kind: 'type', id: props.selectedId } : undefined);
watch(
  () => props.selectedId,
  (id) => {
    if (id) focus.value = { kind: 'type', id };
  }
);

const highlights = computed(() => computeRelationHighlights(focus.value, props.types));
const currentFrameworkName = computed(
  () => props.frameworks.find((framework) => framework.id === props.currentFrameworkId)?.name ?? ''
);
const loadingCount = computed(() => props.allRows.filter((row) => !row.baseTypeId).length);

const bases = computed(() => {
  const counts = new Map<string, number>();
  props.allRows.forEach((row) => {
    if (row.baseTypeId) counts.set(row.baseTypeId, (counts.get(row.baseTypeId) ?? 0) + 1);
  });
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => a.id.localeCompare(b.id));
});

/**
 * Returns whether the item is focused, connected to the focus or unrelated (dimmed).
 */
function stateOf(kind: RelationFocus['kind'], id: string): 'focused' | 'connected' | 'dimmed' | 'none' {
  if (!highlights.value) return 'none';
  if (focus.value?.kind === kind && focus.value.id === id) return 'focused';
  const set = { framework: highlights.value.frameworks, type: highlights.value.types, base: highlights.value.bases }[
    kind
  ];
  return set.has(id) ? 'connected' : 'dimmed';
}

/**
 * Builds the CSS classes of a relation item.
 */
function itemClass(kind: RelationFocus['kind'], id: string): string[] {
  return ['relations-item', `relations-item--${stateOf(kind, id)}`];
}

/**
 * Focuses an item. Data points are also selected so that the shared details panel shows them.
 */
function focusOn(kind: RelationFocus['kind'], id: string): void {
  focus.value = { kind, id };
  if (kind === 'type') emit('select', id);
}
</script>

<style scoped>
.relations-hint {
  margin-bottom: 0.75rem;
  color: var(--p-text-muted-color);
}
.relations-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.relations-column h4 {
  margin: 0 0 0.5rem;
}
.relations-column ul {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 26rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.relations-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  text-align: left;
  cursor: pointer;
  background: var(--p-surface-0, #fff);
  color: inherit;
  border: 1px solid var(--p-surface-200, #ddd);
  border-radius: 6px;
}
.relations-item small,
.relations-badge {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  white-space: nowrap;
}
.relations-item--connected {
  border-color: var(--p-primary-color);
  background: var(--p-surface-50, #fafafa);
}
.relations-item--focused {
  background: var(--p-primary-color);
  border-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}
.relations-item--focused small,
.relations-item--focused .relations-badge {
  color: inherit;
}
.relations-item--dimmed {
  opacity: 0.35;
}
@media (max-width: 800px) {
  .relations-columns {
    grid-template-columns: 1fr;
  }
}
</style>
