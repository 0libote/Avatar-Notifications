/** Tauri invoke wrappers + event subscription, shared by both windows. */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  AppSettings,
  ListenerStatus,
  TrackedNotification,
} from "./types";

export async function getNotifications(): Promise<TrackedNotification[]> {
  return invoke<TrackedNotification[]>("get_notifications");
}

export async function getUnreadByApp(): Promise<Record<string, number>> {
  return invoke<Record<string, number>>("get_unread_by_app");
}

export async function markRead(id: string): Promise<boolean> {
  return invoke<boolean>("mark_read", { id });
}

export async function markAllRead(): Promise<boolean> {
  return invoke<boolean>("mark_all_read");
}

export async function dismissNotification(id: string): Promise<boolean> {
  return invoke<boolean>("dismiss_notification", { id });
}

export async function clearRead(): Promise<boolean> {
  return invoke<boolean>("clear_read");
}

export async function simulateNotification(
  appName: string,
  title: string,
  body: string,
): Promise<TrackedNotification[]> {
  return invoke<TrackedNotification[]>("simulate_notification", {
    appName,
    title,
    body,
  });
}

export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export async function saveSettings(settings: AppSettings): Promise<boolean> {
  return invoke<boolean>("save_settings", { settings });
}

export async function setAvatarPosition(x: number, y: number): Promise<boolean> {
  return invoke<boolean>("set_avatar_position", { x, y });
}

export async function requestNotificationAccess(): Promise<string> {
  return invoke<string>("request_notification_access");
}

export async function getListenerStatus(): Promise<ListenerStatus> {
  return invoke<ListenerStatus>("get_listener_status");
}

export async function showDashboard(): Promise<boolean> {
  return invoke<boolean>("show_dashboard");
}

export async function quitApp(): Promise<void> {
  return invoke<void>("quit_app");
}

export function onNotificationsUpdated(
  cb: (items: TrackedNotification[]) => void,
): Promise<UnlistenFn> {
  return listen<TrackedNotification[]>("notifications-updated", (e) =>
    cb(e.payload),
  );
}
