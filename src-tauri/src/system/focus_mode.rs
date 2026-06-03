use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use sysinfo::{Pid, System, Signal};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusModeSettings {
    pub whitelist: Vec<String>,
    pub blacklist: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusModeStatus {
    pub is_enabled: bool,
    pub paused_processes_count: usize,
}

pub struct FocusModeManager {
    is_enabled: bool,
    paused_pids: HashSet<Pid>,
    settings: FocusModeSettings,
}

impl FocusModeManager {
    pub fn new() -> Self {
        // Default blacklist
        let default_blacklist = vec![
            "mdworker".to_string(),
            "backupd".to_string(),
            "SearchIndexer.exe".to_string(),
            "SysMain".to_string(),
            "msmpeng.exe".to_string(),
            "OneDrive.exe".to_string(),
            "Dropbox.exe".to_string(),
            "GoogleDriveFS.exe".to_string(),
        ];

        Self {
            is_enabled: false,
            paused_pids: HashSet::new(),
            settings: FocusModeSettings {
                whitelist: vec![],
                blacklist: default_blacklist,
            },
        }
    }

    pub fn get_status(&self) -> FocusModeStatus {
        FocusModeStatus {
            is_enabled: self.is_enabled,
            paused_processes_count: self.paused_pids.len(),
        }
    }

    pub fn get_settings(&self) -> FocusModeSettings {
        self.settings.clone()
    }

    pub fn update_settings(&mut self, new_settings: FocusModeSettings) {
        self.settings = new_settings;
    }

    pub fn toggle(&mut self, enable: bool) -> Result<String, String> {
        if self.is_enabled == enable {
            return Ok(format!("Focus mode is already {}", if enable { "enabled" } else { "disabled" }));
        }

        let mut sys = System::new_all();
        sys.refresh_processes();

        if enable {
            // Enable Focus Mode: Suspend blacklisted processes
            let mut paused_count = 0;

            for (pid, process) in sys.processes() {
                let name = process.name().to_string().to_lowercase();
                
                // Check if process matches any blacklist entry
                let is_blacklisted = self.settings.blacklist.iter().any(|b| name.eq_ignore_ascii_case(b));
                let is_whitelisted = self.settings.whitelist.iter().any(|w| name.eq_ignore_ascii_case(w));

                if is_blacklisted && !is_whitelisted {
                    // Try to send stop signal
                    if process.kill_with(Signal::Stop).unwrap_or(false) {
                        self.paused_pids.insert(*pid);
                        paused_count += 1;
                    }
                }
            }

            self.is_enabled = true;
            Ok(format!("Focus mode enabled. Paused {} background processes.", paused_count))
        } else {
            // Disable Focus Mode: Resume all paused processes
            let mut resumed_count = 0;
            
            for pid in &self.paused_pids {
                if let Some(process) = sys.process(*pid) {
                    if process.kill_with(Signal::Continue).unwrap_or(false) {
                        resumed_count += 1;
                    }
                }
            }
            
            self.paused_pids.clear();
            self.is_enabled = false;
            Ok(format!("Focus mode disabled. Resumed {} background processes.", resumed_count))
        }
    }
}
