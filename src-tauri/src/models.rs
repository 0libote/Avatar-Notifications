//! Shared data models for NotifBuddy.
//!
//! These types are serialized to JSON both for on-disk persistence
//! (Rust side) and for the TypeScript frontend via Tauri commands,
//! so field names use camelCase to match JS conventions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single notification tracked by the app.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TrackedNotification {
    pub id: String,
    pub app: String,
    pub title: String,
    pub body: String,
    /// RFC3339 timestamp of when we first saw it.
    pub received_at: DateTime<Utc>,
    pub read: bool,
    /// Where it came from: "windows-toast" | "manual" | "demo".
    pub source: String,
}

/// An app the user wants to watch, e.g. "Outlook".
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WatchedApp {
    pub name: String,
    pub enabled: bool,
}

/// Persisted user settings.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub watched_apps: Vec<WatchedApp>,
    pub character_id: String,
    pub avatar_size: u32,
    pub opacity: f32,
    pub poll_interval_secs: u64,
    pub avatar_x: Option<i32>,
    pub avatar_y: Option<i32>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            watched_apps: vec![
                WatchedApp { name: "Outlook".to_string(), enabled: true },
                WatchedApp { name: "Teams".to_string(), enabled: true },
                WatchedApp { name: "Slack".to_string(), enabled: true },
                WatchedApp { name: "Gmail".to_string(), enabled: false },
                WatchedApp { name: "Discord".to_string(), enabled: false },
            ],
            character_id: "blob".to_string(),
            avatar_size: 96,
            opacity: 1.0,
            poll_interval_secs: 5,
            avatar_x: None,
            avatar_y: None,
        }
    }
}

/// Status of the OS notification listener, shown in the dashboard.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListenerStatus {
    pub platform: String,
    pub supported: bool,
    /// "granted" | "denied" | "not-requested" | "not-supported" | "unknown"
    pub access: String,
    pub detail: String,
}
