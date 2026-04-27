/**
 * Utility for merging tailwind classes
 */
export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  if (!dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  // Handle cases where it might already be DD/MM/YYYY or something else
  if (parts[0].length === 2) return dateStr; 
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
