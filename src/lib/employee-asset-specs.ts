/** Only descriptive product specifications belong in employee-facing payloads.
 * Arbitrary administrator-defined fields may contain credentials, network
 * configuration, prices or internal notes, so unknown fields are excluded.
 */
const PUBLIC_FIELDS = new Set([
  'brand',
  'manufacturer',
  'model',
  'modelname',
  'productline',
  'version',
  'processor',
  'processormodel',
  'cpu',
  'cpumodel',
  'cpucores',
  'cores',
  'ram',
  'ramgb',
  'ramsize',
  'memory',
  'memorygb',
  'memorysize',
  'memorytype',
  'storage',
  'storagegb',
  'storagecapacity',
  'storagesize',
  'storagetype',
  'ssd',
  'hdd',
  'os',
  'operatingsystem',
  'display',
  'displaysize',
  'screensize',
  'resolution',
  'refreshrate',
  'touchscreen',
  'gpu',
  'graphics',
  'graphicscard',
  'ports',
  'usb',
  'hdmi',
  'bluetooth',
  'wifi',
  'color',
  'colour',
  'material',
  'dimensions',
  'width',
  'height',
  'depth',
  'weight',
  'size',
  'capacity',
  'unit',
  'units',
  'accessories',
  'standincluded',
  'adjustable',
  'warrantyperiod',
]);
const fieldKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

export function employeeAssetSpecs(
  record: unknown,
  depth = 0
): Record<string, unknown> | null {
  if (
    !record ||
    typeof record !== 'object' ||
    Array.isArray(record) ||
    depth > 4
  )
    return null;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!PUBLIC_FIELDS.has(fieldKey(key))) continue;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    )
      result[key] = value;
    else if (Array.isArray(value))
      result[key] = value.flatMap<unknown>((item) => {
        if (
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean'
        )
          return [item];
        const nested = employeeAssetSpecs(item, depth + 1);
        return nested ? [nested] : [];
      });
    else {
      const nested = employeeAssetSpecs(value, depth + 1);
      if (nested) result[key] = nested;
    }
  }
  return Object.keys(result).length ? result : null;
}
