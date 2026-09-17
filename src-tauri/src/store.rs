//! In-memory notification store with JSON persistence.
//!
//! Newest notifications are kept at the front. The store is capped
//! (`MAX_ITEMS`) so the JSON file and the avatar payload stay small.

use std::collections::{HashMap, VecDeque};

use chrono::{Duration, Utc};
use uuid::Uuid;

use crate::models::TrackedNotification;

pub const MAX_ITEMS: usize = 200;

#[derive(Debug, Default)]
pub struct NotificationStore {
    items: VecDeque<TrackedNotification>,
}

impl NotificationStore {
    pub fn new() -> Self {
        Self { items: VecDeque::new() }
    }

    pub fn from_vec(items: Vec<TrackedNotification>) -> Self {
        let mut store = Self::new();
        // Persisted file is newest-first; preserve that order.
        for n in items.into_iter().rev() {
            store.items.push_front(n);
        }
        store.prune();
        store
    }

    pub fn all(&self) -> Vec<TrackedNotification> {
        self.items.iter().cloned().collect()
    }

    /// Unread items, newest first. (Public API for future commands.)
    #[allow(dead_code)]
    pub fn unread(&self) -> Vec<TrackedNotification> {
        self.items.iter().filter(|n| !n.read).cloned().collect()
    }

    pub fn unread_by_app(&self) -> HashMap<String, u32> {
        let mut map = HashMap::new();
        for n in self.items.iter().filter(|n| !n.read) {
            *map.entry(n.app.clone()).or_insert(0) += 1;
        }
        map
    }

    /// Insert a notification, skipping near-duplicates.
    ///
    /// Windows re-reports the same toast on every poll, so we ignore an
    /// incoming item when the same app+title+body was seen in the last
    /// `dedupe_window_secs` seconds. Returns true when inserted.
    pub fn insert_unique(
        &mut self,
        app: &str,
        title: &str,
        body: &str,
        source: &str,
        dedupe_window_secs: i64,
    ) -> bool {
        let now = Utc::now();
        let cutoff = now - Duration::seconds(dedupe_window_secs);
        let dup = self.items.iter().any(|n| {
            n.app == app && n.title == title && n.body == body && n.received_at > cutoff
        });
        if dup {
            return false;
        }
        self.items.push_front(TrackedNotification {
            id: Uuid::new_v4().to_string(),
            app: app.to_string(),
            title: title.to_string(),
            body: body.to_string(),
            received_at: now,
            read: false,
            source: source.to_string(),
        });
        self.prune();
        true
    }

    pub fn mark_read(&mut self, id: &str) -> bool {
        if let Some(n) = self.items.iter_mut().find(|n| n.id == id) {
            n.read = true;
            return true;
        }
        false
    }

    pub fn mark_all_read(&mut self) {
        for n in self.items.iter_mut() {
            n.read = true;
        }
    }

    /// Remove a single notification. Returns true when something was removed.
    pub fn dismiss(&mut self, id: &str) -> bool {
        let before = self.items.len();
        self.items.retain(|n| n.id != id);
        self.items.len() != before
    }

    /// Drop all read notifications, keeping unread ones.
    pub fn clear_read(&mut self) {
        self.items.retain(|n| !n.read);
    }

    fn prune(&mut self) {
        while self.items.len() > MAX_ITEMS {
            self.items.pop_back();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn insert_and_unread_counts() {
        let mut s = NotificationStore::new();
        assert!(s.insert_unique("Outlook", "Hi", "body", "manual", 600));
        assert!(s.insert_unique("Teams", "Yo", "body", "manual", 600));
        assert_eq!(s.unread().len(), 2);
        let by_app = s.unread_by_app();
        assert_eq!(by_app.get("Outlook"), Some(&1));
    }

    #[test]
    fn duplicates_are_ignored_inside_window() {
        let mut s = NotificationStore::new();
        assert!(s.insert_unique("Outlook", "Hi", "body", "windows-toast", 600));
        assert!(!s.insert_unique("Outlook", "Hi", "body", "windows-toast", 600));
        assert_eq!(s.all().len(), 1);
    }

    #[test]
    fn mark_read_and_clear_read() {
        let mut s = NotificationStore::new();
        s.insert_unique("Outlook", "A", "b", "manual", 600);
        s.insert_unique("Teams", "C", "d", "manual", 600);
        let id = s.all()[0].id.clone();
        assert!(s.mark_read(&id));
        assert_eq!(s.unread().len(), 1);
        s.clear_read();
        assert_eq!(s.all().len(), 1);
        assert!(!s.all()[0].read);
    }

    #[test]
    fn dismiss_removes_item() {
        let mut s = NotificationStore::new();
        s.insert_unique("Outlook", "A", "b", "manual", 600);
        let id = s.all()[0].id.clone();
        assert!(s.dismiss(&id));
        assert!(s.all().is_empty());
        assert!(!s.dismiss("nope"));
    }

    #[test]
    fn store_is_capped() {
        let mut s = NotificationStore::new();
        for i in 0..(MAX_ITEMS + 50) {
            s.insert_unique("App", &format!("t{i}"), "b", "demo", 0);
        }
        assert_eq!(s.all().len(), MAX_ITEMS);
    }
}
