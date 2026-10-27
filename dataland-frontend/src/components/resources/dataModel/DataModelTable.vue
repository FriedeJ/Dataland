<template>
  <div data-test="data-model-table-view">
    <div class="data-model-table-toolbar">
      <small>{{ rows.length }} data points</small>
      <PrimeButton
        label="DOWNLOAD CSV"
        icon="pi pi-download"
        variant="outlined"
        size="small"
        :disabled="rows.length === 0"
        data-test="data-model-download-csv"
        @click="emit('downloadCsv')"
      />
    </div>
    <DataTable
      :value="rows"
      data-key="dataPointTypeId"
      selection-mode="single"
      :selection="selectedRow"
      sort-field="name"
      :sort-order="1"
      size="small"
      scrollable
      :paginator="rows.length > 25"
      :rows="25"
      data-test="data-model-table"
      @row-select="(event) => emit('select', event.data.dataPointTypeId)"
    >
      <Column field="name" header="Name" sortable />
      <Column field="categoryPath" header="Category" sortable />
      <Column field="baseTypeId" header="Data format" sortable>
        <template #body="{ data }">
          <code v-if="data.baseTypeId">{{ data.baseTypeId }}</code>
          <ProgressSpinner v-else style="width: 1rem; height: 1rem" />
        </template>
      </Column>
      <Column field="aliasExport" header="Export alias" sortable />
      <Column field="constraints" header="Constraints" sortable />
      <Column field="usedByCount" header="Used by" sortable />
      <template #empty>
        <span data-test="data-model-no-results">No data points match your search.</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import PrimeButton from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import type { DataModelTableRow } from '@/utils/DataModelUtils.ts';

const props = defineProps<{
  rows: DataModelTableRow[];
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [dataPointTypeId: string];
  downloadCsv: [];
}>();

const selectedRow = computed(() => props.rows.find((row) => row.dataPointTypeId === props.selectedId));
</script>

<style scoped>
.data-model-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
</style>
