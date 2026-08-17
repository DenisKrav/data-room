export function formatBytes(bytes: string | number): string {
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const value = n / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

export function formatItemCount(fileCount: number, folderCount: number): string {
  const parts: string[] = [];
  if (folderCount > 0) parts.push(`${folderCount} folder${folderCount === 1 ? '' : 's'}`);
  if (fileCount > 0 || parts.length === 0) {
    parts.push(`${fileCount} file${fileCount === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}
