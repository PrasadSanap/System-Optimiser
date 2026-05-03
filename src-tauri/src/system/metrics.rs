use serde::{Deserialize, Serialize};
use sysinfo::{System, Disks, Networks};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuMetrics {
    pub usage_percent: f32,
    pub cores: usize,
    pub frequency_mhz: u64,
    pub temperature: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub packets_sent: u64,
    pub packets_received: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disk: DiskMetrics,
    pub network: NetworkMetrics,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    pub disk_read_bytes: u64,
    pub disk_write_bytes: u64,
    pub status: String,
    pub start_time: u64,
}

pub struct MetricsCollector {
    system: System,
    disks: Disks,
    networks: Networks,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            system: System::new_all(),
            disks: Disks::new_with_refreshed_list(),
            networks: Networks::new_with_refreshed_list(),
        }
    }

    pub fn refresh(&mut self) {
        self.system.refresh_all();
        self.disks.refresh();
        self.networks.refresh();
    }

    pub fn get_metrics(&mut self) -> SystemMetrics {
        self.refresh();

        let cpu_metrics = self.get_cpu_metrics();
        let memory_metrics = self.get_memory_metrics();
        let disk_metrics = self.get_disk_metrics();
        let network_metrics = self.get_network_metrics();

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        SystemMetrics {
            cpu: cpu_metrics,
            memory: memory_metrics,
            disk: disk_metrics,
            network: network_metrics,
            timestamp,
        }
    }

    fn get_cpu_metrics(&self) -> CpuMetrics {
        let global_cpu = self.system.global_cpu_info();
        let cpu_usage = global_cpu.cpu_usage();
        let cores = self.system.cpus().len();
        let frequency = global_cpu.frequency();

        // Temperature is platform-specific and may not be available
        let temperature = self.get_cpu_temperature();

        CpuMetrics {
            usage_percent: cpu_usage,
            cores,
            frequency_mhz: frequency,
            temperature,
        }
    }

    fn get_memory_metrics(&self) -> MemoryMetrics {
        let total = self.system.total_memory();
        let used = self.system.used_memory();
        let available = self.system.available_memory();
        let usage_percent = if total > 0 {
            (used as f32 / total as f32) * 100.0
        } else {
            0.0
        };

        MemoryMetrics {
            total_bytes: total,
            used_bytes: used,
            available_bytes: available,
            usage_percent,
        }
    }

    fn get_disk_metrics(&self) -> DiskMetrics {
        let mut total = 0u64;
        let mut available = 0u64;

        for disk in self.disks.list() {
            total += disk.total_space();
            available += disk.available_space();
        }

        let used = total.saturating_sub(available);
        let usage_percent = if total > 0 {
            (used as f32 / total as f32) * 100.0
        } else {
            0.0
        };

        DiskMetrics {
            total_bytes: total,
            used_bytes: used,
            available_bytes: available,
            usage_percent,
        }
    }

    fn get_network_metrics(&self) -> NetworkMetrics {
        let mut bytes_sent = 0u64;
        let mut bytes_received = 0u64;
        let mut packets_sent = 0u64;
        let mut packets_received = 0u64;

        for (_name, network) in self.networks.list() {
            bytes_sent += network.total_transmitted();
            bytes_received += network.total_received();
            packets_sent += network.total_packets_transmitted();
            packets_received += network.total_packets_received();
        }

        NetworkMetrics {
            bytes_sent,
            bytes_received,
            packets_sent,
            packets_received,
        }
    }

    #[cfg(target_os = "macos")]
    fn get_cpu_temperature(&self) -> Option<f32> {
        // macOS temperature reading would require additional libraries
        // For now, return None
        None
    }

    #[cfg(target_os = "windows")]
    fn get_cpu_temperature(&self) -> Option<f32> {
        // Windows temperature reading would require WMI
        // For now, return None
        None
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    fn get_cpu_temperature(&self) -> Option<f32> {
        None
    }

    pub fn get_process_list(&mut self, sort_by: Option<&str>, limit: Option<usize>) -> Vec<ProcessInfo> {
        self.system.refresh_processes();

        let mut processes: Vec<ProcessInfo> = self.system.processes()
            .iter()
            .map(|(pid, process)| {
                let disk_usage = process.disk_usage();
                ProcessInfo {
                    pid: pid.as_u32(),
                    name: process.name().to_string(),
                    cpu_percent: process.cpu_usage(),
                    memory_bytes: process.memory(),
                    disk_read_bytes: disk_usage.read_bytes,
                    disk_write_bytes: disk_usage.written_bytes,
                    status: format!("{:?}", process.status()),
                    start_time: process.start_time(),
                }
            })
            .collect();

        // Sort processes
        match sort_by {
            Some("cpu") => processes.sort_by(|a, b| b.cpu_percent.partial_cmp(&a.cpu_percent).unwrap()),
            Some("memory") => processes.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes)),
            Some("name") => processes.sort_by(|a, b| a.name.cmp(&b.name)),
            _ => processes.sort_by(|a, b| b.cpu_percent.partial_cmp(&a.cpu_percent).unwrap()),
        }

        // Apply limit
        if let Some(limit) = limit {
            processes.truncate(limit);
        }

        processes
    }

    pub fn kill_process(&mut self, pid: u32, _force: bool) -> Result<(), String> {
        use sysinfo::Pid;
        
        self.system.refresh_processes();
        
        let pid = Pid::from_u32(pid);
        
        if let Some(process) = self.system.process(pid) {
            if process.kill() {
                Ok(())
            } else {
                Err("Failed to kill process".to_string())
            }
        } else {
            Err("Process not found".to_string())
        }
    }
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

// Made with Bob
