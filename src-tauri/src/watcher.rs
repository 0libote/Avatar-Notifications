//! Background watcher: polls the OS for toast notifications and merges
//! matching ones into the store.
//!
//! - On Windows this uses the WinRT `UserNotificationListener` API, which
//!   surfaces toasts posted by other apps (Outlook, Teams, Slack, …).
//!   The user must allow notification access in
//!   Settings → Privacy & security → Notifications.
//! - On other platforms there is no OS listener; the app still works via
//!   manual / demo notifications (used for development on Linux).

use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::models::AppSettings;
use crate::persistence;
use crate::store::NotificationStore;

/// A toast as read from the OS, before watchlist filtering.
#[derive(Debug, Clone)]
pub struct RawToast {
    pub app: String,
    pub title: String,
    pub body: String,
}

/// Shared state managed by Tauri (`app.manage(...)`).
pub struct AppState {
    pub store: Mutex<NotificationStore>,
    pub settings: Mutex<AppSettings>,
    pub app_data: std::path::PathBuf,
    /// Last known listener access: granted | denied | not-requested | not-supported | unknown
    pub listener_access: Mutex<String>,
}

impl AppState {
    pub fn persist_store(&self) {
        let items = self.store.lock().map(|s| s.all()).unwrap_or_default();
        let _ = persistence::save_notifications(&self.app_data, &items);
    }

    pub fn persist_settings(&self) {
        let settings = self
            .settings
            .lock()
            .map(|s| s.clone())
            .unwrap_or_default();
        let _ = persistence::save_settings(&self.app_data, &settings);
    }
}

pub type SharedState = Arc<AppState>;

/// Merge raw toasts into the store, keeping only watched apps.
/// Returns true when the store changed.
pub fn merge_toasts(
    state: &SharedState,
    toasts: Vec<RawToast>,
    source: &str,
) -> bool {
    let watched: Vec<String> = state
        .settings
        .lock()
        .map(|s| {
            s.watched_apps
                .iter()
                .filter(|w| w.enabled)
                .map(|w| w.name.to_lowercase())
                .collect()
        })
        .unwrap_or_default();

    if watched.is_empty() {
        return false;
    }

    let mut changed = false;
    if let Ok(mut store) = state.store.lock() {
        for t in toasts {
            let app_lc = t.app.to_lowercase();
            let watched_hit = watched
                .iter()
                .any(|w| !w.is_empty() && (app_lc.contains(w.as_str()) || w.contains(app_lc.as_str())));
            if !watched_hit {
                continue;
            }
            if store.insert_unique(&t.app, &t.title, &t.body, source, 600) {
                changed = true;
            }
        }
    }
    if changed {
        state.persist_store();
    }
    changed
}

fn emit_update(app: &AppHandle, state: &SharedState) {
    let items = state.store.lock().map(|s| s.all()).unwrap_or_default();
    let _ = app.emit("notifications-updated", items);
}

/// Spawn the background polling loop. Runs for the lifetime of the app.
pub fn spawn_poller(app: AppHandle, state: SharedState) {
    tauri::async_runtime::spawn(async move {
        loop {
            let interval_secs = state
                .settings
                .lock()
                .map(|s| s.poll_interval_secs.clamp(3, 120))
                .unwrap_or(5);
            tokio::time::sleep(Duration::from_secs(interval_secs)).await;

            let toasts = fetch_os_toasts(&state).await;
            if !toasts.is_empty() && merge_toasts(&state, toasts, "windows-toast") {
                emit_update(&app, &state);
            }
        }
    });
}

/// Read current toasts from the OS. Empty on unsupported platforms
/// or when access has not been granted — never errors the poll loop.
async fn fetch_os_toasts(state: &SharedState) -> Vec<RawToast> {
    #[cfg(windows)]
    {
        match fetch_windows_toasts().await {
            Ok(t) => {
                if let Ok(mut access) = state.listener_access.lock() {
                    *access = "granted".to_string();
                }
                t
            }
            Err(e) => {
                // Access denied is the common case before the user approves.
                if e.contains("denied") {
                    if let Ok(mut access) = state.listener_access.lock() {
                        *access = "denied".to_string();
                    }
                }
                Vec::new()
            }
        }
    }
    #[cfg(not(windows))]
    {
        let _ = state;
        Vec::new()
    }
}

// ---------------------------------------------------------------------------
// Windows WinRT listener
// ---------------------------------------------------------------------------

/// Ask Windows for notification-listener access.
/// Returns "granted" / "denied" / "unspecified".
#[cfg(windows)]
pub async fn request_windows_access() -> String {
    use windows::UI::Notifications::Management::{
        UserNotificationListener, UserNotificationListenerAccessStatus,
    };
    let status = (|| -> windows::core::Result<UserNotificationListenerAccessStatus> {
        let listener = UserNotificationListener::Current()?;
        let op = listener.RequestAccessAsync()?;
        op.get()
    })();
    match status {
        Ok(s) if s == UserNotificationListenerAccessStatus::Allowed => "granted".to_string(),
        Ok(_) => "denied".to_string(),
        Err(_) => "denied".to_string(),
    }
}

#[cfg(not(windows))]
pub async fn request_windows_access() -> String {
    "not-supported".to_string()
}

/// Pull the current toast history from WinRT (best-effort per toast).
#[cfg(windows)]
async fn fetch_windows_toasts() -> Result<Vec<RawToast>, String> {
    use windows::UI::Notifications::Management::UserNotificationListener;
    use windows::UI::Notifications::NotificationKinds;

    // WinRT async ops are blocking-waited on a background thread so we
    // never stall the Tauri async runtime.
    tokio::task::spawn_blocking(|| -> Result<Vec<RawToast>, String> {
        let listener =
            UserNotificationListener::Current().map_err(|e| format!("listener: {e}"))?;
        let notifications = listener
            .GetNotificationsAsync(NotificationKinds::Toast)
            .map_err(|e| format!("request: {e}"))?
            .get()
            .map_err(|e| format!("denied: {e}"))?;

        let mut out = Vec::new();
        for user_notif in notifications.into_iter() {
            if let Some(toast) = read_one_toast(&user_notif) {
                out.push(toast);
            }
        }
        Ok(out)
    })
    .await
    .map_err(|e| format!("join: {e}"))?
}

/// Best-effort read of a single `UserNotification`. Returns None when the
/// toast can't be understood (we skip it rather than fail the whole poll).
#[cfg(windows)]
fn read_one_toast(user_notif: &windows::UI::Notifications::UserNotification) -> Option<RawToast> {
    let app = user_notif
        .AppInfo()
        .and_then(|info| info.DisplayInfo())
        .and_then(|display| display.DisplayName())
        .map(|h| h.to_string())
        .unwrap_or_else(|_| "Unknown app".to_string());

    let (title, body) = user_notif
        .Notification()
        .and_then(|n| n.Visual())
        .and_then(|visual| visual.Bindings())
        .and_then(|bindings| bindings.GetAt(0))
        .and_then(|binding| binding.GetTextElements())
        .map(|texts| {
            let mut parts: Vec<String> = Vec::new();
            // IVectorView iterates as plain items (not Results).
            for text in texts {
                if let Ok(t) = text.Text() {
                    let s = t.to_string();
                    if !s.trim().is_empty() {
                        parts.push(s);
                    }
                }
            }
            let title = parts.first().cloned().unwrap_or_default();
            let body = parts.into_iter().skip(1).collect::<Vec<_>>().join("\n");
            (title, body)
        })
        .unwrap_or_default();

    if title.is_empty() && body.is_empty() {
        return Some(RawToast {
            app,
            title: "New notification".to_string(),
            body: String::new(),
        });
    }
    Some(RawToast { app, title, body })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::WatchedApp;

    fn test_state() -> SharedState {
        Arc::new(AppState {
            store: Mutex::new(NotificationStore::new()),
            settings: Mutex::new(AppSettings {
                watched_apps: vec![
                    WatchedApp { name: "Outlook".to_string(), enabled: true },
                    WatchedApp { name: "Teams".to_string(), enabled: false },
                ],
                ..Default::default()
            }),
            app_data: std::env::temp_dir(),
            listener_access: Mutex::new("unknown".to_string()),
        })
    }

    #[test]
    fn only_watched_apps_are_merged() {
        let state = test_state();
        let changed = merge_toasts(
            &state,
            vec![
                RawToast { app: "Microsoft Outlook".to_string(), title: "Hi".to_string(), body: "b".to_string() },
                RawToast { app: "Microsoft Teams".to_string(), title: "Yo".to_string(), body: "b".to_string() },
            ],
            "windows-toast",
        );
        assert!(changed);
        let items = state.store.lock().unwrap().all();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].app, "Microsoft Outlook");
    }

    #[test]
    fn repolls_do_not_duplicate() {
        let state = test_state();
        let toast = RawToast { app: "Outlook".to_string(), title: "Hi".to_string(), body: "b".to_string() };
        assert!(merge_toasts(&state, vec![toast.clone()], "windows-toast"));
        assert!(!merge_toasts(&state, vec![toast], "windows-toast"));
    }
}
