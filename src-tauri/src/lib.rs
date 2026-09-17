//! NotifBuddy backend entry point.
//!
//! Module layout:
//! - `models`      — serde types shared with the frontend
//! - `store`       — in-memory notification list + dedupe logic
//! - `persistence` — JSON load/save in the app-data dir
//! - `watcher`     — background OS-toast poller (WinRT on Windows)
//! - `commands`    — Tauri commands called from TypeScript

mod commands;
mod models;
mod persistence;
mod store;
mod watcher;

use std::sync::{Arc, Mutex};

use tauri::Manager;

use crate::store::NotificationStore;
use crate::watcher::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("notifbuddy"));

            let settings = persistence::load_settings(&app_data);
            let saved_position = (settings.avatar_x, settings.avatar_y);
            let notifications = persistence::load_notifications(&app_data);

            let state: watcher::SharedState = Arc::new(AppState {
                store: Mutex::new(NotificationStore::from_vec(notifications)),
                settings: Mutex::new(settings),
                app_data,
                listener_access: Mutex::new("not-requested".to_string()),
            });
            app.manage(state.clone());

            // Restore the avatar's last position (or bottom-right on Windows).
            if let Some(avatar) = app.get_webview_window("avatar") {
                if let (Some(x), Some(y)) = saved_position {
                    let _ = avatar.set_position(tauri::Position::Physical(
                        tauri::PhysicalPosition { x, y },
                    ));
                } else {
                    #[cfg(windows)]
                    {
                        // Default: bottom-right of the primary monitor.
                        if let Ok(Some(monitor)) = avatar.primary_monitor() {
                            let size = monitor.size();
                            if let Ok(outer) = avatar.outer_size() {
                                let x = size.width.saturating_sub(outer.width + 24) as i32;
                                let y = size.height.saturating_sub(outer.height + 80) as i32;
                                let _ = avatar.set_position(tauri::Position::Physical(
                                    tauri::PhysicalPosition { x, y },
                                ));
                            }
                        }
                    }
                }
            }

            watcher::spawn_poller(app.handle().clone(), state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_notifications,
            commands::get_unread_by_app,
            commands::mark_read,
            commands::mark_all_read,
            commands::dismiss_notification,
            commands::clear_read,
            commands::simulate_notification,
            commands::get_settings,
            commands::save_settings,
            commands::set_avatar_position,
            commands::request_notification_access,
            commands::get_listener_status,
            commands::show_dashboard,
            commands::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NotifBuddy");
}
