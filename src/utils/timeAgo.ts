// Relative timestamp helper for queue screens ("2h ago", "3d ago").
// Older than 7 days falls back to a compact absolute date so nothing
// becomes ambiguous on long-lived tickets.

export function timeAgoShort(iso: string | undefined | null, now: number = Date.now()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diffMs = now - t;
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
