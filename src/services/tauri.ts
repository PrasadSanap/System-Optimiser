import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  SystemMetrics,
  Process,
  ProcessListParams,
  BootTimeInfo,
  StartupProgram,
  ToggleStartupParams,
  ToggleResult,
  SystemAnalysis,
  OptimizationSuggestion,
  ApplyOptimizationParams,
  ApplyOptimizationResult,
  CleanTempParams,
  CleanTempResult,
  AIRecommendationParams,
  AIRecommendation,
  Settings,
  UpdateSettingsParams,
  UpdateSettingsResult,
  SetAPIKeyParams,
  SetAPIKeyResult,
  PerformanceHistoryParams,
  PerformanceHistory,
  OptimizationHistoryEntry,
  OptimizationCompletedEvent,
  NotificationEvent,
  FocusModeSettings,
  FocusModeStatus,
  DeepSleepStatus,
  HardwareHealthData,
  DiskHealthInfo,
  BatteryHealthInfo,
} from '../types';

/**
 * System Metrics API
 */
export const systemMetricsApi = {
  /**
   * Get current system metrics
   */
  async getMetrics(): Promise<SystemMetrics> {
    return invoke<SystemMetrics>('get_system_metrics');
  },

  /**
   * Get list of running processes
   */
  async getProcessList(params?: ProcessListParams): Promise<Process[]> {
    return invoke<Process[]>('get_process_list', params as Record<string, unknown> || {});
  },

  /**
   * Kill a process
   */
  async killProcess(pid: number, force: boolean = false): Promise<ToggleResult> {
    return invoke<ToggleResult>('kill_process', { pid, force });
  },

  /**
   * Toggle Focus Mode
   */
  async toggleFocusMode(enable: boolean): Promise<string> {
    return invoke<string>('toggle_focus_mode', { enable });
  },

  /**
   * Get Focus Mode Status
   */
  async getFocusModeStatus(): Promise<FocusModeStatus> {
    return invoke<FocusModeStatus>('get_focus_mode_status');
  },

  /**
   * Get Focus Mode Settings
   */
  async getFocusModeSettings(): Promise<FocusModeSettings> {
    return invoke<FocusModeSettings>('get_focus_mode_settings');
  },

  /**
   * Update Focus Mode Settings
   */
  async updateFocusModeSettings(settings: FocusModeSettings): Promise<string> {
    return invoke<string>('update_focus_mode_settings', { settings });
  },

  /**
   * Get Maintenance Config
   */
  async getMaintenanceConfig(): Promise<any> {
    return invoke<any>('get_maintenance_config');
  },

  /**
   * Update Maintenance Config
   */
  async updateMaintenanceConfig(config: any): Promise<string> {
    return invoke<string>('update_maintenance_config', { config });
  },

  /**
   * Get Maintenance Logs
   */
  async getMaintenanceLogs(): Promise<any[]> {
    return invoke<any[]>('get_maintenance_logs');
  },
};

/**
 * Boot Analysis API
 */
export const bootAnalysisApi = {
  /**
   * Get boot time information
   */
  async getBootTime(): Promise<BootTimeInfo> {
    return invoke<BootTimeInfo>('get_boot_time');
  },

  /**
   * Get startup programs
   */
  async getStartupPrograms(): Promise<StartupProgram[]> {
    return invoke<StartupProgram[]>('get_startup_programs');
  },

  /**
   * Toggle startup program
   */
  async toggleStartupProgram(params: ToggleStartupParams): Promise<ToggleResult> {
    return invoke<ToggleResult>('toggle_startup_program', params as unknown as Record<string, unknown>);
  },
};

/**
 * Optimization API
 */
export const optimizationApi = {
  /**
   * Analyze system for optimization opportunities
   */
  async analyzeSystem(includeDeepScan: boolean = false): Promise<SystemAnalysis> {
    return invoke<SystemAnalysis>('analyze_system', {
      include_deep_scan: includeDeepScan,
    });
  },

  /**
   * Get optimization suggestions
   */
  async getSuggestions(): Promise<OptimizationSuggestion[]> {
    return invoke<OptimizationSuggestion[]>('get_optimization_suggestions');
  },

  /**
   * Apply an optimization
   */
  async applyOptimization(params: ApplyOptimizationParams): Promise<ApplyOptimizationResult> {
    return invoke<ApplyOptimizationResult>('apply_optimization', params as unknown as Record<string, unknown>);
  },

  /**
   * Rollback an optimization
   */
  async rollbackOptimization(optimizationId: string): Promise<ToggleResult> {
    return invoke<ToggleResult>('rollback_optimization', {
      optimization_id: optimizationId,
    });
  },

  /**
   * Clean temporary files
   */
  async cleanTempFiles(params: CleanTempParams): Promise<CleanTempResult> {
    return invoke<CleanTempResult>('clean_temp_files', params as unknown as Record<string, unknown>);
  },
};

/**
 * AI Recommendations API
 */
export const aiApi = {
  /**
   * Get AI-powered recommendations
   */
  async getRecommendations(params?: AIRecommendationParams): Promise<AIRecommendation[]> {
    return invoke<AIRecommendation[]>('get_ai_recommendations', params as Record<string, unknown> || {});
  },

  /**
   * Train local ML model
   */
  async trainLocalModel(includeHistoricalData: boolean = true): Promise<{
    success: boolean;
    model_version: string;
    training_samples: number;
    accuracy_score?: number;
  }> {
    return invoke('train_local_model', {
      include_historical_data: includeHistoricalData,
    });
  },
};

/**
 * Settings API
 */
export const settingsApi = {
  /**
   * Get current settings
   */
  async getSettings(): Promise<Settings> {
    return invoke<Settings>('get_settings');
  },

  /**
   * Update settings
   */
  async updateSettings(params: UpdateSettingsParams): Promise<UpdateSettingsResult> {
    return invoke<UpdateSettingsResult>('update_settings', params as unknown as Record<string, unknown>);
  },

  /**
   * Set API key for cloud AI
   */
  async setApiKey(params: SetAPIKeyParams): Promise<SetAPIKeyResult> {
    return invoke<SetAPIKeyResult>('set_api_key', params as unknown as Record<string, unknown>);
  },
};

/**
 * Performance History API
 */
export const performanceApi = {
  /**
   * Get performance history
   */
  async getHistory(params: PerformanceHistoryParams): Promise<PerformanceHistory> {
    return invoke<PerformanceHistory>('get_performance_history', params as unknown as Record<string, unknown>);
  },

  /**
   * Get optimization history
   */
  async getOptimizationHistory(limit?: number): Promise<OptimizationHistoryEntry[]> {
    return invoke<OptimizationHistoryEntry[]>('get_optimization_history', {
      limit: limit || 20,
    });
  },
};

/**
 * Event Listeners
 */
export const events = {
  /**
   * Listen for metrics updates
   */
  onMetricsUpdated(callback: (metrics: SystemMetrics) => void) {
    return listen<SystemMetrics>('metrics-updated', (event) => {
      callback(event.payload);
    });
  },

  /**
   * Listen for optimization completed events
   */
  onOptimizationCompleted(callback: (event: OptimizationCompletedEvent) => void) {
    return listen<OptimizationCompletedEvent>('optimization-completed', (event) => {
      callback(event.payload);
    });
  },

  /**
   * Listen for notifications
   */
  onNotification(callback: (notification: NotificationEvent) => void) {
    return listen<NotificationEvent>('notification', (event) => {
      callback(event.payload);
    });
  },
};


/**
 * Deep Sleep App Freezer API
 */
export const deepSleepApi = {
  async getStatus(): Promise<DeepSleepStatus> {
    return invoke<DeepSleepStatus>('get_deep_sleep_status');
  },

  async updateConfig(enabled: boolean, timeoutSecs: number, whitelist: string[]): Promise<DeepSleepStatus> {
    return invoke<DeepSleepStatus>('update_deep_sleep_config', { enabled, timeoutSecs, whitelist });
  },

  async thawProcess(pid: number): Promise<DeepSleepStatus> {
    return invoke<DeepSleepStatus>('thaw_process', { pid });
  },

  async freezeProcess(pid: number, name: string, memoryBytes: number): Promise<DeepSleepStatus> {
    return invoke<DeepSleepStatus>('freeze_process', { pid, name, memoryBytes });
  },
};

/**
 * Hardware Health API
 */
export const hardwareHealthApi = {
  /**
   * Get full hardware health data (disks + battery + alerts)
   */
  async getHardwareHealth(): Promise<HardwareHealthData> {
    return invoke<HardwareHealthData>('get_hardware_health');
  },

  /**
   * Get disk health data only
   */
  async getDiskHealth(): Promise<DiskHealthInfo[]> {
    return invoke<DiskHealthInfo[]>('get_disk_health');
  },

  /**
   * Get battery health data only
   */
  async getBatteryHealth(): Promise<BatteryHealthInfo | null> {
    return invoke<BatteryHealthInfo | null>('get_battery_health');
  },
};

/**
 * Combined API export
 */
export const tauriApi = {
  system: systemMetricsApi,
  boot: bootAnalysisApi,
  optimization: optimizationApi,
  ai: aiApi,
  settings: settingsApi,
  performance: performanceApi,
  deepSleep: deepSleepApi,
  hardwareHealth: hardwareHealthApi,
  events,
};

export default tauriApi;

// Made with Bob
