//! JSON persistence for settings + notifications.
//!
//! Files live in the Tauri app-data dir:
//!   <app_data>/settings.json
//!   <app_data>/notifications.json
//! Loading is always best-effort: corrupt or missing files fall back
//! to defaults instead of breaking startup.

use std::path::PathBuf;

use crate::models::{AppSettings, TrackedNotification};

fn settings_path(app_data: &std::path::Path) -> PathBuf {
    app_data.join("settings.json")
}

fn notifications_path(app_data: &std::path::Path) -> PathBuf {
    app_data.join("notifications.json")
}

pub fn load_settings(app_data: &std::path::Path) -> AppSettings {
    let path = settings_path(app_data);
    if let Ok(bytes) = std::fs::read(&path) {
        if let Ok(parsed) = serde_json::from_slice::<AppSettings>(&bytes) {
            return parsed;
        }
    }
    AppSettings::default()
}

pub fn save_settings(app_data: &std::path::Path, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app_data);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

pub fn load_notifications(app_data: &std::path::Path) -> Vec<TrackedNotification> {
    let path = notifications_path(app_data);
    if let Ok(bytes) = std::fs::read(&path) {
        if let Ok(parsed) = serde_json::from_slice::<Vec<TrackedNotification>>(&bytes) {
            return parsed;
        }
    }
    Vec::new()
}

pub fn save_notifications(
    app_data: &std::path::Path,
    items: &[TrackedNotification],
) -> Result<(), String> {
    let path = notifications_path(app_data);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(items).map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn settings_roundtrip() {
        let dir = std::env::temp_dir().join(format!("notifbuddy-test-{}", uuid::Uuid::new_v4()));
        let settings = AppSettings::default();
        save_settings(&dir, &settings).unwrap();
        assert_eq!(load_settings(&dir), settings);
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn corrupt_files_fall_back_to_defaults() {
        let dir = std::env::temp_dir().join(format!("notifbuddy-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("settings.json"), b"{nope").unwrap();
        std::fs::write(dir.join("notifications.json"), b"[nope").unwrap();
        assert_eq!(load_settings(&dir), AppSettings::default());
        assert!(load_notifications(&dir).is_empty());
        std::fs::remove_dir_all(&dir).ok();
    }
}
