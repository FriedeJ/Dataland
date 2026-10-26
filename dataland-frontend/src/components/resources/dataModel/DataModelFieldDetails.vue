<template>
  <div class="data-model-details" data-test="data-model-field-details">
    <Message v-if="typeQuery.isError.value" severity="error" data-test="data-model-field-error">
      The definition of this data point could not be loaded.
    </Message>
    <ProgressSpinner v-else-if="typeQuery.isPending.value" style="width: 2rem; height: 2rem" />
    <template v-else-if="typeSpec">
      <div>
        <h2 data-test="data-model-field-name">{{ typeSpec.name }}</h2>
        <code data-test="data-model-field-id">{{ typeSpec.dataPointType.id }}</code>
        <span v-if="aliasExport" class="data-model-alias" data-test="data-model-field-alias">
          (export alias: <code>{{ aliasExport }}</code
          >)
        </span>
      </div>

      <section>
        <h4>Business definition</h4>
        <p data-test="data-model-field-definition">{{ typeSpec.businessDefinition }}</p>
      </section>

      <section v-if="typeSpec.constraints?.length" data-test="data-model-field-constraints">
        <h4>Constraints</h4>
        <div class="data-model-chips">
          <Tag v-for="constraint in typeSpec.constraints" :key="constraint" :value="constraint" severity="secondary" />
        </div>
      </section>

      <section v-if="typeSpec.calculationRules.length" data-test="data-model-field-calculation-rules">
        <h4>Calculation rules</h4>
        <ul>
          <li v-for="(rule, index) in typeSpec.calculationRules" :key="index">
            <code>{{ rule.calculationMethod }}</code> from
            <code>{{ rule.inputs.join(', ') }}</code>
          </li>
        </ul>
      </section>

      <section data-test="data-model-field-base-type">
        <h4>Data format</h4>
        <ProgressSpinner v-if="baseTypeQuery.isPending.value" style="width: 1.5rem; height: 1.5rem" />
        <template v-else-if="baseTypeSpec">
          <p>
            <strong>{{ baseTypeSpec.name }}</strong> (<code>{{ baseTypeSpec.dataPointBaseType.id }}</code
            >)
          </p>
          <p>{{ baseTypeSpec.businessDefinition }}</p>
          <PrimeButton
            :label="showExample ? 'HIDE EXAMPLE' : 'SHOW EXAMPLE'"
            variant="link"
            size="small"
            data-test="data-model-toggle-example"
            @click="showExample = !showExample"
          />
          <DataTable v-if="showExample" :value="exampleRows" size="small" data-test="data-model-example">
            <Column field="field" header="Field">
              <template #body="{ data }">
                <code>{{ data.field }}</code>
              </template>
            </Column>
            <Column field="value" header="Example value" body-class="data-model-example-value" />
          </DataTable>
        </template>
      </section>

      <section data-test="data-model-field-used-by">
        <h4>Used by {{ typeSpec.usedBy.length }} framework(s)</h4>
        <div class="data-model-chips">
          <PrimeButton
            v-for="framework in typeSpec.usedBy"
            :key="framework.id"
            :label="frameworkNames[framework.id] ?? framework.id"
            :severity="framework.id === currentFrameworkId ? 'primary' : 'secondary'"
            size="small"
            :data-test="`data-model-used-by-${framework.id}`"
            @click="emit('selectFramework', framework.id)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import PrimeButton from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import {
  useDataPointBaseTypeQuery,
  useDataPointTypeQuery,
} from '@/api-queries/specification-service/useSpecificationQueries.ts';
import { flattenExample } from '@/utils/DataModelUtils.ts';

const props = defineProps<{
  dataPointTypeId: string;
  aliasExport?: string;
  currentFrameworkId?: string;
  frameworkNames: Record<string, string>;
}>();

const emit = defineEmits<{
  selectFramework: [frameworkId: string];
}>();

const showExample = ref(false);

const typeQuery = useDataPointTypeQuery(() => props.dataPointTypeId);
const typeSpec = computed(() => typeQuery.data.value);
const baseTypeQuery = useDataPointBaseTypeQuery(() => typeSpec.value?.dataPointBaseType.id);
const baseTypeSpec = computed(() => baseTypeQuery.data.value);
const exampleRows = computed(() => flattenExample(baseTypeSpec.value?.example));
</script>

<style scoped>
.data-model-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.data-model-details h2,
.data-model-details h4,
.data-model-details p,
.data-model-details ul {
  margin: 0;
}
.data-model-details h4 {
  margin-bottom: 0.25rem;
}
.data-model-details ul {
  padding-left: 1.25rem;
}
.data-model-alias {
  margin-left: 0.5rem;
  font-size: 0.875rem;
}
.data-model-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.data-model-details :deep(.data-model-example-value) {
  overflow-wrap: anywhere;
}
</style>
