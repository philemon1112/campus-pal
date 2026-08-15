// First + last name initials only (e.g. "RxJS Updated User" -> "RU") —
// middle names are ignored. Falls back to a single initial for a one-word
// name, and "?" if there's nothing to work with.
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(minorUnits / 100);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
}
