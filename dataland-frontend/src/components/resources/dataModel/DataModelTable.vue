<template>
  <div data-test="data-model-table-view">
    <div class="data-model-table-toolbar">
      <small data-test="data-model-table-count">{{ filteredRows.length }} of {{ rows.length }} data points</small>
      <div class="data-model-table-actions">
        <label class="data-model-technical-toggle">
          <ToggleSwitch v-model="showTechnical" data-test="data-model-toggle-technical-columns" />
          <span>Show technical columns</span>
        </label>
        <PrimeButton
          label="DOWNLOAD CSV"
          icon="pi pi-download"
          variant="outlined"
          size="small"
          :disabled="filteredRows.length === 0"
          data-test="data-model-download-csv"
          @click="emit('downloadCsv', filteredRows)"
        />
      </div>
    </div>
    <DataTable
      :value="rows"
      data-key="dataPointTypeId"
      selection-mode="single"
      :selection="selectedRow"
      sort-field="baseName"
      :sort-order="1"
      size="small"
      scrollable
      :paginator="rows.length > 25"
      :rows="25"
      v-model:filters="filters"
      filter-display="menu"
      data-test="data-model-table"
      @filter="onFilter"
      @row-select="(event) => emit('select', event.data.dataPointTypeId)"
    >
      <Column field="baseName" header="Data point" sortable :show-filter-match-modes="false" :show-apply-button="false">
        <template #filter="{ filterModel, filterCallback }">
          <Listbox
            v-model="filterModel.value"
            @change="filterCallback()"
            :options="optionsFor('baseName')"
            multiple
            checkbox
            filter
            class="data-model-filter-list"
            list-style="max-height: 14rem"
            data-test="data-model-filter-baseName"
          />
        </template>
      </Column>
      <Column field="detail" header="Detail" sortable :show-filter-match-modes="false" :show-apply-button="false">
        <template #body="{ data }">{{ data.detail || '–' }}</template>
        <template #filter="{ filterModel, filterCallback }">
          <Listbox
            v-model="filterModel.value"
            @change="filterCallback()"
            :options="optionsFor('detail')"
            multiple
            checkbox
            filter
            class="data-model-filter-list"
            list-style="max-height: 14rem"
            data-test="data-model-filter-detail"
          />
        </template>
      </Column>
      <Column
        field="categoryPath"
        header="Category"
        sortable
        :show-filter-match-modes="false"
        :show-apply-button="false"
      >
        <template #filter="{ filterModel, filterCallback }">
          <Listbox
            v-model="filterModel.value"
            @change="filterCallback()"
            :options="optionsFor('categoryPath')"
            multiple
            checkbox
            filter
            class="data-model-filter-list"
            list-style="max-height: 14rem"
            data-test="data-model-filter-categoryPath"
          />
        </template>
      </Column>
      <Column
        field="valueType"
        header="Value type"
        sortable
        :show-filter-match-modes="false"
        :show-apply-button="false"
      >
        <template #body="{ data }">
          <span v-if="data.valueType">{{ data.valueType }}</span>
          <ProgressSpinner v-else style="width: 1rem; height: 1rem" />
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Listbox
            v-model="filterModel.value"
            @change="filterCallback()"
            :options="optionsFor('valueType')"
            multiple
            checkbox
            filter
            class="data-model-filter-list"
            list-style="max-height: 14rem"
            data-test="data-model-filter-valueType"
          />
        </template>
      </Column>
      <Column
        field="allowedValues"
        header="Allowed values"
        sortable
        :show-filter-match-modes="false"
        :show-apply-button="false"
      >
        <template #body="{ data }">{{ data.allowedValues || '–' }}</template>
        <template #filter="{ filterModel, filterCallback }">
          <Listbox
            v-model="filterModel.value"
            @change="filterCallback()"
            :options="optionsFor('allowedValues')"
            multiple
            checkbox
            filter
            class="data-model-filter-list"
            list-style="max-height: 14rem"
            data-test="data-model-filter-allowedValues"
          />
        </template>
      </Column>
      <Column field="usedByCount" header="Used in" sortable :show-filter-match-modes="false" :show-apply-button="false">
        <template #body="{ data }">
          <template v-if="data.usedByCount !== undefined">
            {{ data.usedByCount }} {{ data.usedByCount === 1 ? 'framework' : 'frameworks' }}
          </template>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Listbox
            v-model="filterModel.value"
            @change="filterCallback()"
            :options="optionsFor('usedByCount')"
            multiple
            checkbox
            filter
            class="data-model-filter-list"
            list-style="max-height: 14rem"
            data-test="data-model-filter-usedByCount"
          />
        </template>
      </Column>
      <template v-if="showTechnical">
        <Column field="dataPointTypeId" header="Data point type" sortable>
          <template #body="{ data }">
            <code>{{ data.dataPointTypeId }}</code>
          </template>
        </Column>
        <Column field="aliasExport" header="Export alias" sortable />
        <Column field="baseTypeId" header="Base type" sortable />
      </template>
      <template #empty>
        <span data-test="data-model-no-results">No data points match your search.</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import Listbox from 'primevue/listbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import PrimeButton from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import ToggleSwitch from 'primevue/toggleswitch';
import type { DataTableFilterEvent } from 'primevue/datatable';
import type { DataModelTableRow } from '@/utils/DataModelUtils.ts';

const props = defineProps<{
  rows: DataModelTableRow[];
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [dataPointTypeId: string];
  downloadCsv: [rows: DataModelTableRow[]];
}>();

const showTechnical = ref(false);

type FilterableField = 'baseName' | 'detail' | 'categoryPath' | 'valueType' | 'allowedValues' | 'usedByCount';
const filterableFields: FilterableField[] = [
  'baseName',
  'detail',
  'categoryPath',
  'valueType',
  'allowedValues',
  'usedByCount',
];
const filters = ref(
  Object.fromEntries(filterableFields.map((field) => [field, { value: null, matchMode: FilterMatchMode.IN }]))
);
const filteredRows = ref<DataModelTableRow[]>(props.rows);
watch(
  () => props.rows,
  (rows) => {
    filteredRows.value = applyFilters(rows);
  }
);

/**
 * Applies the active column filters to the given rows.
 */
function applyFilters(rows: DataModelTableRow[]): DataModelTableRow[] {
  return rows.filter((row) =>
    filterableFields.every((field) => {
      const selected = filters.value[field]?.value as unknown[] | null;
      return !selected?.length || selected.includes(row[field]);
    })
  );
}

/**
 * Remembers the rows that remain after filtering, so that the count and the CSV export match the table.
 */
function onFilter(event: DataTableFilterEvent): void {
  filteredRows.value = event.filteredValue as DataModelTableRow[];
}

/**
 * Returns the distinct, sorted values that can be selected in the filter of a column.
 */
function optionsFor(field: FilterableField): Array<string | number> {
  const values = new Set<string | number>();
  props.rows.forEach((row) => {
    const value = row[field];
    if (value !== '' && value !== undefined) values.add(value);
  });
  return [...values].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
  );
}
const selectedRow = computed(() => props.rows.find((row) => row.dataPointTypeId === props.selectedId));
</script>

<style scoped>
.data-model-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.data-model-table-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.data-model-technical-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}
.data-model-filter-list {
  min-width: 16rem;
}
</style>
