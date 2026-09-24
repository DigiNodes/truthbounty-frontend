export function formatDeadline(isoString: string): { absolute: string; relative: string } {
  if (!isoString) return { absolute: "—", relative: "—" };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { absolute: "—", relative: "—" };
    const absolute = d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const diff = d.getTime() - Date.now();
    const hours = Math.round(diff / 3600000);
    const relative = hours > 0 ? `in ${hours}h` : `${Math.abs(hours)}h ago`;
    return { absolute, relative };
  } catch {
    return { absolute: "—", relative: "—" };
  }
}

export function formatFreshness(fetchedAt: string, stale: boolean): string {
  if (!fetchedAt) return "Unknown";
  try {
    const d = new Date(fetchedAt);
    const timeStr = isNaN(d.getTime()) ? "" : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (stale) return `Stale (last updated ${timeStr})`;
    return `Updated ${timeStr}`;
  } catch {
    return "Unknown";
  }
}