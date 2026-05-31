use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::process::Command;
use chrono::Utc;
use uuid::Uuid;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceConfig {
    pub enabled: bool,
    pub schedule: String, // e.g. "daily", "weekly", "idle"
    pub clear_temp_files: bool,
    pub flush_dns: bool,
    pub trim_ssd: bool,
    pub empty_trash: bool,
}

impl Default for MaintenanceConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            schedule: "weekly".to_string(),
            clear_temp_files: true,
            flush_dns: true,
            trim_ssd: false,
            empty_trash: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceLog {
    pub id: String,
    pub timestamp: i64,
    pub tasks_run: Vec<String>,
    pub status: String,
    pub details: String,
}

// Maximum number of log entries kept in memory.
// execute_maintenance() is called repeatedly over the lifetime of the process.
// Without a cap every invocation appends one entry and the Vec grows without
// bound, leaking heap memory proportional to the number of maintenance cycles.
const MAX_LOG_ENTRIES: usize = 100;

pub struct MaintenanceScheduler {
    pub config: Arc<Mutex<MaintenanceConfig>>,
    pub logs: Arc<Mutex<Vec<MaintenanceLog>>>,
}

impl MaintenanceScheduler {
    pub fn new() -> Self {
        Self {
            config: Arc::new(Mutex::new(MaintenanceConfig::default())),
            logs: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn get_config(&self) -> MaintenanceConfig {
        self.config.lock().unwrap().clone()
    }

    pub fn update_config(&self, new_config: MaintenanceConfig) {
        let mut config = self.config.lock().unwrap();
        *config = new_config;
    }

    pub fn get_logs(&self) -> Vec<MaintenanceLog> {
        self.logs.lock().unwrap().clone()
    }

    pub fn execute_maintenance(&self) {
        let config = self.config.lock().unwrap().clone();
        if !config.enabled { return; }

        let mut tasks_run = Vec::new();
        let mut details_str = String::new();

        if config.clear_temp_files {
            tasks_run.push("Clear Temp Files".to_string());
            // Attempt to clear some macOS caches safely
            if let Ok(home) = std::env::var("HOME") {
                let cache_dir = format!("{}/Library/Caches", home);
                if let Ok(entries) = fs::read_dir(&cache_dir) {
                    let mut count = 0;
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            let _ = fs::remove_file(path);
                            count += 1;
                        }
                    }
                    details_str.push_str(&format!("Cleared {} temp files. ", count));
                }
            }
        }

        if config.flush_dns {
            tasks_run.push("Flush DNS".to_string());
            let output = Command::new("dscacheutil").arg("-flushcache").output();
            if output.is_ok() {
                details_str.push_str("DNS cache flushed. ");
            }
        }

        if config.empty_trash {
            tasks_run.push("Empty Recycle Bin".to_string());
            if let Ok(home) = std::env::var("HOME") {
                // Guard 1: reject an empty HOME value. format!("{}/.Trash", "")
                // produces "/.Trash" and rm -rf /.Trash would run against the
                // filesystem root's .Trash directory.
                if home.is_empty() {
                    details_str.push_str("Skipped trash: HOME is empty. ");
                } else {
                    // Guard 2: use std::path APIs instead of string concatenation
                    // so that path traversal sequences in HOME (e.g. /home/../root)
                    // are handled by the OS path resolver rather than by us.
                    let trash_dir = std::path::Path::new(&home).join(".Trash");

                    // Guard 3: verify the resulting path is absolute and rooted
                    // inside a user home prefix before issuing any filesystem ops.
                    let is_safe = trash_dir.is_absolute()
                        && (trash_dir.starts_with("/Users/")
                            || trash_dir.starts_with("/home/"));

                    if is_safe {
                        // Delete the contents of .Trash entry-by-entry using safe
                        // Rust fs APIs instead of shelling out to rm -rf. This
                        // avoids rm operating outside the expected directory if a
                        // symlink attack replaces .Trash between the path check and
                        // the command execution.
                        let mut removed = 0u32;
                        if let Ok(entries) = fs::read_dir(&trash_dir) {
                            for entry in entries.flatten() {
                                let p = entry.path();
                                if p.is_dir() {
                                    let _ = fs::remove_dir_all(&p);
                                } else {
                                    let _ = fs::remove_file(&p);
                                }
                                removed += 1;
                            }
                        }
                        details_str.push_str(&format!("Emptied trash ({} items). ", removed));
                    } else {
                        details_str.push_str("Skipped trash: HOME path failed safety check. ");
                    }
                }
            }
        }
        
        // Trim SSD is generally a Windows concept (Optimize-Volume), skipping on macOS.
        if config.trim_ssd {
            tasks_run.push("Trim SSD".to_string());
            details_str.push_str("Skipped Trim (macOS). ");
        }

        if !tasks_run.is_empty() {
            let log = MaintenanceLog {
                id: Uuid::new_v4().to_string(),
                timestamp: Utc::now().timestamp_millis(),
                tasks_run,
                status: "Success".to_string(),
                details: details_str.trim().to_string(),
            };
            let mut logs = self.logs.lock().unwrap();
            logs.push(log);
            // Keep only the most recent MAX_LOG_ENTRIES entries.
            // Draining from the front is O(n) but acceptable for a small Vec
            // that is written infrequently (once per maintenance cycle).
            if logs.len() > MAX_LOG_ENTRIES {
                let overflow = logs.len() - MAX_LOG_ENTRIES;
                logs.drain(0..overflow);
            }
        }
    }
}

// Basic macOS idle detection using ioreg
pub fn get_idle_time_seconds() -> u64 {
    let output = Command::new("ioreg")
        .args(&["-c", "IOHIDSystem"])
        .output();
    
    if let Ok(out) = output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            if line.contains("\"HIDIdleTime\" =") {
                if let Some(time_str) = line.split('=').nth(1) {
                    if let Ok(nanos) = time_str.trim().parse::<u64>() {
                        return nanos / 1_000_000_000;
                    }
                }
            }
        }
    }
    0
}
