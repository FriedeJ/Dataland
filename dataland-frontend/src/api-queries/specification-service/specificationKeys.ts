export const specificationKeys = {
  frameworks: ['specification', 'frameworks'] as const,
  framework: (frameworkId: string) => ['specification', 'framework', frameworkId] as const,
  dataPointType: (dataPointTypeId: string) => ['specification', 'dataPointType', dataPointTypeId] as const,
  dataPointBaseType: (baseTypeId: string) => ['specification', 'dataPointBaseType', baseTypeId] as const,
};
