use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

// ── Data Structures ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskHealthInfo {
    pub device: String,
    pub model: String,
    pub serial: String,
    pub disk_type: String, // "SSD", "HDD", "NVMe", "Unknown"
    pub health_score: u8,  // 0-100
    pub temperature_celsius: Option<f32>,
    pub power_on_hours: u64,
    pub total_bytes_written: u64,
    pub rated_tbw: Option<u64>,
    pub reallocated_sectors: u64,
    pub read_error_rate: u64,
    pub write_error_rate: u64,
    pub predicted_remaining_days: Option<u64>,
    pub smart_status: String, // "passed", "failed", "unknown"
    pub available: bool,
    pub requires_admin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryHealthInfo {
    pub design_capacity_mah: u64,
    pub current_max_capacity_mah: u64,
    pub health_percent: f32, // 0-100
    pub cycle_count: u64,
    pub rated_cycle_count: u64,
    pub temperature_celsius: Option<f32>,
    pub is_charging: bool,
    pub predicted_replacement_days: Option<u64>,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthAlert {
    pub component: String,
    pub severity: String, // "info", "warning", "critical"
    pub message: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareHealthData {
    pub disks: Vec<DiskHealthInfo>,
    pub battery: Option<BatteryHealthInfo>,
    pub alerts: Vec<HealthAlert>,
    pub last_updated: u64,
    pub smartctl_available: bool,
    pub is_laptop: bool,
}

// ── Hardware Health Collector ────────────────────────────────────────────────

pub struct HardwareHealthCollector {
    cached_data: Option<HardwareHealthData>,
    last_refresh: u64,
}

impl HardwareHealthCollector {
    pub fn new() -> Self {
        Self {
            cached_data: None,
            last_refresh: 0,
        }
    }

    /// Returns full hardware health data. Caches for 30 seconds to avoid
    /// hammering smartctl and IOKit on every poll cycle.
    pub fn get_hardware_health(&mut self) -> HardwareHealthData {
        let now = now_secs();
        if now.saturating_sub(self.last_refresh) < 30 {
            if let Some(ref cached) = self.cached_data {
                return cached.clone();
            }
        }

        let disks = self.collect_disk_health();
        let battery = self.collect_battery_health();
        let smartctl_available = check_smartctl_available();
        let is_laptop = battery.is_some();

        let mut alerts = Vec::new();
        self.generate_alerts(&disks, &battery, &mut alerts);

        let data = HardwareHealthData {
            disks,
            battery,
            alerts,
            last_updated: now,
            smartctl_available,
            is_laptop,
        };

        self.cached_data = Some(data.clone());
        self.last_refresh = now;
        data
    }

    pub fn get_disk_health(&mut self) -> Vec<DiskHealthInfo> {
        self.get_hardware_health().disks
    }

    pub fn get_battery_health(&mut self) -> Option<BatteryHealthInfo> {
        self.get_hardware_health().battery
    }

    // ── Disk Health Collection ──────────────────────────────────────────

    fn collect_disk_health(&self) -> Vec<DiskHealthInfo> {
        if !check_smartctl_available() {
            return vec![self.unavailable_disk("smartctl not installed")];
        }

        let devices = discover_devices();
        if devices.is_empty() {
            return vec![self.unavailable_disk("No disks discovered")];
        }

        devices
            .into_iter()
            .filter_map(|dev| self.read_smart_data(&dev))
            .collect()
    }

    fn read_smart_data(&self, device: &str) -> Option<DiskHealthInfo> {
        // Try without sudo first
        let output = Command::new("smartctl")
            .args(["--json=c", "--all", device])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let requires_admin = out.status.code().map_or(false, |c| c == 2);

                if requires_admin && stdout.trim().is_empty() {
                    return Some(DiskHealthInfo {
                        device: device.to_string(),
                        model: String::new(),
                        serial: String::new(),
                        disk_type: "Unknown".to_string(),
                        health_score: 0,
                        temperature_celsius: None,
                        power_on_hours: 0,
                        total_bytes_written: 0,
                        rated_tbw: None,
                        reallocated_sectors: 0,
                        read_error_rate: 0,
                        write_error_rate: 0,
                        predicted_remaining_days: None,
                        smart_status: "unknown".to_string(),
                        available: false,
                        requires_admin: true,
                    });
                }

                Some(parse_smartctl_json(&stdout, device, requires_admin))
            }
            Err(_) => None,
        }
    }

    fn unavailable_disk(&self, reason: &str) -> DiskHealthInfo {
        DiskHealthInfo {
            device: reason.to_string(),
            model: String::new(),
            serial: String::new(),
            disk_type: "Unknown".to_string(),
            health_score: 0,
            temperature_celsius: None,
            power_on_hours: 0,
            total_bytes_written: 0,
            rated_tbw: None,
            reallocated_sectors: 0,
            read_error_rate: 0,
            write_error_rate: 0,
            predicted_remaining_days: None,
            smart_status: "unknown".to_string(),
            available: false,
            requires_admin: false,
        }
    }

    // ── Battery Health Collection ───────────────────────────────────────

    #[cfg(target_os = "macos")]
    fn collect_battery_health(&self) -> Option<BatteryHealthInfo> {
        collect_battery_macos()
    }

    #[cfg(target_os = "windows")]
    fn collect_battery_health(&self) -> Option<BatteryHealthInfo> {
        collect_battery_windows()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    fn collect_battery_health(&self) -> Option<BatteryHealthInfo> {
        // Linux: could parse /sys/class/power_supply/BAT0/
        collect_battery_linux()
    }

    // ── Alert Generation ────────────────────────────────────────────────

    fn generate_alerts(
        &self,
        disks: &[DiskHealthInfo],
        battery: &Option<BatteryHealthInfo>,
        alerts: &mut Vec<HealthAlert>,
    ) {
        let now = now_secs();

        for disk in disks {
            if !disk.available {
                continue;
            }

            if disk.health_score < 10 {
                alerts.push(HealthAlert {
                    component: format!("Disk: {}", disk.model),
                    severity: "critical".to_string(),
                    message: format!(
                        "Drive health critically low ({}%). Immediate backup and replacement recommended!",
                        disk.health_score
                    ),
                    timestamp: now,
                });
            } else if disk.health_score < 20 {
                alerts.push(HealthAlert {
                    component: format!("Disk: {}", disk.model),
                    severity: "warning".to_string(),
                    message: format!(
                        "Drive health degraded ({}%). Plan replacement within {} days.",
                        disk.health_score,
                        disk.predicted_remaining_days.unwrap_or(90)
                    ),
                    timestamp: now,
                });
            }

            if disk.smart_status == "failed" {
                alerts.push(HealthAlert {
                    component: format!("Disk: {}", disk.model),
                    severity: "critical".to_string(),
                    message: "S.M.A.R.T. self-test FAILED. Drive failure may be imminent.".to_string(),
                    timestamp: now,
                });
            }

            if let Some(temp) = disk.temperature_celsius {
                if temp > 70.0 {
                    alerts.push(HealthAlert {
                        component: format!("Disk: {}", disk.model),
                        severity: "critical".to_string(),
                        message: format!("Drive temperature critically high: {:.0}°C", temp),
                        timestamp: now,
                    });
                } else if temp > 55.0 {
                    alerts.push(HealthAlert {
                        component: format!("Disk: {}", disk.model),
                        severity: "warning".to_string(),
                        message: format!("Drive temperature elevated: {:.0}°C", temp),
                        timestamp: now,
                    });
                }
            }

            if disk.reallocated_sectors > 0 {
                let sev = if disk.reallocated_sectors > 100 { "critical" } else { "warning" };
                alerts.push(HealthAlert {
                    component: format!("Disk: {}", disk.model),
                    severity: sev.to_string(),
                    message: format!(
                        "{} reallocated sectors detected. This indicates physical wear.",
                        disk.reallocated_sectors
                    ),
                    timestamp: now,
                });
            }
        }

        if let Some(ref bat) = battery {
            if bat.health_percent < 50.0 {
                alerts.push(HealthAlert {
                    component: "Battery".to_string(),
                    severity: "critical".to_string(),
                    message: format!(
                        "Battery health at {:.0}%. Replacement strongly recommended.",
                        bat.health_percent
                    ),
                    timestamp: now,
                });
            } else if bat.health_percent < 80.0 {
                alerts.push(HealthAlert {
                    component: "Battery".to_string(),
                    severity: "warning".to_string(),
                    message: format!(
                        "Battery capacity degraded to {:.0}% of original. Consider replacement in the future.",
                        bat.health_percent
                    ),
                    timestamp: now,
                });
            }

            if let Some(temp) = bat.temperature_celsius {
                if temp > 45.0 {
                    alerts.push(HealthAlert {
                        component: "Battery".to_string(),
                        severity: "warning".to_string(),
                        message: format!("Battery temperature elevated: {:.1}°C", temp),
                        timestamp: now,
                    });
                }
            }
        }
    }
}

impl Default for HardwareHealthCollector {
    fn default() -> Self {
        Self::new()
    }
}

// ── Platform-Specific Battery Implementations ────────────────────────────────

#[cfg(target_os = "macos")]
fn collect_battery_macos() -> Option<BatteryHealthInfo> {
    // Use ioreg to read AppleSmartBattery data (doesn't require sudo)
    let output = Command::new("ioreg")
        .args(["-r", "-c", "AppleSmartBattery", "-w", "0"])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.is_empty() {
        return None; // No battery — likely a desktop Mac
    }

    let design_cap = extract_ioreg_value(&stdout, "DesignCapacity").unwrap_or(0);
    let max_cap = extract_ioreg_value(&stdout, "MaxCapacity").unwrap_or(0);
    let cycle_count = extract_ioreg_value(&stdout, "CycleCount").unwrap_or(0);
    let is_charging = extract_ioreg_bool(&stdout, "IsCharging").unwrap_or(false);
    let temperature_raw = extract_ioreg_value(&stdout, "Temperature").unwrap_or(0);

    // Temperature from AppleSmartBattery is in centidegrees Celsius
    let temperature = if temperature_raw > 0 {
        Some(temperature_raw as f32 / 100.0)
    } else {
        None
    };

    let health_percent = if design_cap > 0 {
        ((max_cap as f64 / design_cap as f64) * 100.0).min(100.0) as f32
    } else {
        100.0
    };

    // Apple rates MacBook batteries at ~1000 cycles
    let rated_cycles: u64 = 1000;
    let predicted_replacement_days = predict_battery_lifespan(
        cycle_count,
        rated_cycles,
        health_percent,
    );

    Some(BatteryHealthInfo {
        design_capacity_mah: design_cap,
        current_max_capacity_mah: max_cap,
        health_percent,
        cycle_count,
        rated_cycle_count: rated_cycles,
        temperature_celsius: temperature,
        is_charging,
        predicted_replacement_days,
        available: true,
    })
}

#[cfg(target_os = "windows")]
fn collect_battery_windows() -> Option<BatteryHealthInfo> {
    // Use powershell to read battery data via WMI
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-CimInstance -ClassName Win32_Battery | Select-Object -Property * | ConvertTo-Json",
        ])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.trim().is_empty() {
        return None;
    }

    // Also read detailed battery report for design capacity
    let report_output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-CimInstance -Namespace root/WMI -ClassName BatteryFullChargedCapacity | ConvertTo-Json; Get-CimInstance -Namespace root/WMI -ClassName BatteryStaticData | ConvertTo-Json; Get-CimInstance -Namespace root/WMI -ClassName BatteryCycleCount | ConvertTo-Json",
        ])
        .output()
        .ok();

    let mut design_cap: u64 = 0;
    let mut full_charge_cap: u64 = 0;
    let mut cycle_count: u64 = 0;

    if let Some(ref report) = report_output {
        let report_str = String::from_utf8_lossy(&report.stdout);
        // Parse the JSON blocks (they're separated in output)
        for line in report_str.lines() {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(fc) = val.get("FullChargedCapacity").and_then(|v| v.as_u64()) {
                    full_charge_cap = fc;
                }
                if let Some(dc) = val.get("DesignedCapacity").and_then(|v| v.as_u64()) {
                    design_cap = dc;
                }
                if let Some(cc) = val.get("CycleCount").and_then(|v| v.as_u64()) {
                    cycle_count = cc;
                }
            }
        }
    }

    // Fallback: try parsing the Win32_Battery JSON
    if let Ok(bat_val) = serde_json::from_str::<serde_json::Value>(&stdout) {
        if design_cap == 0 {
            design_cap = bat_val.get("DesignCapacity").and_then(|v| v.as_u64()).unwrap_or(0);
        }
        if full_charge_cap == 0 {
            full_charge_cap = bat_val.get("FullChargeCapacity").and_then(|v| v.as_u64()).unwrap_or(design_cap);
        }
    }

    if design_cap == 0 {
        return None;
    }

    let health_percent = ((full_charge_cap as f64 / design_cap as f64) * 100.0).min(100.0) as f32;
    let rated_cycles: u64 = 1000;
    let predicted_replacement_days = predict_battery_lifespan(cycle_count, rated_cycles, health_percent);

    let is_charging = stdout.contains("\"BatteryStatus\":2") || stdout.contains("\"BatteryStatus\": 2");

    Some(BatteryHealthInfo {
        design_capacity_mah: design_cap,
        current_max_capacity_mah: full_charge_cap,
        health_percent,
        cycle_count,
        rated_cycle_count: rated_cycles,
        temperature_celsius: None, // WMI doesn't expose battery temp easily
        is_charging,
        predicted_replacement_days,
        available: true,
    })
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn collect_battery_linux() -> Option<BatteryHealthInfo> {
    use std::fs;
    use std::path::Path;

    let bat_path = Path::new("/sys/class/power_supply/BAT0");
    if !bat_path.exists() {
        return None;
    }

    let read_val = |name: &str| -> u64 {
        fs::read_to_string(bat_path.join(name))
            .ok()
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0)
    };

    let design_cap = read_val("charge_full_design") / 1000; // µAh → mAh
    let full_cap = read_val("charge_full") / 1000;
    let cycle_count = read_val("cycle_count");
    let status = fs::read_to_string(bat_path.join("status"))
        .unwrap_or_default();
    let is_charging = status.trim() == "Charging";

    if design_cap == 0 {
        return None;
    }

    let health_percent = ((full_cap as f64 / design_cap as f64) * 100.0).min(100.0) as f32;
    let rated_cycles: u64 = 1000;
    let predicted_replacement_days = predict_battery_lifespan(cycle_count, rated_cycles, health_percent);

    Some(BatteryHealthInfo {
        design_capacity_mah: design_cap,
        current_max_capacity_mah: full_cap,
        health_percent,
        cycle_count,
        rated_cycle_count: rated_cycles,
        temperature_celsius: None,
        is_charging,
        predicted_replacement_days,
        available: true,
    })
}

// ── S.M.A.R.T. Parsing ──────────────────────────────────────────────────────

fn check_smartctl_available() -> bool {
    Command::new("smartctl")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn discover_devices() -> Vec<String> {
    // Try smartctl --scan first
    if let Ok(output) = Command::new("smartctl")
        .args(["--scan", "--json=c"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
            if let Some(devices) = json.get("devices").and_then(|d| d.as_array()) {
                let devs: Vec<String> = devices
                    .iter()
                    .filter_map(|d| d.get("name").and_then(|n| n.as_str()).map(String::from))
                    .collect();
                if !devs.is_empty() {
                    return devs;
                }
            }
        }
    }

    // Fallback: common device paths
    #[cfg(target_os = "macos")]
    {
        vec!["/dev/disk0".to_string()]
    }
    #[cfg(target_os = "windows")]
    {
        vec!["/dev/sda".to_string()]
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        vec!["/dev/sda".to_string()]
    }
}

fn parse_smartctl_json(json_str: &str, device: &str, requires_admin: bool) -> DiskHealthInfo {
    let json: serde_json::Value = match serde_json::from_str(json_str) {
        Ok(v) => v,
        Err(_) => {
            return DiskHealthInfo {
                device: device.to_string(),
                model: String::new(),
                serial: String::new(),
                disk_type: "Unknown".to_string(),
                health_score: 0,
                temperature_celsius: None,
                power_on_hours: 0,
                total_bytes_written: 0,
                rated_tbw: None,
                reallocated_sectors: 0,
                read_error_rate: 0,
                write_error_rate: 0,
                predicted_remaining_days: None,
                smart_status: "unknown".to_string(),
                available: false,
                requires_admin,
            };
        }
    };

    // Extract device info
    let model = json
        .pointer("/model_name")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let serial = json
        .pointer("/serial_number")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // Determine disk type from rotation rate (0 = SSD/NVMe)
    let rotation = json
        .pointer("/rotation_rate")
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let disk_type = if rotation == 0 {
        // Check if NVMe
        let transport = json
            .pointer("/device/type")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if transport.contains("nvme") {
            "NVMe".to_string()
        } else {
            "SSD".to_string()
        }
    } else {
        "HDD".to_string()
    };

    // S.M.A.R.T. overall status
    let smart_status = json
        .pointer("/smart_status/passed")
        .and_then(|v| v.as_bool())
        .map(|passed| if passed { "passed" } else { "failed" })
        .unwrap_or("unknown")
        .to_string();

    // Extract attributes from the SMART table
    let attrs = json
        .pointer("/ata_smart_attributes/table")
        .and_then(|v| v.as_array());

    let mut temperature: Option<f32> = None;
    let mut power_on_hours: u64 = 0;
    let mut reallocated_sectors: u64 = 0;
    let mut read_error_rate: u64 = 0;
    let mut write_error_rate: u64 = 0;
    let mut total_lbas_written: u64 = 0;
    let mut wear_leveling_count: Option<u64> = None;

    if let Some(table) = attrs {
        for attr in table {
            let id = attr.get("id").and_then(|v| v.as_u64()).unwrap_or(0);
            let raw_value = attr
                .pointer("/raw/value")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            let current_value = attr
                .get("value")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);

            match id {
                194 | 190 => temperature = Some(raw_value as f32), // Temperature
                9 => power_on_hours = raw_value,                    // Power-On Hours
                5 => reallocated_sectors = raw_value,               // Reallocated Sectors
                1 => read_error_rate = raw_value,                   // Read Error Rate
                199 => write_error_rate = raw_value,                // UltraDMA CRC Error Count
                241 => total_lbas_written = raw_value,              // Total LBAs Written
                177 | 233 => wear_leveling_count = Some(current_value), // Wear Leveling / Media Wearout
                _ => {}
            }
        }
    }

    // Also check NVMe-specific paths
    if let Some(nvme_health) = json.pointer("/nvme_smart_health_information_log") {
        if temperature.is_none() {
            temperature = nvme_health
                .get("temperature")
                .and_then(|v| v.as_f64())
                .map(|t| t as f32);
        }
        if power_on_hours == 0 {
            power_on_hours = nvme_health
                .get("power_on_hours")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
        }
        if total_lbas_written == 0 {
            total_lbas_written = nvme_health
                .get("data_units_written")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
        }
        if wear_leveling_count.is_none() {
            wear_leveling_count = nvme_health
                .get("percentage_used")
                .and_then(|v| v.as_u64())
                .map(|pct| 100_u64.saturating_sub(pct));
        }
    }

    // Convert LBAs written to bytes (each LBA = 512 bytes typically, NVMe units = 512K)
    let total_bytes_written = if disk_type == "NVMe" {
        total_lbas_written.saturating_mul(512 * 1000) // NVMe data units = 512,000 bytes
    } else {
        total_lbas_written.saturating_mul(512) // ATA LBA = 512 bytes
    };

    // Calculate health score
    let health_score = calculate_disk_health_score(
        &smart_status,
        wear_leveling_count,
        reallocated_sectors,
        power_on_hours,
        read_error_rate,
    );

    // Predict remaining lifespan
    let predicted_remaining_days = predict_disk_lifespan(
        health_score,
        power_on_hours,
        wear_leveling_count,
    );

    DiskHealthInfo {
        device: device.to_string(),
        model,
        serial,
        disk_type,
        health_score,
        temperature_celsius: temperature,
        power_on_hours,
        total_bytes_written,
        rated_tbw: None, // Would need a manufacturer database
        reallocated_sectors,
        read_error_rate,
        write_error_rate,
        predicted_remaining_days,
        smart_status,
        available: true,
        requires_admin,
    }
}

// ── Prediction Algorithms ────────────────────────────────────────────────────

fn calculate_disk_health_score(
    smart_status: &str,
    wear_leveling: Option<u64>,
    reallocated_sectors: u64,
    power_on_hours: u64,
    read_errors: u64,
) -> u8 {
    if smart_status == "failed" {
        return 5; // Critically low but not zero to show it's readable
    }

    let mut score: f64 = 100.0;

    // Wear leveling directly tells us remaining life percentage
    if let Some(wl) = wear_leveling {
        score = score.min(wl as f64);
    }

    // Reallocated sectors reduce score
    if reallocated_sectors > 0 {
        let penalty = (reallocated_sectors as f64 * 2.0).min(40.0);
        score -= penalty;
    }

    // Very high power-on hours indicate age (>50K hours ≈ 5.7 years continuous)
    if power_on_hours > 50000 {
        let age_penalty = ((power_on_hours - 50000) as f64 / 10000.0 * 5.0).min(20.0);
        score -= age_penalty;
    }

    // Read errors above a threshold are concerning
    // Note: some drives report raw read error rate as a very large number (vendor-specific)
    // Only penalise if the value looks like an actual error count (< 10000)
    if read_errors > 0 && read_errors < 10000 {
        let error_penalty = (read_errors as f64 * 0.5).min(20.0);
        score -= error_penalty;
    }

    score.max(0.0).min(100.0) as u8
}

fn predict_disk_lifespan(
    health_score: u8,
    power_on_hours: u64,
    wear_leveling: Option<u64>,
) -> Option<u64> {
    if health_score >= 95 {
        return None; // Drive is healthy, no prediction needed
    }

    // If we have wear leveling, estimate linearly
    if let Some(wl) = wear_leveling {
        if wl > 0 && power_on_hours > 0 {
            let used_pct = 100.0 - wl as f64;
            if used_pct > 0.0 {
                let hours_per_percent = power_on_hours as f64 / used_pct;
                let remaining_hours = hours_per_percent * wl as f64;
                return Some((remaining_hours / 24.0) as u64);
            }
        }
    }

    // Fallback: estimate based on health score degradation rate
    // Assume linear degradation from the current state
    let remaining_percent = health_score as f64;
    if remaining_percent > 0.0 && power_on_hours > 100 {
        let degraded = 100.0 - remaining_percent;
        let hours_per_percent = power_on_hours as f64 / degraded.max(1.0);
        let remaining_hours = hours_per_percent * remaining_percent;
        Some((remaining_hours / 24.0) as u64)
    } else {
        Some(365) // Default fallback: ~1 year
    }
}

fn predict_battery_lifespan(
    cycle_count: u64,
    rated_cycles: u64,
    health_percent: f32,
) -> Option<u64> {
    if health_percent > 90.0 && cycle_count < rated_cycles / 2 {
        return None; // Battery is healthy
    }

    // Estimate daily cycle rate from current usage
    // If cycle count is very low, assume ~1 cycle per day
    let daily_cycles = if cycle_count > 30 {
        // Rough estimate: assume battery has been used for a proportional period
        1.0_f64 // conservative estimate
    } else {
        0.5
    };

    let remaining_cycles = rated_cycles.saturating_sub(cycle_count) as f64;
    let remaining_days_by_cycles = (remaining_cycles / daily_cycles) as u64;

    // Also consider health degradation
    let remaining_health = health_percent as f64;
    let remaining_days_by_health = if remaining_health < 80.0 {
        // Accelerating degradation below 80%
        ((remaining_health - 40.0).max(0.0) / 40.0 * 365.0) as u64
    } else {
        remaining_days_by_cycles // Health-based estimate not needed yet
    };

    Some(remaining_days_by_cycles.min(remaining_days_by_health))
}

// ── Helper Functions ─────────────────────────────────────────────────────────

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(target_os = "macos")]
fn extract_ioreg_value(output: &str, key: &str) -> Option<u64> {
    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.contains(&format!("\"{}\"", key)) {
            // Format: "Key" = Value
            if let Some(eq_pos) = trimmed.find('=') {
                let val_str = trimmed[eq_pos + 1..].trim();
                if let Ok(val) = val_str.parse::<u64>() {
                    return Some(val);
                }
            }
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn extract_ioreg_bool(output: &str, key: &str) -> Option<bool> {
    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.contains(&format!("\"{}\"", key)) {
            if trimmed.contains("Yes") {
                return Some(true);
            } else if trimmed.contains("No") {
                return Some(false);
            }
        }
    }
    None
}
