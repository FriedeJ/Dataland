<template>
  <div class="data-model-details" data-test="data-model-field-details">
    <Message v-if="typeQuery.isError.value" severity="error" data-test="data-model-field-error">
      The definition of this data point could not be loaded.
    </Message>
    <ProgressSpinner v-else-if="typeQuery.isPending.value" style="width: 2rem; height: 2rem" />
    <template v-else-if="typeSpec">
      <div>
        <h2 data-test="data-model-field-name">{{ typeSpec.name }}</h2>
      </div>

      <section>
        <h4>Business definition</h4>
        <p data-test="data-model-field-definition">{{ typeSpec.businessDefinition }}</p>
      </section>

      <section data-test="data-model-field-value-type">
        <h4>Value</h4>
        <p v-if="baseTypeSpec">
          {{ friendlyValueType(baseTypeSpec.dataPointBaseType.id) }}
          <template v-if="allowedValues"
            >, allowed values: <strong data-test="data-model-field-constraints">{{ allowedValues }}</strong></template
          >
        </p>
        <ProgressSpinner v-else style="width: 1.5rem; height: 1.5rem" />
      </section>

      <section v-if="typeSpec.calculationRules.length" data-test="data-model-field-calculation-rules">
        <h4>Calculation</h4>
        <ul>
          <li v-for="(rule, index) in typeSpec.calculationRules" :key="index">
            {{ friendlyCalculationMethod(rule.calculationMethod) }}
            <template v-for="(input, inputIndex) in rule.inputs" :key="input">
              <template v-if="inputIndex > 0">, </template>
              <PrimeButton
                :label="inputNames[input] ?? input"
                variant="link"
                size="small"
                class="data-model-inline-button"
                :data-test="`data-model-calculation-input-${input}`"
                @click="emit('selectField', input)"
              />
            </template>
          </li>
        </ul>
      </section>

      <section data-test="data-model-field-used-by">
        <h4>Used in {{ typeSpec.usedBy.length }} {{ typeSpec.usedBy.length === 1 ? 'framework' : 'frameworks' }}</h4>
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

      <section>
        <PrimeButton
          :label="showTechnical ? 'HIDE TECHNICAL DETAILS' : 'SHOW TECHNICAL DETAILS'"
          variant="link"
          size="small"
          :icon="showTechnical ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          data-test="data-model-toggle-technical"
          @click="showTechnical = !showTechnical"
        />
        <div v-if="showTechnical" class="data-model-technical" data-test="data-model-technical-details">
          <p>
            Data point type: <code data-test="data-model-field-id">{{ typeSpec.dataPointType.id }}</code>
          </p>
          <p v-if="aliasExport">
            Export alias: <code data-test="data-model-field-alias">{{ aliasExport }}</code>
          </p>
          <template v-if="baseTypeSpec">
            <p data-test="data-model-field-base-type">
              Base type: <code>{{ baseTypeSpec.dataPointBaseType.id }}</code> – {{ baseTypeSpec.businessDefinition }}
            </p>
            <p>
              Validated by: <code>{{ baseTypeSpec.validatedBy }}</code>
            </p>
            <DataTable :value="exampleRows" size="small" data-test="data-model-example">
              <Column field="field" header="Field">
                <template #body="{ data }">
                  <code>{{ data.field }}</code>
                </template>
              </Column>
              <Column field="type" header="Type" />
              <Column field="value" header="Example value" body-class="data-model-example-value" />
            </DataTable>
          </template>
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
import {
  useDataPointBaseTypeQuery,
  useDataPointTypeQuery,
  useDataPointTypesQuery,
} from '@/api-queries/specification-service/useSpecificationQueries.ts';
import {
  flattenExample,
  friendlyCalculationMethod,
  friendlyConstraints,
  friendlyValueType,
} from '@/utils/DataModelUtils.ts';

const props = defineProps<{
  dataPointTypeId: string;
  aliasExport?: string;
  currentFrameworkId?: string;
  frameworkNames: Record<string, string>;
}>();

const emit = defineEmits<{
  selectFramework: [frameworkId: string];
  selectField: [dataPointTypeId: string];
}>();

const showTechnical = ref(false);

const typeQuery = useDataPointTypeQuery(() => props.dataPointTypeId);
const typeSpec = computed(() => typeQuery.data.value);
const baseTypeQuery = useDataPointBaseTypeQuery(() => typeSpec.value?.dataPointBaseType.id);
const baseTypeSpec = computed(() => baseTypeQuery.data.value);
const exampleRows = computed(() => flattenExample(baseTypeSpec.value?.example, baseTypeSpec.value?.schema));
const allowedValues = computed(() => friendlyConstraints(typeSpec.value?.constraints));

const calculationInputIds = computed(() => typeSpec.value?.calculationRules.flatMap((rule) => rule.inputs) ?? []);
const inputTypes = useDataPointTypesQuery(calculationInputIds);
const inputNames = computed(() =>
  Object.fromEntries(Object.entries(inputTypes.value).map(([id, spec]) => [id, spec.name]))
);
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
.data-model-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.data-model-technical {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.data-model-inline-button {
  padding: 0;
}
.data-model-details :deep(.data-model-example-value) {
  overflow-wrap: anywhere;
}
</style>
