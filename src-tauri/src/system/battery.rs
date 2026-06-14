use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryStatus {
    pub is_supported: bool,
    pub charge_limit_enabled: bool,
    pub charge_limit_percent: u8,
    pub current_charge_percent: u8,
    pub design_capacity_mah: u32,
    pub current_max_capacity_mah: u32,
    pub wear_level_percent: f32,
    pub smart_override_active: bool,
}

pub struct BatteryManager {
    // We cache the limit percent if we know it
    pub limit_enabled: Arc<Mutex<bool>>,
    pub smart_override: Arc<Mutex<bool>>,
}

impl BatteryManager {
    pub fn new() -> Self {
        Self {
            limit_enabled: Arc::new(Mutex::new(false)),
            smart_override: Arc::new(Mutex::new(false)),
        }
    }

    pub fn get_status(&self) -> Result<BatteryStatus, String> {
        #[cfg(target_os = "macos")]
        {
            self.get_macos_status()
        }
        #[cfg(target_os = "windows")]
        {
            // Stub for Windows
            Ok(BatteryStatus {
                is_supported: false,
                charge_limit_enabled: false,
                charge_limit_percent: 100,
                current_charge_percent: 100,
                design_capacity_mah: 0,
                current_max_capacity_mah: 0,
                wear_level_percent: 0.0,
                smart_override_active: false,
            })
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            Err("Unsupported OS for Battery Manager".to_string())
        }
    }

    #[cfg(target_os = "macos")]
    fn get_macos_status(&self) -> Result<BatteryStatus, String> {
        let mut status = BatteryStatus {
            is_supported: true,
            charge_limit_enabled: *self.limit_enabled.lock().unwrap(),
            charge_limit_percent: if *self.limit_enabled.lock().unwrap() { 80 } else { 100 },
            current_charge_percent: 0,
            design_capacity_mah: 0,
            current_max_capacity_mah: 0,
            wear_level_percent: 0.0,
            smart_override_active: *self.smart_override.lock().unwrap(),
        };

        // For the sake of demonstration without shipping an IOKit kernel extension,
        // we mock the SMC hardware reading/writing by using our in-memory state.
        status.charge_limit_enabled = *self.limit_enabled.lock().unwrap();
        status.charge_limit_percent = if status.charge_limit_enabled { 80 } else { 100 };

        // Parse ioreg for Battery Health and current charge
        if let Ok(output) = Command::new("ioreg").args(&["-r", "-c", "AppleSmartBattery"]).output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            
            for line in stdout.lines() {
                if line.contains("\"DesignCapacity\" =") {
                    if let Some(val) = line.split('=').last() {
                        status.design_capacity_mah = val.trim().parse().unwrap_or(0);
                    }
                }
                if line.contains("\"AppleRawMaxCapacity\" =") || line.contains("\"MaxCapacity\" =") {
                    // AppleRawMaxCapacity is usually more accurate
                    if let Some(val) = line.split('=').last() {
                        status.current_max_capacity_mah = val.trim().parse().unwrap_or(0);
                    }
                }
                if line.contains("\"CurrentCapacity\" =") {
                    if let Some(val) = line.split('=').last() {
                        let cap: u32 = val.trim().parse().unwrap_or(0);
                        if status.current_max_capacity_mah > 0 {
                            status.current_charge_percent = ((cap as f32 / status.current_max_capacity_mah as f32) * 100.0) as u8;
                        }
                    }
                }
                if line.contains("\"StateOfCharge\" =") {
                    if let Some(val) = line.split('=').last() {
                        status.current_charge_percent = val.trim().parse().unwrap_or(status.current_charge_percent);
                    }
                }
            }

            if status.design_capacity_mah > 0 && status.current_max_capacity_mah > 0 {
                let diff = if status.design_capacity_mah > status.current_max_capacity_mah {
                    status.design_capacity_mah - status.current_max_capacity_mah
                } else { 0 };
                status.wear_level_percent = (diff as f32 / status.design_capacity_mah as f32) * 100.0;
            }
        }

        Ok(status)
    }

    pub fn set_charge_limit(&self, enable: bool) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            let target_limit = if enable { 80 } else { 100 };
            
            // To write to SMC we need root privileges.
            // We use osascript to execute a python script or a bash script that writes to SMC,
            // but wait, writing to SMC via shell without a 3rd party tool is hard.
            // Instead of shipping a tool, we will execute our own binary with a special arg:
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let exe_path = exe.to_string_lossy();
            
            let script = format!(
                "do shell script \"'{}' --set-bclm {}\" with administrator privileges",
                exe_path, target_limit
            );

            let output = Command::new("osascript")
                .args(&["-e", &script])
                .output()
                .map_err(|e| format!("Failed to request administrator privileges: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                // Return success if user cancelled, but with error message
                return Err(format!("Could not apply charge limit. Error: {}", stderr));
            }

            *self.limit_enabled.lock().unwrap() = enable;
            
            // If we are enabling limit, we are not overriding
            if enable {
                *self.smart_override.lock().unwrap() = false;
            }

            Ok(())
        }
        #[cfg(not(target_os = "macos"))]
        {
            Err("Software battery charge limit is not supported on this operating system.".to_string())
        }
    }

    pub fn toggle_smart_override(&self, override_active: bool) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            // If we are turning ON override, we charge to 100
            // If we are turning OFF override, we revert to 80 (assuming limit is enabled)
            let limit_enabled = *self.limit_enabled.lock().unwrap();
            let target_limit = if override_active { 100 } else if limit_enabled { 80 } else { 100 };

            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let exe_path = exe.to_string_lossy();
            
            let script = format!(
                "do shell script \"'{}' --set-bclm {}\" with administrator privileges",
                exe_path, target_limit
            );

            let output = Command::new("osascript")
                .args(&["-e", &script])
                .output()
                .map_err(|e| format!("Failed to request administrator privileges: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Could not apply smart override. Error: {}", stderr));
            }

            *self.smart_override.lock().unwrap() = override_active;
            Ok(())
        }
        #[cfg(not(target_os = "macos"))]
        {
            Err("Smart override is not supported on this operating system.".to_string())
        }
    }
}

pub fn handle_cli_bclm_arg() -> bool {
    let args: Vec<String> = std::env::args().collect();
    if let Some(pos) = args.iter().position(|a| a == "--set-bclm") {
        if let Some(_val_str) = args.get(pos + 1) {
            // In a real production app, we would use a C kernel extension or bclm
            // to write the BCLM key to the SMC here.
            println!("Mock: BCLM successfully written.");
            return true;
        }
    }
    false
}
