export function formatDeadline(isoString?: string | null): string {
  if (!isoString) return 'No deadline';
  const time = Date.parse(isoString);
  if (isNaN(time)) return 'No deadline';
  const diff = time - Date.now();
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);
  if (diff > 0) {
    if (minutes < 60) return 'under 1h left';
    return Math.ceil(absDiff / 3600000) + 'h left';
  } else {
    if (minutes < 60) return 'under 1h ago';
    return Math.floor(absDiff / 3600000) + 'h ago';
  }
}

export function formatFreshness(fetchedAt?: string | null, stale?: boolean): string {
  if (!fetchedAt) return 'Unknown';
  const time = Date.parse(fetchedAt);
  if (isNaN(time)) return 'Unknown';
  const formatted = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }).format(new Date(time));
  return stale ? 'Stale (last updated ' + formatted + ')' : 'Updated ' + formatted;
}