// src-tauri/src/system/deep_sleep.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{Pid, System};

// ─── Manual Win32 FFI for Process Suspend / Resume ────────────────────────────
#[cfg(target_os = "windows")]
mod windows_suspend {
    use std::ffi::c_void;

    extern "system" {
        fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> *mut c_void;
        fn CloseHandle(hObject: *mut c_void) -> i32;
        fn GetModuleHandleA(lpModuleName: *const u8) -> *mut c_void;
        fn GetProcAddress(hModule: *mut c_void, lpProcName: *const u8) -> *mut c_void;
        fn GetForegroundWindow() -> *mut c_void;
        fn GetWindowThreadProcessId(hWnd: *mut c_void, lpdwProcessId: *mut u32) -> u32;
    }

    const PROCESS_SUSPEND_RESUME: u32 = 0x0800;

    type NtSuspendProcessFn = unsafe extern "system" fn(*mut c_void) -> i32;
    type NtResumeProcessFn = unsafe extern "system" fn(*mut c_void) -> i32;

    pub fn suspend_process(pid: u32) -> Result<(), String> {
        unsafe {
            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
            if handle.is_null() {
                return Err(format!("Failed to open process with PID {}", pid));
            }

            let ntdll = GetModuleHandleA(b"ntdll.dll\0".as_ptr());
            if ntdll.is_null() {
                CloseHandle(handle);
                return Err("Failed to get module handle for ntdll.dll".to_string());
            }

            let nt_suspend_ptr = GetProcAddress(ntdll, b"NtSuspendProcess\0".as_ptr());
            if nt_suspend_ptr.is_null() {
                CloseHandle(handle);
                return Err("Failed to resolve NtSuspendProcess".to_string());
            }

            let nt_suspend: NtSuspendProcessFn = std::mem::transmute(nt_suspend_ptr);
            let status = nt_suspend(handle);
            CloseHandle(handle);

            if status >= 0 {
                Ok(())
            } else {
                Err(format!("NtSuspendProcess returned error status: {}", status))
            }
        }
    }

    pub fn resume_process(pid: u32) -> Result<(), String> {
        unsafe {
            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
            if handle.is_null() {
                return Err(format!("Failed to open process with PID {}", pid));
            }

            let ntdll = GetModuleHandleA(b"ntdll.dll\0".as_ptr());
            if ntdll.is_null() {
                CloseHandle(handle);
                return Err("Failed to get module handle for ntdll.dll".to_string());
            }

            let nt_resume_ptr = GetProcAddress(ntdll, b"NtResumeProcess\0".as_ptr());
            if nt_resume_ptr.is_null() {
                CloseHandle(handle);
                return Err("Failed to resolve NtResumeProcess".to_string());
            }

            let nt_resume: NtResumeProcessFn = std::mem::transmute(nt_resume_ptr);
            let status = nt_resume(handle);
            CloseHandle(handle);

            if status >= 0 {
                Ok(())
            } else {
                Err(format!("NtResumeProcess returned error status: {}", status))
            }
        }
    }

    pub fn get_foreground_process_id() -> Option<u32> {
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid > 0 {
                Some(pid)
            } else {
                None
            }
        }
    }
}

// ─── Data Types ────────────────────────────────────────────────────────────────
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSleepConfig {
    pub enabled: bool,
    pub inactivity_timeout_secs: u64,
    pub whitelist: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuspendedProcess {
    pub pid: u32,
    pub name: String,
    pub memory_bytes: u64,
    pub suspended_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSleepStatus {
    pub enabled: bool,
    pub inactivity_timeout_secs: u64,
    pub whitelist: Vec<String>,
    pub suspended_processes: Vec<SuspendedProcess>,
}

// ─── Deep Sleep Manager ────────────────────────────────────────────────────────
pub struct DeepSleepManager {
    config: DeepSleepConfig,
    suspended_processes: HashMap<u32, SuspendedProcess>,
    last_active_timestamps: HashMap<u32, u64>,
    last_foreground_pid: Option<u32>,
    sys: System,
    config_path: Option<std::path::PathBuf>,
}

impl DeepSleepManager {
    pub fn new(app_config_dir: Option<std::path::PathBuf>) -> Self {
        let default_whitelist = vec![
            "system-optimizer".to_string(),
            "system_optimizer".to_string(),
            "spotify".to_string(),
            "music".to_string(),
            "finder".to_string(),
            "explorer.exe".to_string(),
            "taskhostw.exe".to_string(),
            "dwm.exe".to_string(),
            "windowserver".to_string(),
            "loginwindow".to_string(),
            "launchd".to_string(),
            "tauri".to_string(),
        ];

        let config_path = app_config_dir.map(|d| d.join("deep_sleep_config.json"));
        
        let mut config = DeepSleepConfig {
            enabled: false,
            inactivity_timeout_secs: 1800, // 30 minutes default
            whitelist: default_whitelist.clone(),
        };

        // Attempt to load existing config
        if let Some(ref path) = config_path {
            if path.exists() {
                if let Ok(content) = std::fs::read_to_string(path) {
                    if let Ok(loaded) = serde_json::from_str::<DeepSleepConfig>(&content) {
                        config = loaded;
                    }
                }
            }
        }

        Self {
            config,
            suspended_processes: HashMap::new(),
            last_active_timestamps: HashMap::new(),
            last_foreground_pid: None,
            sys: System::new_all(),
            config_path,
        }
    }

    pub fn set_config_path(&mut self, app_config_dir: std::path::PathBuf) {
        let path = app_config_dir.join("deep_sleep_config.json");
        
        // Attempt to load existing config if it exists
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(loaded) = serde_json::from_str::<DeepSleepConfig>(&content) {
                    self.config = loaded;
                }
            }
        }
        
        self.config_path = Some(path);
    }

    pub fn get_status(&self) -> DeepSleepStatus {
        DeepSleepStatus {
            enabled: self.config.enabled,
            inactivity_timeout_secs: self.config.inactivity_timeout_secs,
            whitelist: self.config.whitelist.clone(),
            suspended_processes: self.suspended_processes.values().cloned().collect(),
        }
    }

    pub fn update_config(&mut self, enabled: bool, timeout_secs: u64, whitelist: Vec<String>) -> Result<(), String> {
        self.config.enabled = enabled;
        self.config.inactivity_timeout_secs = timeout_secs;
        self.config.whitelist = whitelist;

        // If disabled, resume all sleeping processes immediately
        if !enabled {
            let _ = self.unfreeze_all();
        }

        // Save to file
        if let Some(ref path) = self.config_path {
            if let Some(parent) = path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            if let Ok(content) = serde_json::to_string_pretty(&self.config) {
                let _ = std::fs::write(path, content);
            }
        }

        Ok(())
    }

    /// Primary background loop execution tick
    pub fn tick(&mut self) {
        if !self.config.enabled {
            return;
        }

        // 1. Get current foreground PID
        let foreground_pid = self.get_foreground_pid();

        // 2. If the user switched to a frozen app, thaw it immediately
        if let Some(f_pid) = foreground_pid {
            if self.suspended_processes.contains_key(&f_pid) {
                let _ = self.thaw_process(f_pid);
            }
            
            // Mark it as active now
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            self.last_active_timestamps.insert(f_pid, now);
            self.last_foreground_pid = Some(f_pid);
        }

        // 3. Refresh sysinfo processes
        self.sys.refresh_processes();

        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        let our_pid = std::process::id();

        // 4. Scan processes to identify freeze candidates
        let mut candidates = Vec::new();

        for (pid, process) in self.sys.processes() {
            let pid_u32 = pid.as_u32();

            // Skip: our app, current foreground app, already suspended apps
            if pid_u32 == our_pid {
                continue;
            }
            if Some(pid_u32) == foreground_pid {
                continue;
            }
            if self.suspended_processes.contains_key(&pid_u32) {
                continue;
            }

            let name = process.name().to_string();
            let name_lower = name.to_lowercase();

            // Check whitelist
            let is_whitelisted = self.config.whitelist.iter().any(|w| {
                let w_lower = w.to_lowercase();
                name_lower == w_lower || name_lower.contains(&w_lower)
            });
            if is_whitelisted {
                continue;
            }

            // Heuristics for heavy apps:
            // - Memory consumption > 150MB (150 * 1024 * 1024 bytes)
            // - Or common user apps in list
            let is_heavy_app = process.memory() > 150 * 1024 * 1024;
            let common_heavy_names = vec![
                "chrome", "firefox", "slack", "discord", "spotify", "vscode",
                "docker", "teams", "safari", "excel", "word", "powerpoint", "steam"
            ];
            let is_known_heavy = common_heavy_names.iter().any(|&n| name_lower.contains(n));

            if is_heavy_app || is_known_heavy {
                candidates.push((pid_u32, name, process.memory()));
            }
        }

        // 5. Suspend candidates exceeding timeout
        for (pid, name, memory_bytes) in candidates {
            let last_active = self.last_active_timestamps.entry(pid).or_insert(now);
            let elapsed = now.saturating_sub(*last_active);

            if elapsed >= self.config.inactivity_timeout_secs {
                if self.freeze_process(pid, name, memory_bytes).is_ok() {
                    // Log success
                    println!("Deep Sleep: Suspended PID {} successfully saving {} MB", pid, memory_bytes / (1024 * 1024));
                }
            }
        }

        // 6. Clean up dead processes from the tracking list
        let active_pids: Vec<u32> = self.suspended_processes.keys().cloned().collect();
        for pid in active_pids {
            if self.sys.process(Pid::from_u32(pid)).is_none() {
                self.suspended_processes.remove(&pid);
            }
        }
    }

    pub fn freeze_process(&mut self, pid: u32, name: String, memory_bytes: u64) -> Result<(), String> {
        let result = self.suspend_pid(pid);
        if result.is_ok() {
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            self.suspended_processes.insert(pid, SuspendedProcess {
                pid,
                name,
                memory_bytes,
                suspended_at: now,
            });
            Ok(())
        } else {
            result
        }
    }

    pub fn thaw_process(&mut self, pid: u32) -> Result<(), String> {
        let result = self.resume_pid(pid);
        if result.is_ok() {
            self.suspended_processes.remove(&pid);
            // Reset active timestamp to prevent immediate re-suspension
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
            self.last_active_timestamps.insert(pid, now);
            Ok(())
        } else {
            result
        }
    }

    pub fn unfreeze_all(&mut self) -> Result<(), String> {
        let pids: Vec<u32> = self.suspended_processes.keys().cloned().collect();
        let mut errors = Vec::new();

        for pid in pids {
            if let Err(e) = self.resume_pid(pid) {
                errors.push(format!("PID {}: {}", pid, e));
            }
        }

        self.suspended_processes.clear();
        self.last_active_timestamps.clear();

        if errors.is_empty() {
            Ok(())
        } else {
            Err(format!("Errors occurred while resuming processes: {}", errors.join("; ")))
        }
    }

    // ─── Helper Process Controllers ──────────────────────────────────────────
    fn suspend_pid(&self, pid: u32) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            windows_suspend::suspend_process(pid)
        }
        #[cfg(not(target_os = "windows"))]
        {
            use sysinfo::Signal;
            let sys = System::new_all();
            if let Some(process) = sys.process(Pid::from_u32(pid)) {
                // If already stopped/sleeping, consider it done
                if format!("{:?}", process.status()) == "Stop" {
                    return Ok(());
                }
                match process.kill_with(Signal::Stop) {
                    Some(true) => Ok(()),
                    _ => Err(format!("Failed to send SIGSTOP to PID {}", pid)),
                }
            } else {
                Err(format!("Process with PID {} not found", pid))
            }
        }
    }

    fn resume_pid(&self, pid: u32) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            windows_suspend::resume_process(pid)
        }
        #[cfg(not(target_os = "windows"))]
        {
            use sysinfo::Signal;
            let sys = System::new_all();
            if let Some(process) = sys.process(Pid::from_u32(pid)) {
                match process.kill_with(Signal::Continue) {
                    Some(true) => Ok(()),
                    _ => Err(format!("Failed to send SIGCONT to PID {}", pid)),
                }
            } else {
                // If it died, we can't resume it, but it's not a block
                Ok(())
            }
        }
    }

    // ─── Active Foreground Window Resolvers ──────────────────────────────────
    fn get_foreground_pid(&self) -> Option<u32> {
        #[cfg(target_os = "windows")]
        {
            windows_suspend::get_foreground_process_id()
        }
        #[cfg(target_os = "macos")]
        {
            let output = std::process::Command::new("osascript")
                .args(&["-e", "tell application \"System Events\" to get unix id of first process whose frontmost is true"])
                .output()
                .ok()?;
            
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                stdout.trim().parse::<u32>().ok()
            } else {
                None
            }
        }
        #[cfg(target_os = "linux")]
        {
            let output = std::process::Command::new("xdotool")
                .args(&["getactivewindow", "getwindowpid"])
                .output()
                .ok()?;
            
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                stdout.trim().parse::<u32>().ok()
            } else {
                None
            }
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            None
        }
    }
}
