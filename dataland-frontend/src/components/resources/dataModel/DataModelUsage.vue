<template>
  <section class="usage" data-test="data-model-usage">
    <PrimeButton
      :label="expanded ? 'HIDE EXAMPLES AND API CODE' : 'SHOW EXAMPLE DATASETS AND API CODE'"
      variant="text"
      size="small"
      :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
      data-test="data-model-usage-toggle"
      @click="expanded = !expanded"
    />
    <div v-if="expanded" class="usage-content">
      <div data-test="data-model-example-datasets">
        <h4>Example datasets</h4>
        <ProgressSpinner
          v-if="examplesQuery.isPending.value && examplesQuery.fetchStatus.value !== 'idle'"
          style="width: 1.5rem; height: 1.5rem"
        />
        <ul v-else-if="examples.length">
          <li v-for="example in examples" :key="`${example.companyId}-${example.reportingPeriod}`">
            <RouterLink
              :to="`/companies/${example.companyId}/frameworks/${frameworkId}`"
              :data-test="`data-model-example-dataset-${example.companyId}`"
            >
              {{ example.companyName }} ({{ example.reportingPeriod }})
            </RouterLink>
          </li>
        </ul>
        <p v-else data-test="data-model-no-example-datasets">No datasets of this framework are available yet.</p>
      </div>

      <div data-test="data-model-api-code">
        <h4>Download the datasets of a company via the API</h4>
        <p>
          Authenticate with an API key (
          <RouterLink to="/api-key">create one here</RouterLink>
          ) sent as <code>Authorization: Bearer &lt;API Key&gt;</code>.
        </p>
        <SelectButton
          v-model="language"
          :options="languages"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          data-test="data-model-code-language"
        />
        <div class="usage-code">
          <PrimeButton
            icon="pi pi-copy"
            variant="text"
            size="small"
            aria-label="Copy code"
            data-test="data-model-copy-code"
            @click="copyCode"
          />
          <pre data-test="data-model-code-snippet">{{ snippet }}</pre>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PrimeButton from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import SelectButton from 'primevue/selectbutton';
import { useExampleDatasetsQuery } from '@/api-queries/data-model/useExampleDatasetsQuery.ts';
import { buildDownloadSnippet, type SnippetLanguage } from '@/utils/DataModelUtils.ts';

const props = defineProps<{
  frameworkId: string;
}>();

const expanded = ref(false);
const language = ref<SnippetLanguage>('python');
const languages: { label: string; value: SnippetLanguage }[] = [
  { label: 'Python', value: 'python' },
  { label: 'curl', value: 'curl' },
];

const examplesQuery = useExampleDatasetsQuery(() => (expanded.value ? props.frameworkId : undefined));
const examples = computed(() => examplesQuery.data.value ?? []);
const snippet = computed(() =>
  buildDownloadSnippet(
    language.value,
    window.location.origin,
    props.frameworkId,
    examples.value[0]?.companyId ?? '<companyId>'
  )
);

/**
 * Copies the displayed code to the clipboard.
 */
async function copyCode(): Promise<void> {
  await navigator.clipboard.writeText(snippet.value);
}
</script>

<style scoped>
.usage-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}
.usage-content h4,
.usage-content p,
.usage-content ul {
  margin: 0 0 0.25rem;
}
.usage-content ul {
  padding-left: 1.25rem;
}
.usage-code {
  position: relative;
  margin-top: 0.5rem;
}
.usage-code pre {
  margin: 0;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  background: var(--p-surface-100, #f4f4f4);
  overflow-x: auto;
  font-size: 0.85rem;
}
.usage-code button {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
}
</style>
