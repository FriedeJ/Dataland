<template>
  <div data-test="data-model-table-view">
    <div class="data-model-table-toolbar">
      <small>{{ rows.length }} data points</small>
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
          :disabled="rows.length === 0"
          data-test="data-model-download-csv"
          @click="emit('downloadCsv')"
        />
      </div>
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
      <Column field="valueType" header="Value type" sortable>
        <template #body="{ data }">
          <span v-if="data.valueType">{{ data.valueType }}</span>
          <ProgressSpinner v-else style="width: 1rem; height: 1rem" />
        </template>
      </Column>
      <Column field="allowedValues" header="Allowed values" sortable>
        <template #body="{ data }">{{ data.allowedValues || '–' }}</template>
      </Column>
      <Column field="usedByCount" header="Used in" sortable>
        <template #body="{ data }">
          <template v-if="data.usedByCount !== undefined">
            {{ data.usedByCount }} {{ data.usedByCount === 1 ? 'framework' : 'frameworks' }}
          </template>
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
import { computed, ref } from 'vue';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import PrimeButton from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import ToggleSwitch from 'primevue/toggleswitch';
import type { DataModelTableRow } from '@/utils/DataModelUtils.ts';

const props = defineProps<{
  rows: DataModelTableRow[];
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [dataPointTypeId: string];
  downloadCsv: [];
}>();

const showTechnical = ref(false);
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
</style>
