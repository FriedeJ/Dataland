<template>
  <div class="erd" data-test="data-model-erd-view">
    <div class="erd-picker">
      <label for="erd-data-point">Data point</label>
      <PrimeSelect
        input-id="erd-data-point"
        :model-value="selectedId"
        :options="rows"
        option-label="name"
        option-value="dataPointTypeId"
        filter
        placeholder="Choose a data point to fill the diagram"
        class="erd-select"
        data-test="data-model-erd-select"
        @update:model-value="emit('select', $event)"
      />
    </div>
    <p v-if="!selectedId" class="erd-hint" data-test="data-model-erd-hint">
      The diagram shows how the data model is built. Choose a data point to see it with real values.
    </p>

    <div class="erd-grid">
      <section class="erd-entity erd-framework" data-test="erd-entity-framework">
        <header>Framework</header>
        <p class="erd-attributes">name, business definition</p>
        <ul v-if="typeSpec" class="erd-instances">
          <li v-for="placement in placements" :key="placement.id">
            <PrimeButton
              :label="placement.name"
              variant="link"
              size="small"
              class="erd-inline-button"
              :data-test="`erd-framework-${placement.id}`"
              @click="emit('selectFramework', placement.id)"
            />
            <span v-if="placement.placement" class="erd-placement">
              {{ placement.placement.categoryPath }}
              <code v-if="placement.placement.aliasExport">{{ placement.placement.aliasExport }}</code>
            </span>
            <ProgressSpinner v-else style="width: 1rem; height: 1rem" />
          </li>
        </ul>
      </section>

      <div class="erd-link erd-link-first">
        <span class="erd-link-label">contains</span>
        <div class="erd-link-line"><span>n</span><span>m</span></div>
        <span class="erd-link-note">placed in a category, with an export alias</span>
      </div>

      <section class="erd-entity erd-data-point" data-test="erd-entity-data-point">
        <header>Data point</header>
        <p class="erd-attributes">name, business definition, allowed values</p>
        <div v-if="typeSpec" class="erd-instance">
          <strong data-test="erd-data-point-name">{{ typeSpec.name }}</strong>
          <p>{{ typeSpec.businessDefinition }}</p>
          <p v-if="allowedValues">Allowed values: {{ allowedValues }}</p>
          <p class="erd-shared">
            Used in {{ typeSpec.usedBy.length }} {{ typeSpec.usedBy.length === 1 ? 'framework' : 'frameworks' }}
          </p>
        </div>
      </section>

      <div class="erd-link erd-link-second">
        <span class="erd-link-label">has</span>
        <div class="erd-link-line"><span>n</span><span>1</span></div>
        <span class="erd-link-note">format of the value</span>
      </div>

      <section class="erd-entity erd-value-type" data-test="erd-entity-value-type">
        <header>Value type</header>
        <p class="erd-attributes">name, description, example</p>
        <div v-if="typeSpec" class="erd-instance">
          <template v-if="baseTypeSpec">
            <strong data-test="erd-value-type-name">{{ friendlyValueType(baseTypeSpec.dataPointBaseType.id) }}</strong>
            <p>{{ baseTypeSpec.businessDefinition }}</p>
            <p>Stored with: {{ Object.keys(baseTypeSpec.example).join(', ') }}</p>
          </template>
          <ProgressSpinner v-else style="width: 1.5rem; height: 1.5rem" />
        </div>
      </section>

      <div class="erd-link erd-link-vertical">
        <span class="erd-link-label">calculated from</span>
        <div class="erd-link-line erd-link-line-dashed"><span>n</span><span>m</span></div>
      </div>

      <section class="erd-entity erd-calculation" data-test="erd-entity-calculation">
        <header>Data point <small>(calculation input)</small></header>
        <p class="erd-attributes">optional: a value can be derived from other data points</p>
        <div v-if="typeSpec" class="erd-instance">
          <ul v-if="typeSpec.calculationRules.length">
            <li v-for="(rule, index) in typeSpec.calculationRules" :key="index">
              {{ friendlyCalculationMethod(rule.calculationMethod) }}
              <template v-for="(input, inputIndex) in rule.inputs" :key="input">
                <template v-if="inputIndex > 0">, </template>
                <PrimeButton
                  :label="inputNames[input] ?? input"
                  variant="link"
                  size="small"
                  class="erd-inline-button"
                  :data-test="`erd-calculation-input-${input}`"
                  @click="emit('select', input)"
                />
              </template>
            </li>
          </ul>
          <p v-else data-test="erd-no-calculation">Not calculated, the value is reported directly.</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PrimeButton from 'primevue/button';
import PrimeSelect from 'primevue/select';
import ProgressSpinner from 'primevue/progressspinner';
import {
  useDataPointBaseTypeQuery,
  useDataPointTypeQuery,
  useDataPointTypesQuery,
  useFrameworkSpecificationsQuery,
} from '@/api-queries/specification-service/useSpecificationQueries.ts';
import {
  findPlacement,
  friendlyCalculationMethod,
  friendlyConstraints,
  friendlyValueType,
  parseFrameworkSchema,
  type DataModelTableRow,
} from '@/utils/DataModelUtils.ts';

const props = defineProps<{
  /** All data points of the current framework, used for the picker. */
  rows: DataModelTableRow[];
  frameworkNames: Record<string, string>;
  selectedId?: string;
}>();

const emit = defineEmits<{
  select: [dataPointTypeId: string];
  selectFramework: [frameworkId: string];
}>();

const typeQuery = useDataPointTypeQuery(() => props.selectedId);
const typeSpec = computed(() => typeQuery.data.value);
const baseTypeQuery = useDataPointBaseTypeQuery(() => typeSpec.value?.dataPointBaseType.id);
const baseTypeSpec = computed(() => baseTypeQuery.data.value);
const allowedValues = computed(() => friendlyConstraints(typeSpec.value?.constraints));

const frameworkIds = computed(() => typeSpec.value?.usedBy.map((framework) => framework.id) ?? []);
const frameworkSpecs = useFrameworkSpecificationsQuery(frameworkIds);
const placements = computed(() =>
  frameworkIds.value.map((id) => {
    const spec = frameworkSpecs.value[id];
    return {
      id,
      name: props.frameworkNames[id] ?? id,
      placement:
        spec && props.selectedId ? findPlacement(parseFrameworkSchema(spec.schema), props.selectedId) : undefined,
    };
  })
);

const calculationInputIds = computed(() => typeSpec.value?.calculationRules.flatMap((rule) => rule.inputs) ?? []);
const inputTypes = useDataPointTypesQuery(calculationInputIds);
const inputNames = computed(() =>
  Object.fromEntries(Object.entries(inputTypes.value).map(([id, spec]) => [id, spec.name]))
);
</script>

<style scoped>
.erd-picker {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}
.erd-select {
  width: 24rem;
  max-width: 100%;
}
.erd-hint {
  color: var(--p-text-muted-color);
  margin-bottom: 1rem;
}
.erd-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8rem minmax(0, 1fr) 8rem minmax(0, 1fr);
  grid-template-areas:
    'framework link1 datapoint link2 valuetype'
    '. . vlink . .'
    '. . calculation . .';
  align-items: center;
  row-gap: 0.5rem;
}
.erd-framework {
  grid-area: framework;
}
.erd-link-first {
  grid-area: link1;
}
.erd-data-point {
  grid-area: datapoint;
}
.erd-link-second {
  grid-area: link2;
}
.erd-value-type {
  grid-area: valuetype;
}
.erd-link-vertical {
  grid-area: vlink;
}
.erd-calculation {
  grid-area: calculation;
}
.erd-entity {
  align-self: stretch;
  border: 2px solid var(--p-surface-400, #aaa);
  border-radius: 6px;
  background: var(--p-surface-0, #fff);
  overflow: hidden;
}
.erd-entity header {
  background: var(--p-surface-100, #f0f0f0);
  padding: 0.5rem 0.75rem;
  font-weight: 700;
  border-bottom: 2px solid var(--p-surface-400, #aaa);
}
.erd-entity header small {
  font-weight: 400;
}
.erd-entity p,
.erd-entity ul {
  margin: 0;
}
.erd-attributes {
  padding: 0.5rem 0.75rem;
  color: var(--p-text-muted-color);
  font-size: 0.8rem;
}
.erd-instance,
.erd-instances {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  list-style: none;
  padding: 0.5rem 0.75rem 0.75rem;
  border-top: 1px dashed var(--p-surface-300, #ccc);
  background: var(--p-surface-50, #fafafa);
}
.erd-placement {
  display: block;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}
.erd-shared {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}
.erd-inline-button {
  padding: 0;
}
.erd-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  text-align: center;
  font-size: 0.8rem;
}
.erd-link-line {
  display: flex;
  justify-content: space-between;
  width: 100%;
  border-top: 2px solid var(--p-surface-500, #888);
  font-weight: 700;
}
.erd-link-line-dashed {
  border-top-style: dashed;
}
.erd-link-note {
  color: var(--p-text-muted-color);
}
@media (max-width: 900px) {
  .erd-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'framework' 'link1' 'datapoint' 'link2' 'valuetype' 'vlink' 'calculation';
    row-gap: 0.75rem;
  }
  .erd-link-line {
    border-top: none;
    border-left: 2px solid var(--p-surface-500, #888);
    flex-direction: column;
    align-items: flex-start;
    width: auto;
    height: 2rem;
    padding-left: 0.4rem;
  }
}
</style>
