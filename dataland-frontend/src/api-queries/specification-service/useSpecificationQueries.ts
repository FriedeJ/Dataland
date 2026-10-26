import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useQueries, useQuery, type UseQueryReturnType } from '@tanstack/vue-query';
import type {
  DataPointBaseTypeSpecification,
  DataPointTypeSpecification,
  FrameworkSpecification,
  SimpleFrameworkSpecification,
} from '@clients/specificationservice';
import { useApiClient } from '@/utils/useApiClient.ts';
import { specificationKeys } from '@/api-queries/specification-service/specificationKeys.ts';

const STATIC_STALE_TIME_MS = 10 * 60 * 1000;

/**
 * Query for the list of all frameworks known to the specification service.
 * @returns the query result
 */
export function useFrameworkListQuery(): UseQueryReturnType<SimpleFrameworkSpecification[], Error> {
  const apiClientProvider = useApiClient();
  return useQuery<SimpleFrameworkSpecification[]>({
    queryKey: specificationKeys.frameworks,
    queryFn: async () =>
      (await apiClientProvider.apiClients.specificationController.listFrameworkSpecifications()).data,
    staleTime: STATIC_STALE_TIME_MS,
  });
}

/**
 * Query for a single framework specification. Disabled while no framework id is given.
 * @param frameworkId the (possibly reactive) framework id
 * @returns the query result
 */
export function useFrameworkSpecificationQuery(
  frameworkId: MaybeRefOrGetter<string | undefined>
): UseQueryReturnType<FrameworkSpecification, Error> {
  const apiClientProvider = useApiClient();
  return useQuery<FrameworkSpecification>({
    queryKey: computed(() => specificationKeys.framework(toValue(frameworkId) ?? '')),
    queryFn: async () =>
      (
        await apiClientProvider.apiClients.specificationController.getFrameworkSpecification(
          toValue(frameworkId) as string
        )
      ).data,
    enabled: computed(() => !!toValue(frameworkId)),
    staleTime: STATIC_STALE_TIME_MS,
  });
}

/**
 * Query for a single data point type specification. Disabled while no id is given.
 * @param dataPointTypeId the (possibly reactive) data point type id
 * @returns the query result
 */
export function useDataPointTypeQuery(
  dataPointTypeId: MaybeRefOrGetter<string | undefined>
): UseQueryReturnType<DataPointTypeSpecification, Error> {
  const apiClientProvider = useApiClient();
  return useQuery<DataPointTypeSpecification>({
    queryKey: computed(() => specificationKeys.dataPointType(toValue(dataPointTypeId) ?? '')),
    queryFn: async () =>
      (
        await apiClientProvider.apiClients.specificationController.getDataPointTypeSpecification(
          toValue(dataPointTypeId) as string
        )
      ).data,
    enabled: computed(() => !!toValue(dataPointTypeId)),
    staleTime: STATIC_STALE_TIME_MS,
  });
}

/**
 * Query for a single data point base type specification. Disabled while no id is given.
 * @param baseTypeId the (possibly reactive) base type id
 * @returns the query result
 */
export function useDataPointBaseTypeQuery(
  baseTypeId: MaybeRefOrGetter<string | undefined>
): UseQueryReturnType<DataPointBaseTypeSpecification, Error> {
  const apiClientProvider = useApiClient();
  return useQuery<DataPointBaseTypeSpecification>({
    queryKey: computed(() => specificationKeys.dataPointBaseType(toValue(baseTypeId) ?? '')),
    queryFn: async () =>
      (await apiClientProvider.apiClients.specificationController.getDataPointBaseType(toValue(baseTypeId) as string))
        .data,
    enabled: computed(() => !!toValue(baseTypeId)),
    staleTime: STATIC_STALE_TIME_MS,
  });
}

/**
 * Loads many data point types in parallel, sharing the cache with {@link useDataPointTypeQuery}.
 * Types that are not loaded yet (or failed to load) are simply missing from the result.
 * @param dataPointTypeIds the (possibly reactive) ids of the data point types to load
 * @returns a computed map from data point type id to its specification
 */
export function useDataPointTypesQuery(
  dataPointTypeIds: MaybeRefOrGetter<string[]>
): ComputedRef<Record<string, DataPointTypeSpecification>> {
  const apiClientProvider = useApiClient();
  const results = useQueries({
    queries: computed(() =>
      toValue(dataPointTypeIds).map((id) => ({
        queryKey: specificationKeys.dataPointType(id),
        queryFn: async (): Promise<DataPointTypeSpecification> =>
          (await apiClientProvider.apiClients.specificationController.getDataPointTypeSpecification(id)).data,
        staleTime: STATIC_STALE_TIME_MS,
      }))
    ),
  });
  return computed(() => {
    const map: Record<string, DataPointTypeSpecification> = {};
    results.value.forEach((result) => {
      if (result.data) map[result.data.dataPointType.id] = result.data;
    });
    return map;
  });
}
