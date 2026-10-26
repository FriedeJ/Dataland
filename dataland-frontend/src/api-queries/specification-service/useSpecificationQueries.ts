import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query';
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
