import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query';
import { DataTypeEnum } from '@clients/backend';
import { useApiClient } from '@/utils/useApiClient.ts';

export interface ExampleDataset {
  companyId: string;
  companyName: string;
  reportingPeriod: string;
}

const MAX_EXAMPLES = 3;

/**
 * Loads a few datasets of a framework that the current user is allowed to view to link to as examples.
 * @param frameworkId the (possibly reactive) framework id; must be a data type known to the backend
 * @returns the query result with up to three example datasets including company names
 */
export function useExampleDatasetsQuery(
  frameworkId: MaybeRefOrGetter<string | undefined>
): UseQueryReturnType<ExampleDataset[], Error> {
  const apiClientProvider = useApiClient();
  return useQuery<ExampleDataset[]>({
    queryKey: computed(() => ['data-model', 'example-datasets', toValue(frameworkId) ?? '']),
    queryFn: async () => {
      const dataType = toValue(frameworkId) as DataTypeEnum;
      const dimensions = (
        await apiClientProvider.backendClients.dataAvailabilityController.searchViewableDimensions({
          companyIds: [],
          dataTypes: [dataType],
          reportingPeriods: [],
        })
      ).data.slice(0, MAX_EXAMPLES);
      return Promise.all(
        dimensions.map(async (dimension) => ({
          companyId: dimension.companyId,
          reportingPeriod: dimension.reportingPeriod,
          companyName: (
            await apiClientProvider.backendClients.companyDataController.getCompanyInfo(dimension.companyId)
          ).data.companyName,
        }))
      );
    },
    enabled: computed(() => Object.values(DataTypeEnum).includes(toValue(frameworkId) as DataTypeEnum)),
    staleTime: 5 * 60 * 1000,
  });
}
