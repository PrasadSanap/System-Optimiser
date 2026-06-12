// System Metrics Types
export interface SystemMetrics {
  cpu: {
    usage_percent: number;
    cores: number;
    frequency_mhz: number;
    temperature?: number;
  };
  memory: {
    total_bytes: number;
    used_bytes: number;
    available_bytes: number;
    usage_percent: number;
  };
  disk: {
    total_bytes: number;
    used_bytes: number;
    available_bytes: number;
    usage_percent: number;
  };
  network: {
    bytes_sent: number;
    bytes_received: number;
    packets_sent: number;
    packets_received: number;
  };
  timestamp: number;
}

// Process Types
export interface Process {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_bytes: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
  status: 'running' | 'sleeping' | 'stopped';
  start_time: number;
}

export interface ProcessListParams {
  sort_by?: 'cpu' | 'memory' | 'name';
  limit?: number;
}

// Boot Analysis Types
export interface BootTimeInfo {
  current_boot_time_ms: number;
  last_boot_timestamp: number;
  average_boot_time_ms: number;
  best_boot_time_ms: number;
  worst_boot_time_ms: number;
  boot_history: Array<{
    timestamp: number;
    duration_ms: number;
  }>;
}

export interface StartupProgram {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  impact: 'low' | 'medium' | 'high';
  estimated_delay_ms: number;
  publisher?: string;
  platform: 'windows' | 'macos' | 'both';
}

export interface ToggleStartupParams {
  program_id: string;
  enabled: boolean;
}

export interface ToggleResult {
  success: boolean;
  message: string;
}

// Optimization Types
export interface SystemAnalysis {
  overall_score: number;
  issues_found: number;
  optimizations_available: number;
  categories: {
    startup: {
      score: number;
      issues: number;
    };
    disk: {
      score: number;
      issues: number;
    };
    memory: {
      score: number;
      issues: number;
    };
    services: {
      score: number;
      issues: number;
    };
  };
  timestamp: number;
}

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'startup' | 'disk' | 'memory' | 'services' | 'other';
  impact: 'low' | 'medium' | 'high';
  estimated_improvement: string;
  risk_level: 'safe' | 'moderate' | 'advanced';
  auto_applicable: boolean;
  requires_restart: boolean;
  ai_confidence?: number;
  ai_generated?: boolean;
}

// Boot Speed Optimization Types
export interface BootSpeedAnalysis {
  current_boot_time_ms: number;
  optimal_boot_time_ms: number;
  improvement_potential_ms: number;
  improvement_percentage: number;
  bottlenecks: Array<{
    id: string;
    name: string;
    type: 'startup_program' | 'service' | 'driver' | 'system';
    delay_ms: number;
    impact: ImpactLevel;
    ai_recommendation?: string;
  }>;
  ai_insights: string[];
  last_analyzed: number;
}

export interface BootOptimizationAction {
  id: string;
  type: 'disable_startup' | 'delay_startup' | 'optimize_service' | 'update_driver';
  target: string;
  description: string;
  expected_improvement_ms: number;
  risk_level: RiskLevel;
  ai_confidence: number;
  auto_applicable: boolean;
}

// Smart Suggestions Types
export interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'security' | 'maintenance' | 'boot' | 'storage';
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: ImpactLevel;
  reasoning: string;
  actions: Array<{
    id: string;
    label: string;
    type: string;
    auto_applicable: boolean;
  }>;
  ai_confidence: number;
  estimated_time_saved?: string;
  estimated_space_saved?: number;
  learn_more_url?: string;
  created_at: number;
}

export interface AIAnalysisContext {
  system_metrics: SystemMetrics;
  boot_time?: BootTimeInfo;
  startup_programs?: StartupProgram[];
  recent_issues?: string[];
  user_preferences?: {
    performance_priority: 'balanced' | 'performance' | 'battery';
    auto_optimize: boolean;
  };
}

export interface AIInsight {
  type: 'warning' | 'info' | 'success' | 'tip';
  message: string;
  details?: string;
  action?: {
    label: string;
    command: string;
  };
  confidence: number;
}

export interface ApplyOptimizationParams {
  optimization_id: string;
  confirm: boolean;
}

export interface ApplyOptimizationResult {
  success: boolean;
  message: string;
  requires_restart: boolean;
  rollback_available: boolean;
}

export interface CleanTempParams {
  categories: Array<'system_temp' | 'browser_cache' | 'app_cache' | 'logs'>;
  dry_run?: boolean;
}

export interface CleanTempResult {
  success: boolean;
  space_freed_bytes: number;
  files_removed: number;
  errors: string[];
}

// AI Recommendation Types
export interface AIRecommendationParams {
  use_cloud?: boolean;
  context?: string;
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  priority: number;
  category: string;
  actions: Array<{
    type: string;
    description: string;
    auto_applicable: boolean;
  }>;
  source: 'local_ml' | 'rule_engine' | 'cloud_ai';
  confidence: number;
}

// Settings Types
export interface Settings {
  general: {
    auto_start: boolean;
    minimize_to_tray: boolean;
    check_updates: boolean;
  };
  monitoring: {
    update_interval_ms: number;
    enable_notifications: boolean;
    notification_threshold: 'low' | 'medium' | 'high';
  };
  ai: {
    enable_local_ml: boolean;
    enable_cloud_ai: boolean;
    cloud_provider?: 'openai' | 'anthropic';
    api_key_configured: boolean;
  };
  privacy: {
    collect_anonymous_stats: boolean;
    share_optimization_results: boolean;
  };
  optimization: {
    auto_apply_safe_optimizations: boolean;
    confirm_before_changes: boolean;
  };
}

export interface UpdateSettingsParams {
  settings: Partial<Settings>;
}

export interface UpdateSettingsResult {
  success: boolean;
  message: string;
}

export interface SetAPIKeyParams {
  provider: 'openai' | 'anthropic';
  api_key: string;
}

export interface SetAPIKeyResult {
  success: boolean;
  message: string;
  key_valid: boolean;
}

// Performance History Types
export interface PerformanceHistoryParams {
  metric: 'cpu' | 'memory' | 'disk' | 'boot_time';
  time_range: 'hour' | 'day' | 'week' | 'month';
  resolution?: 'minute' | 'hour' | 'day';
}

export interface PerformanceHistory {
  metric: string;
  data_points: Array<{
    timestamp: number;
    value: number;
  }>;
  average: number;
  min: number;
  max: number;
}

export interface OptimizationHistoryEntry {
  id: string;
  optimization_id: string;
  title: string;
  applied_at: number;
  status: 'active' | 'rolled_back';
  impact_measured?: {
    boot_time_improvement_ms?: number;
    memory_freed_bytes?: number;
    cpu_improvement_percent?: number;
  };
}

// Event Types
export interface MetricsUpdatedEvent {
  payload: SystemMetrics;
}

export interface OptimizationCompletedEvent {
  optimization_id: string;
  success: boolean;
  message: string;
}

export interface NotificationEvent {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  action?: {
    label: string;
    command: string;
  };
}

// Hardware Health Types
export interface DiskHealthInfo {
  device: string;
  model: string;
  serial: string;
  disk_type: 'SSD' | 'HDD' | 'NVMe' | 'Unknown';
  health_score: number;
  temperature_celsius: number | null;
  power_on_hours: number;
  total_bytes_written: number;
  rated_tbw: number | null;
  reallocated_sectors: number;
  read_error_rate: number;
  write_error_rate: number;
  predicted_remaining_days: number | null;
  smart_status: 'passed' | 'failed' | 'unknown';
  available: boolean;
  requires_admin: boolean;
}

export interface BatteryHealthInfo {
  design_capacity_mah: number;
  current_max_capacity_mah: number;
  health_percent: number;
  cycle_count: number;
  rated_cycle_count: number;
  temperature_celsius: number | null;
  is_charging: boolean;
  predicted_replacement_days: number | null;
  available: boolean;
}

export interface HealthAlert {
  component: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
}

export interface HardwareHealthData {
  disks: DiskHealthInfo[];
  battery: BatteryHealthInfo | null;
  alerts: HealthAlert[];
  last_updated: number;
  smartctl_available: boolean;
  is_laptop: boolean;
}

// UI State Types
export type ViewType = 'dashboard' | 'boot' | 'optimizations' | 'performance' | 'settings' | 'deep_sleep';
export type ViewType = 'dashboard' | 'boot' | 'optimizations' | 'performance' | 'settings' | 'hardware_health';

export interface AppState {
  currentView: ViewType;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  isMonitoring: boolean;
}

// Utility Types
export type ImpactLevel = 'low' | 'medium' | 'high';
export type RiskLevel = 'safe' | 'moderate' | 'advanced';
export type OptimizationCategory = 'startup' | 'disk' | 'memory' | 'services' | 'other';

// Helper function types
export type FormatBytes = (bytes: number) => string;
export type FormatDuration = (ms: number) => string;
export type FormatPercent = (value: number) => string;

// Focus Mode Types
export interface FocusModeSettings {
  whitelist: string[];
  blacklist: string[];
}

export interface MaintenanceConfig {
  enabled: boolean;
  schedule: string;
  clear_temp_files: boolean;
  flush_dns: boolean;
  trim_ssd: boolean;
  empty_trash: boolean;
}

export interface MaintenanceLog {
  id: string;
  timestamp: number;
  tasks_run: string[];
  status: string;
  details: string;
}

export interface FocusModeStatus {
  is_enabled: boolean;
  paused_processes_count: number;
}

// Deep Sleep Types
export interface SuspendedProcess {
  pid: number;
  name: string;
  memory_bytes: number;
  suspended_at: number;
}

export interface DeepSleepStatus {
  enabled: boolean;
  inactivity_timeout_secs: number;
  whitelist: string[];
  suspended_processes: SuspendedProcess[];
}

// Made with Bob
