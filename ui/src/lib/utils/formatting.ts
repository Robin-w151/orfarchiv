const prefixMappings = [
  { base: 1024 ** 4, prefix: 'Ti' },
  { base: 1024 ** 3, prefix: 'Gi' },
  { base: 1024 ** 2, prefix: 'Mi' },
  { base: 1024 ** 1, prefix: 'Ki' },
];

export function humanReadableMemorySize(memory: number): string {
  let prefix = '';
  let roundedMemory = memory.toString();
  for (const mapping of prefixMappings) {
    if (memory > mapping.base) {
      roundedMemory = (memory / mapping.base).toFixed(2);
      prefix = mapping.prefix;
      break;
    }
  }

  return `${roundedMemory} ${prefix}B`;
}
