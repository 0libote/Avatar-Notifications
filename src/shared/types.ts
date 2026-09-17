/** Shared types mirroring the Rust backend (serde camelCase). */

export interface TrackedNotification {
  id: string;
  app: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
  source: string;
}

export interface WatchedApp {
  name: string;
  enabled: boolean;
}

export interface AppSettings {
  watchedApps: WatchedApp[];
  characterId: string;
  avatarSize: number;
  opacity: number;
  pollIntervalSecs: number;
  avatarX: number | null;
  avatarY: number | null;
}

export interface ListenerStatus {
  platform: string;
  supported: boolean;
  access: string;
  detail: string;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function summarizeUnread(items: TrackedNotification[]): string {
  const unread = items.filter((n) => !n.read);
  if (unread.length === 0) return "All caught up! ✨";
  const byApp = new Map<string, number>();
  for (const n of unread) byApp.set(n.app, (byApp.get(n.app) ?? 0) + 1);
  const parts = [...byApp.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([app, c]) => `${app} (${c})`);
  const extra = byApp.size > 3 ? ` +${byApp.size - 3} more` : "";
  const latest = unread[0];
  return `${unread.length} new — ${parts.join(" • ")}${extra} · “${latest.title}”`;
}
