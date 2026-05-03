mod system;

use std::sync::Mutex;
use system::{MetricsCollector, BootOptimizer, AISuggestionsEngine};
use tauri::State;

// Global state for metrics collector and AI engines
struct AppState {
    metrics_collector: Mutex<MetricsCollector>,
    boot_optimizer: Mutex<BootOptimizer>,
    ai_engine: Mutex<AISuggestionsEngine>,
}

// System Metrics Commands
#[tauri::command]
fn get_system_metrics(state: State<AppState>) -> Result<system::SystemMetrics, String> {
    let mut collector = state.metrics_collector.lock()
        .map_err(|e| format!("Failed to lock metrics collector: {}", e))?;
    Ok(collector.get_metrics())
}

#[tauri::command]
fn get_process_list(
    state: State<AppState>,
    sort_by: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<system::ProcessInfo>, String> {
    let mut collector = state.metrics_collector.lock()
        .map_err(|e| format!("Failed to lock metrics collector: {}", e))?;
    Ok(collector.get_process_list(sort_by.as_deref(), limit))
}

#[tauri::command]
fn kill_process(
    state: State<AppState>,
    pid: u32,
    force: Option<bool>,
) -> Result<String, String> {
    let mut collector = state.metrics_collector.lock()
        .map_err(|e| format!("Failed to lock metrics collector: {}", e))?;
    collector.kill_process(pid, force.unwrap_or(false))?;
    Ok("Process terminated successfully".to_string())
}

// Placeholder commands for features to be implemented
#[tauri::command]
fn get_boot_time() -> Result<serde_json::Value, String> {
    // TODO: Implement boot time analysis
    Ok(serde_json::json!({
        "current_boot_time_ms": 45000,
        "last_boot_timestamp": 0,
        "average_boot_time_ms": 48000,
        "best_boot_time_ms": 42000,
        "worst_boot_time_ms": 55000,
        "boot_history": []
    }))
}

#[tauri::command]
fn get_startup_programs() -> Result<Vec<serde_json::Value>, String> {
    // TODO: Implement startup program detection
    Ok(vec![])
}

#[tauri::command]
fn toggle_startup_program(program_id: String, enabled: bool) -> Result<serde_json::Value, String> {
    // TODO: Implement startup program toggle
    Ok(serde_json::json!({
        "success": true,
        "message": format!("Startup program {} {}", program_id, if enabled { "enabled" } else { "disabled" })
    }))
}

#[tauri::command]
fn analyze_system(include_deep_scan: Option<bool>) -> Result<serde_json::Value, String> {
    // TODO: Implement system analysis
    let _ = include_deep_scan;
    Ok(serde_json::json!({
        "overall_score": 85,
        "issues_found": 3,
        "optimizations_available": 5,
        "categories": {
            "startup": { "score": 75, "issues": 2 },
            "disk": { "score": 90, "issues": 1 },
            "memory": { "score": 85, "issues": 0 },
            "services": { "score": 95, "issues": 0 }
        },
        "timestamp": 0
    }))
}

#[tauri::command]
fn get_optimization_suggestions() -> Result<Vec<serde_json::Value>, String> {
    // TODO: Implement optimization suggestions
    Ok(vec![])
}

#[tauri::command]
fn apply_optimization(optimization_id: String, confirm: bool) -> Result<serde_json::Value, String> {
    // TODO: Implement optimization application
    let _ = confirm;
    Ok(serde_json::json!({
        "success": true,
        "message": format!("Optimization {} applied", optimization_id),
        "requires_restart": false,
        "rollback_available": true
    }))
}

#[tauri::command]
fn rollback_optimization(optimization_id: String) -> Result<serde_json::Value, String> {
    // TODO: Implement optimization rollback
    Ok(serde_json::json!({
        "success": true,
        "message": format!("Optimization {} rolled back", optimization_id)
    }))
}

#[tauri::command]
fn clean_temp_files(categories: Vec<String>, dry_run: Option<bool>) -> Result<serde_json::Value, String> {
    // TODO: Implement temp file cleaning
    let _ = (categories, dry_run);
    Ok(serde_json::json!({
        "success": true,
        "space_freed_bytes": 0,
        "files_removed": 0,
        "errors": []
    }))
}

#[tauri::command]
fn get_ai_recommendations(
    state: State<AppState>,
    use_cloud: Option<bool>,
    context: Option<String>,
) -> Result<Vec<system::SmartSuggestion>, String> {
    let _ = (use_cloud, context);
    let ai_engine = state.ai_engine.lock()
        .map_err(|e| format!("Failed to lock AI engine: {}", e))?;
    
    // Get current metrics for context
    let mut collector = state.metrics_collector.lock()
        .map_err(|e| format!("Failed to lock metrics collector: {}", e))?;
    let metrics = collector.get_metrics();
    
    let suggestions = ai_engine.generate_suggestions(
        metrics.cpu.usage_percent as f64,
        metrics.memory.usage_percent as f64,
        metrics.disk.usage_percent as f64,
    );
    
    Ok(suggestions)
}

#[tauri::command]
fn get_ai_insights(state: State<AppState>) -> Result<Vec<system::AIInsight>, String> {
    let ai_engine = state.ai_engine.lock()
        .map_err(|e| format!("Failed to lock AI engine: {}", e))?;
    
    // Get current metrics for context
    let mut collector = state.metrics_collector.lock()
        .map_err(|e| format!("Failed to lock metrics collector: {}", e))?;
    let metrics = collector.get_metrics();
    
    let insights = ai_engine.generate_insights(
        metrics.cpu.usage_percent as f64,
        metrics.memory.usage_percent as f64,
        metrics.disk.usage_percent as f64,
    );
    
    Ok(insights)
}

#[tauri::command]
fn analyze_boot_speed(state: State<AppState>) -> Result<system::BootSpeedAnalysis, String> {
    let boot_optimizer = state.boot_optimizer.lock()
        .map_err(|e| format!("Failed to lock boot optimizer: {}", e))?;
    
    Ok(boot_optimizer.analyze_boot_speed())
}

#[tauri::command]
fn get_boot_optimization_actions(state: State<AppState>) -> Result<Vec<system::BootOptimizationAction>, String> {
    let boot_optimizer = state.boot_optimizer.lock()
        .map_err(|e| format!("Failed to lock boot optimizer: {}", e))?;
    
    Ok(boot_optimizer.get_optimization_actions())
}

#[tauri::command]
fn apply_boot_optimization(
    state: State<AppState>,
    optimization_id: String,
) -> Result<serde_json::Value, String> {
    let boot_optimizer = state.boot_optimizer.lock()
        .map_err(|e| format!("Failed to lock boot optimizer: {}", e))?;
    
    let message = boot_optimizer.apply_optimization(&optimization_id)?;
    
    Ok(serde_json::json!({
        "success": true,
        "message": message,
        "requires_restart": false,
    }))
}

#[tauri::command]
fn get_settings() -> Result<serde_json::Value, String> {
    // TODO: Implement settings retrieval
    Ok(serde_json::json!({
        "general": {
            "auto_start": false,
            "minimize_to_tray": true,
            "check_updates": true
        },
        "monitoring": {
            "update_interval_ms": 5000,
            "enable_notifications": true,
            "notification_threshold": "medium"
        },
        "ai": {
            "enable_local_ml": true,
            "enable_cloud_ai": false,
            "api_key_configured": false
        },
        "privacy": {
            "collect_anonymous_stats": false,
            "share_optimization_results": false
        },
        "optimization": {
            "auto_apply_safe_optimizations": false,
            "confirm_before_changes": true
        }
    }))
}

#[tauri::command]
fn update_settings(settings: serde_json::Value) -> Result<serde_json::Value, String> {
    // TODO: Implement settings update
    let _ = settings;
    Ok(serde_json::json!({
        "success": true,
        "message": "Settings updated successfully"
    }))
}

#[tauri::command]
fn get_performance_history(
    metric: String,
    time_range: String,
    resolution: Option<String>,
) -> Result<serde_json::Value, String> {
    // TODO: Implement performance history
    let _ = (metric, time_range, resolution);
    Ok(serde_json::json!({
        "metric": "cpu",
        "data_points": [],
        "average": 0.0,
        "min": 0.0,
        "max": 0.0
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            metrics_collector: Mutex::new(MetricsCollector::new()),
            boot_optimizer: Mutex::new(BootOptimizer::new()),
            ai_engine: Mutex::new(AISuggestionsEngine::new()),
        })
        .invoke_handler(tauri::generate_handler![
            get_system_metrics,
            get_process_list,
            kill_process,
            get_boot_time,
            get_startup_programs,
            toggle_startup_program,
            analyze_system,
            get_optimization_suggestions,
            apply_optimization,
            rollback_optimization,
            clean_temp_files,
            get_ai_recommendations,
            get_ai_insights,
            analyze_boot_speed,
            get_boot_optimization_actions,
            apply_boot_optimization,
            get_settings,
            update_settings,
            get_performance_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
