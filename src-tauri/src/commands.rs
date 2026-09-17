//! Tauri commands — the API surface the TypeScript frontend calls.
//!
//! Mutating commands persist to disk and emit `notifications-updated`
//! so the avatar + dashboard refresh instantly (the background poller
//! is only a fallback for toasts arriving from the OS).

use std::collections::HashMap;

use tauri::{AppHandle, Emitter, Manager, State};

use crate::models::{AppSettings, ListenerStatus, TrackedNotification};
use crate::watcher::{self, SharedState};

fn emit(app: &AppHandle, state: &SharedState) {
    let items = state.store.lock().map(|s| s.all()).unwrap_or_default();
    let _ = app.emit("notifications-updated", items);
}

#[tauri::command]
pub fn get_notifications(state: State<SharedState>) -> Vec<TrackedNotification> {
    state.store.lock().map(|s| s.all()).unwrap_or_default()
}

#[tauri::command]
pub fn get_unread_by_app(state: State<SharedState>) -> HashMap<String, u32> {
    state
        .store
        .lock()
        .map(|s| s.unread_by_app())
        .unwrap_or_default()
}

#[tauri::command]
pub fn mark_read(id: String, app: AppHandle, state: State<SharedState>) -> bool {
    let changed = state.store.lock().map(|mut s| s.mark_read(&id)).unwrap_or(false);
    if changed {
        state.persist_store();
        emit(&app, state.inner());
    }
    changed
}

#[tauri::command]
pub fn mark_all_read(app: AppHandle, state: State<SharedState>) -> bool {
    if let Ok(mut s) = state.store.lock() {
        s.mark_all_read();
    }
    state.persist_store();
    emit(&app, state.inner());
    true
}

#[tauri::command]
pub fn dismiss_notification(id: String, app: AppHandle, state: State<SharedState>) -> bool {
    let removed = state.store.lock().map(|mut s| s.dismiss(&id)).unwrap_or(false);
    if removed {
        state.persist_store();
        emit(&app, state.inner());
    }
    removed
}

#[tauri::command]
pub fn clear_read(app: AppHandle, state: State<SharedState>) -> bool {
    if let Ok(mut s) = state.store.lock() {
        s.clear_read();
    }
    state.persist_store();
    emit(&app, state.inner());
    true
}

/// Manually add a notification (dashboard "test" buttons, and the Linux dev
/// stand-in for real toasts). Bypasses the watchlist filter on purpose:
/// the user explicitly asked for this exact notification.
#[tauri::command]
pub fn simulate_notification(
    app: AppHandle,
    app_name: String,
    title: String,
    body: String,
    state: State<SharedState>,
) -> Vec<TrackedNotification> {
    if let Ok(mut store) = state.store.lock() {
        store.insert_unique(&app_name, &title, &body, "manual", 5);
    }
    state.persist_store();
    let items = state.store.lock().map(|s| s.all()).unwrap_or_default();
    let _ = app.emit("notifications-updated", items.clone());
    items
}

#[tauri::command]
pub fn get_settings(state: State<SharedState>) -> AppSettings {
    state.settings.lock().map(|s| s.clone()).unwrap_or_default()
}

#[tauri::command]
pub fn save_settings(settings: AppSettings, state: State<SharedState>) -> bool {
    if let Ok(mut s) = state.settings.lock() {
        *s = settings;
    }
    state.persist_settings();
    true
}

#[tauri::command]
pub fn set_avatar_position(x: i32, y: i32, state: State<SharedState>) -> bool {
    if let Ok(mut s) = state.settings.lock() {
        s.avatar_x = Some(x);
        s.avatar_y = Some(y);
    }
    state.persist_settings();
    true
}

#[tauri::command]
pub async fn request_notification_access(state: State<'_, SharedState>) -> Result<String, String> {
    let access = watcher::request_windows_access().await;
    if let Ok(mut a) = state.listener_access.lock() {
        *a = access.clone();
    }
    Ok(access)
}

#[tauri::command]
pub fn get_listener_status(state: State<SharedState>) -> ListenerStatus {
    #[cfg(windows)]
    {
        let access = state
            .listener_access
            .lock()
            .map(|a| a.clone())
            .unwrap_or_else(|_| "not-requested".to_string());
        ListenerStatus {
            platform: "windows".to_string(),
            supported: true,
            detail: "Uses the Windows notification listener. Allow access in Settings → Privacy & security → Notifications, then press Request access.".to_string(),
            access,
        }
    }
    #[cfg(not(windows))]
    {
        let _ = state;
        ListenerStatus {
            platform: std::env::consts::OS.to_string(),
            supported: false,
            access: "not-supported".to_string(),
            detail: "OS toast listening is Windows-only. On this machine use Simulate / Demo buttons — your data model and UI work the same.".to_string(),
        }
    }
}

/// Bring the dashboard window to the front (called when the avatar is clicked).
#[tauri::command]
pub fn show_dashboard(app: AppHandle) -> bool {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
        return true;
    }
    false
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
