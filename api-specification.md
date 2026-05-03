# System Optimizer - API Specification

## Overview

This document defines the Tauri commands (IPC interface) between the React frontend and Rust backend for the System Optimization Dashboard.

## Command Categories

1. System Metrics
2. Boot Analysis
3. Process Management
4. Optimization Engine
5. AI Recommendations
6. Settings & Configuration
7. Historical Data

---

## 1. System Metrics Commands

### `get_system_metrics`

Get current system performance metrics.

**Parameters**: None

**Returns**:
```typescript
interface SystemMetrics {
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
```

**Example**:
```typescript
const metrics = await invoke<SystemMetrics>('get_system_metrics');
```

---

### `get_process_list`

Get list of running processes with resource usage.

**Parameters**:
```typescript
interface ProcessListParams {
  sort_by?: 'cpu' | 'memory' | 'name';
  limit?: number;
}
```

**Returns**:
```typescript
interface Process {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_bytes: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
  status: 'running' | 'sleeping' | 'stopped';
  start_time: number;
}

type ProcessList = Process[];
```

**Example**:
```typescript
const processes = await invoke<ProcessList>('get_process_list', {
  sort_by: 'cpu',
  limit: 50
});
```

---

## 2. Boot Analysis Commands

### `get_boot_time`

Get current and historical boot time information.

**Parameters**: None

**Returns**:
```typescript
interface BootTimeInfo {
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
```

**Example**:
```typescript
const bootInfo = await invoke<BootTimeInfo>('get_boot_time');
```

---

### `get_startup_programs`

Get list of programs that run at system startup.

**Parameters**: None

**Returns**:
```typescript
interface StartupProgram {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  impact: 'low' | 'medium' | 'high';
  estimated_delay_ms: number;
  publisher?: string;
  platform: 'windows' | 'macos' | 'both';
}

type StartupProgramList = StartupProgram[];
```

**Example**:
```typescript
const startupPrograms = await invoke<StartupProgramList>('get_startup_programs');
```

---

### `toggle_startup_program`

Enable or disable a startup program.

**Parameters**:
```typescript
interface ToggleStartupParams {
  program_id: string;
  enabled: boolean;
}
```

**Returns**:
```typescript
interface ToggleResult {
  success: boolean;
  message: string;
}
```

**Example**:
```typescript
const result = await invoke<ToggleResult>('toggle_startup_program', {
  program_id: 'com.example.app',
  enabled: false
});
```

---

## 3. Process Management Commands

### `kill_process`

Terminate a running process.

**Parameters**:
```typescript
interface KillProcessParams {
  pid: number;
  force?: boolean;
}
```

**Returns**:
```typescript
interface KillProcessResult {
  success: boolean;
  message: string;
}
```

**Example**:
```typescript
const result = await invoke<KillProcessResult>('kill_process', {
  pid: 1234,
  force: false
});
```

---

## 4. Optimization Engine Commands

### `analyze_system`

Run comprehensive system analysis to identify optimization opportunities.

**Parameters**:
```typescript
interface AnalyzeParams {
  include_deep_scan?: boolean;
  categories?: Array<'startup' | 'disk' | 'memory' | 'services'>;
}
```

**Returns**:
```typescript
interface SystemAnalysis {
  overall_score: number; // 0-100
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
```

**Example**:
```typescript
const analysis = await invoke<SystemAnalysis>('analyze_system', {
  include_deep_scan: true,
  categories: ['startup', 'disk']
});
```

---

### `get_optimization_suggestions`

Get list of optimization suggestions based on system analysis.

**Parameters**: None

**Returns**:
```typescript
interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'startup' | 'disk' | 'memory' | 'services' | 'other';
  impact: 'low' | 'medium' | 'high';
  estimated_improvement: string;
  risk_level: 'safe' | 'moderate' | 'advanced';
  auto_applicable: boolean;
  requires_restart: boolean;
  ai_confidence?: number; // 0-1
}

type OptimizationSuggestions = OptimizationSuggestion[];
```

**Example**:
```typescript
const suggestions = await invoke<OptimizationSuggestions>('get_optimization_suggestions');
```

---

### `apply_optimization`

Apply a specific optimization.

**Parameters**:
```typescript
interface ApplyOptimizationParams {
  optimization_id: string;
  confirm: boolean;
}
```

**Returns**:
```typescript
interface ApplyOptimizationResult {
  success: boolean;
  message: string;
  requires_restart: boolean;
  rollback_available: boolean;
}
```

**Example**:
```typescript
const result = await invoke<ApplyOptimizationResult>('apply_optimization', {
  optimization_id: 'disable-startup-app-123',
  confirm: true
});
```

---

### `rollback_optimization`

Rollback a previously applied optimization.

**Parameters**:
```typescript
interface RollbackParams {
  optimization_id: string;
}
```

**Returns**:
```typescript
interface RollbackResult {
  success: boolean;
  message: string;
}
```

**Example**:
```typescript
const result = await invoke<RollbackResult>('rollback_optimization', {
  optimization_id: 'disable-startup-app-123'
});
```

---

### `clean_temp_files`

Clean temporary files and caches.

**Parameters**:
```typescript
interface CleanTempParams {
  categories: Array<'system_temp' | 'browser_cache' | 'app_cache' | 'logs'>;
  dry_run?: boolean;
}
```

**Returns**:
```typescript
interface CleanTempResult {
  success: boolean;
  space_freed_bytes: number;
  files_removed: number;
  errors: string[];
}
```

**Example**:
```typescript
const result = await invoke<CleanTempResult>('clean_temp_files', {
  categories: ['system_temp', 'browser_cache'],
  dry_run: false
});
```

---

## 5. AI Recommendations Commands

### `get_ai_recommendations`

Get AI-powered optimization recommendations.

**Parameters**:
```typescript
interface AIRecommendationParams {
  use_cloud?: boolean;
  context?: string; // User's specific concern
}
```

**Returns**:
```typescript
interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  priority: number; // 1-10
  category: string;
  actions: Array<{
    type: string;
    description: string;
    auto_applicable: boolean;
  }>;
  source: 'local_ml' | 'rule_engine' | 'cloud_ai';
  confidence: number; // 0-1
}

type AIRecommendations = AIRecommendation[];
```

**Example**:
```typescript
const recommendations = await invoke<AIRecommendations>('get_ai_recommendations', {
  use_cloud: true,
  context: 'My computer is slow to start'
});
```

---

### `train_local_model`

Trigger local ML model training with user's system data.

**Parameters**:
```typescript
interface TrainModelParams {
  include_historical_data: boolean;
}
```

**Returns**:
```typescript
interface TrainModelResult {
  success: boolean;
  model_version: string;
  training_samples: number;
  accuracy_score?: number;
}
```

**Example**:
```typescript
const result = await invoke<TrainModelResult>('train_local_model', {
  include_historical_data: true
});
```

---

## 6. Settings & Configuration Commands

### `get_settings`

Get current application settings.

**Parameters**: None

**Returns**:
```typescript
interface Settings {
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
```

**Example**:
```typescript
const settings = await invoke<Settings>('get_settings');
```

---

### `update_settings`

Update application settings.

**Parameters**:
```typescript
interface UpdateSettingsParams {
  settings: Partial<Settings>;
}
```

**Returns**:
```typescript
interface UpdateSettingsResult {
  success: boolean;
  message: string;
}
```

**Example**:
```typescript
const result = await invoke<UpdateSettingsResult>('update_settings', {
  settings: {
    ai: {
      enable_cloud_ai: true,
      cloud_provider: 'openai'
    }
  }
});
```

---

### `set_api_key`

Set API key for cloud AI provider.

**Parameters**:
```typescript
interface SetAPIKeyParams {
  provider: 'openai' | 'anthropic';
  api_key: string;
}
```

**Returns**:
```typescript
interface SetAPIKeyResult {
  success: boolean;
  message: string;
  key_valid: boolean;
}
```

**Example**:
```typescript
const result = await invoke<SetAPIKeyResult>('set_api_key', {
  provider: 'openai',
  api_key: 'sk-...'
});
```

---

## 7. Historical Data Commands

### `get_performance_history`

Get historical performance data for charts.

**Parameters**:
```typescript
interface PerformanceHistoryParams {
  metric: 'cpu' | 'memory' | 'disk' | 'boot_time';
  time_range: 'hour' | 'day' | 'week' | 'month';
  resolution?: 'minute' | 'hour' | 'day';
}
```

**Returns**:
```typescript
interface PerformanceHistory {
  metric: string;
  data_points: Array<{
    timestamp: number;
    value: number;
  }>;
  average: number;
  min: number;
  max: number;
}
```

**Example**:
```typescript
const history = await invoke<PerformanceHistory>('get_performance_history', {
  metric: 'cpu',
  time_range: 'day',
  resolution: 'hour'
});
```

---

### `get_optimization_history`

Get history of applied optimizations.

**Parameters**:
```typescript
interface OptimizationHistoryParams {
  limit?: number;
  category?: string;
}
```

**Returns**:
```typescript
interface OptimizationHistoryEntry {
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

type OptimizationHistory = OptimizationHistoryEntry[];
```

**Example**:
```typescript
const history = await invoke<OptimizationHistory>('get_optimization_history', {
  limit: 20
});
```

---

## Events (Backend → Frontend)

The backend can emit events that the frontend listens to:

### `metrics-updated`

Emitted when system metrics are updated (based on polling interval).

**Payload**: `SystemMetrics`

**Example**:
```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<SystemMetrics>('metrics-updated', (event) => {
  console.log('New metrics:', event.payload);
});
```

---

### `optimization-completed`

Emitted when an optimization is completed.

**Payload**:
```typescript
interface OptimizationCompletedEvent {
  optimization_id: string;
  success: boolean;
  message: string;
}
```

---

### `notification`

Emitted when the system wants to show a notification.

**Payload**:
```typescript
interface NotificationEvent {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  action?: {
    label: string;
    command: string;
  };
}
```

---

## Error Handling

All commands follow a consistent error handling pattern:

```typescript
try {
  const result = await invoke<ResultType>('command_name', params);
  // Handle success
} catch (error) {
  // Error format:
  interface TauriError {
    message: string;
    code?: string;
  }
  console.error('Command failed:', error);
}
```

Common error codes:
- `PERMISSION_DENIED`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `INVALID_PARAMS`: Invalid parameters
- `SYSTEM_ERROR`: System-level error
- `AI_ERROR`: AI service error

---

## Rate Limiting

Some commands have rate limits to prevent abuse:

- `get_system_metrics`: Max 10 calls/second
- `analyze_system`: Max 1 call/minute
- `get_ai_recommendations` (cloud): Max 10 calls/hour

---

## Security Considerations

1. **API Keys**: Stored encrypted in system keychain
2. **Permissions**: Require user confirmation for destructive actions
3. **Validation**: All inputs validated on Rust side
4. **Sandboxing**: Tauri security features enabled
5. **HTTPS**: All cloud API calls use HTTPS

---

## Testing

Each command should have:
1. Unit tests in Rust
2. Integration tests with mock data
3. Frontend integration tests
4. Cross-platform compatibility tests

Example test structure:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_system_metrics() {
        let metrics = get_system_metrics();
        assert!(metrics.cpu.usage_percent >= 0.0);
        assert!(metrics.cpu.usage_percent <= 100.0);
    }
}
```

---

## Versioning

API version: `1.0.0`

Breaking changes will increment major version. The frontend should check API compatibility on startup.