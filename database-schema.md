# System Optimizer - Database Schema

## Overview

SQLite database schema for storing historical performance data, optimization history, user preferences, and AI model data.

Database file location: `~/.system-optimizer/data.db`

---

## Tables

### 1. system_metrics

Stores historical system performance metrics.

```sql
CREATE TABLE system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    cpu_usage_percent REAL NOT NULL,
    cpu_temperature REAL,
    memory_total_bytes INTEGER NOT NULL,
    memory_used_bytes INTEGER NOT NULL,
    disk_total_bytes INTEGER NOT NULL,
    disk_used_bytes INTEGER NOT NULL,
    network_bytes_sent INTEGER NOT NULL,
    network_bytes_received INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_metrics_created_at ON system_metrics(created_at);
```

**Retention Policy**: Keep last 30 days of minute-level data, aggregate older data to hourly averages.

---

### 2. boot_times

Stores boot time measurements.

```sql
CREATE TABLE boot_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boot_timestamp INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    startup_programs_count INTEGER,
    platform TEXT NOT NULL CHECK(platform IN ('windows', 'macos')),
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_boot_timestamp ON boot_times(boot_timestamp);
CREATE INDEX idx_boot_platform ON boot_times(platform);
```

---

### 3. startup_programs

Stores information about startup programs.

```sql
CREATE TABLE startup_programs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    impact TEXT CHECK(impact IN ('low', 'medium', 'high')),
    estimated_delay_ms INTEGER,
    publisher TEXT,
    platform TEXT NOT NULL CHECK(platform IN ('windows', 'macos', 'both')),
    last_seen INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_startup_enabled ON startup_programs(enabled);
CREATE INDEX idx_startup_platform ON startup_programs(platform);
CREATE INDEX idx_startup_impact ON startup_programs(impact);
```

---

### 4. processes_snapshot

Stores periodic snapshots of running processes for analysis.

```sql
CREATE TABLE processes_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_timestamp INTEGER NOT NULL,
    pid INTEGER NOT NULL,
    name TEXT NOT NULL,
    cpu_percent REAL NOT NULL,
    memory_bytes INTEGER NOT NULL,
    disk_read_bytes INTEGER NOT NULL,
    disk_write_bytes INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_process_snapshot_timestamp ON processes_snapshot(snapshot_timestamp);
CREATE INDEX idx_process_snapshot_name ON processes_snapshot(name);
```

**Retention Policy**: Keep last 7 days of process snapshots.

---

### 5. optimizations

Stores available optimization suggestions.

```sql
CREATE TABLE optimizations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('startup', 'disk', 'memory', 'services', 'other')),
    impact TEXT NOT NULL CHECK(impact IN ('low', 'medium', 'high')),
    estimated_improvement TEXT,
    risk_level TEXT NOT NULL CHECK(risk_level IN ('safe', 'moderate', 'advanced')),
    auto_applicable INTEGER NOT NULL DEFAULT 0,
    requires_restart INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL CHECK(source IN ('local_ml', 'rule_engine', 'cloud_ai')),
    ai_confidence REAL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER
);

CREATE INDEX idx_optimization_category ON optimizations(category);
CREATE INDEX idx_optimization_impact ON optimizations(impact);
CREATE INDEX idx_optimization_source ON optimizations(source);
```

---

### 6. optimization_history

Tracks applied optimizations and their results.

```sql
CREATE TABLE optimization_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    optimization_id TEXT NOT NULL,
    title TEXT NOT NULL,
    applied_at INTEGER NOT NULL,
    rolled_back_at INTEGER,
    status TEXT NOT NULL CHECK(status IN ('active', 'rolled_back')),
    rollback_data TEXT, -- JSON blob for rollback information
    impact_measured TEXT, -- JSON blob with measured improvements
    user_rating INTEGER CHECK(user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (optimization_id) REFERENCES optimizations(id)
);

CREATE INDEX idx_opt_history_optimization_id ON optimization_history(optimization_id);
CREATE INDEX idx_opt_history_applied_at ON optimization_history(applied_at);
CREATE INDEX idx_opt_history_status ON optimization_history(status);
```

---

### 7. settings

Stores user preferences and configuration.

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL CHECK(value_type IN ('string', 'number', 'boolean', 'json')),
    category TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_settings_category ON settings(category);
```

**Default Settings**:
```sql
INSERT INTO settings (key, value, value_type, category) VALUES
    ('general.auto_start', 'false', 'boolean', 'general'),
    ('general.minimize_to_tray', 'true', 'boolean', 'general'),
    ('general.check_updates', 'true', 'boolean', 'general'),
    ('monitoring.update_interval_ms', '5000', 'number', 'monitoring'),
    ('monitoring.enable_notifications', 'true', 'boolean', 'monitoring'),
    ('monitoring.notification_threshold', 'medium', 'string', 'monitoring'),
    ('ai.enable_local_ml', 'true', 'boolean', 'ai'),
    ('ai.enable_cloud_ai', 'false', 'boolean', 'ai'),
    ('ai.cloud_provider', 'openai', 'string', 'ai'),
    ('privacy.collect_anonymous_stats', 'false', 'boolean', 'privacy'),
    ('privacy.share_optimization_results', 'false', 'boolean', 'privacy'),
    ('optimization.auto_apply_safe_optimizations', 'false', 'boolean', 'optimization'),
    ('optimization.confirm_before_changes', 'true', 'boolean', 'optimization');
```

---

### 8. ai_model_metadata

Stores metadata about local ML models.

```sql
CREATE TABLE ai_model_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    model_path TEXT NOT NULL,
    training_date INTEGER,
    training_samples INTEGER,
    accuracy_score REAL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    UNIQUE(model_name, model_version)
);

CREATE INDEX idx_model_active ON ai_model_metadata(is_active);
```

---

### 9. ai_predictions

Stores AI predictions for analysis and improvement.

```sql
CREATE TABLE ai_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_version TEXT NOT NULL,
    input_data TEXT NOT NULL, -- JSON blob
    prediction TEXT NOT NULL, -- JSON blob
    confidence REAL,
    actual_outcome TEXT, -- JSON blob (filled in later for training)
    prediction_timestamp INTEGER NOT NULL,
    outcome_timestamp INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_prediction_timestamp ON ai_predictions(prediction_timestamp);
CREATE INDEX idx_prediction_model ON ai_predictions(model_version);
```

---

### 10. notifications

Stores notification history.

```sql
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'error', 'success')),
    action_command TEXT,
    action_label TEXT,
    shown_at INTEGER NOT NULL,
    dismissed_at INTEGER,
    action_taken INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_notification_shown_at ON notifications(shown_at);
CREATE INDEX idx_notification_severity ON notifications(severity);
```

---

### 11. system_info

Stores system information for context.

```sql
CREATE TABLE system_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    platform_version TEXT NOT NULL,
    cpu_model TEXT NOT NULL,
    cpu_cores INTEGER NOT NULL,
    total_memory_bytes INTEGER NOT NULL,
    total_disk_bytes INTEGER NOT NULL,
    hostname TEXT,
    recorded_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_sysinfo_recorded_at ON system_info(recorded_at);
```

---

### 12. api_usage

Tracks cloud AI API usage for rate limiting and cost monitoring.

```sql
CREATE TABLE api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic')),
    endpoint TEXT NOT NULL,
    tokens_used INTEGER,
    cost_usd REAL,
    request_timestamp INTEGER NOT NULL,
    response_time_ms INTEGER,
    success INTEGER NOT NULL,
    error_message TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_api_usage_timestamp ON api_usage(request_timestamp);
CREATE INDEX idx_api_usage_provider ON api_usage(provider);
```

---

## Views

### v_recent_metrics

Convenient view for recent system metrics.

```sql
CREATE VIEW v_recent_metrics AS
SELECT 
    timestamp,
    cpu_usage_percent,
    cpu_temperature,
    ROUND(memory_used_bytes * 100.0 / memory_total_bytes, 2) as memory_usage_percent,
    ROUND(disk_used_bytes * 100.0 / disk_total_bytes, 2) as disk_usage_percent,
    network_bytes_sent,
    network_bytes_received
FROM system_metrics
WHERE timestamp >= strftime('%s', 'now', '-24 hours')
ORDER BY timestamp DESC;
```

---

### v_active_optimizations

View of currently active optimizations.

```sql
CREATE VIEW v_active_optimizations AS
SELECT 
    oh.id,
    oh.optimization_id,
    oh.title,
    oh.applied_at,
    oh.impact_measured,
    oh.user_rating,
    o.category,
    o.impact
FROM optimization_history oh
JOIN optimizations o ON oh.optimization_id = o.id
WHERE oh.status = 'active'
ORDER BY oh.applied_at DESC;
```

---

### v_boot_time_trends

View for boot time analysis.

```sql
CREATE VIEW v_boot_time_trends AS
SELECT 
    boot_timestamp,
    duration_ms,
    startup_programs_count,
    platform,
    AVG(duration_ms) OVER (
        ORDER BY boot_timestamp 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7,
    created_at
FROM boot_times
ORDER BY boot_timestamp DESC;
```

---

## Triggers

### Update timestamp on settings change

```sql
CREATE TRIGGER update_settings_timestamp 
AFTER UPDATE ON settings
BEGIN
    UPDATE settings 
    SET updated_at = strftime('%s', 'now')
    WHERE key = NEW.key;
END;
```

---

### Update timestamp on startup_programs change

```sql
CREATE TRIGGER update_startup_programs_timestamp 
AFTER UPDATE ON startup_programs
BEGIN
    UPDATE startup_programs 
    SET updated_at = strftime('%s', 'now')
    WHERE id = NEW.id;
END;
```

---

### Deactivate old AI models when new one is activated

```sql
CREATE TRIGGER deactivate_old_models
AFTER UPDATE OF is_active ON ai_model_metadata
WHEN NEW.is_active = 1
BEGIN
    UPDATE ai_model_metadata
    SET is_active = 0
    WHERE model_name = NEW.model_name 
    AND id != NEW.id;
END;
```

---

## Data Retention Policies

Implemented via scheduled cleanup tasks:

```sql
-- Clean old metrics (keep 30 days)
DELETE FROM system_metrics 
WHERE created_at < strftime('%s', 'now', '-30 days');

-- Clean old process snapshots (keep 7 days)
DELETE FROM processes_snapshot 
WHERE created_at < strftime('%s', 'now', '-7 days');

-- Clean old notifications (keep 90 days)
DELETE FROM notifications 
WHERE created_at < strftime('%s', 'now', '-90 days');

-- Clean expired optimizations
DELETE FROM optimizations 
WHERE expires_at IS NOT NULL 
AND expires_at < strftime('%s', 'now');

-- Clean old AI predictions (keep 180 days)
DELETE FROM ai_predictions 
WHERE created_at < strftime('%s', 'now', '-180 days');

-- Clean old API usage logs (keep 90 days)
DELETE FROM api_usage 
WHERE created_at < strftime('%s', 'now', '-90 days');
```

---

## Aggregation Queries

### Hourly metrics aggregation

For older data, aggregate to hourly averages:

```sql
-- Create aggregated metrics table
CREATE TABLE system_metrics_hourly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hour_timestamp INTEGER NOT NULL,
    avg_cpu_usage_percent REAL NOT NULL,
    avg_cpu_temperature REAL,
    avg_memory_usage_percent REAL NOT NULL,
    avg_disk_usage_percent REAL NOT NULL,
    total_network_bytes_sent INTEGER NOT NULL,
    total_network_bytes_received INTEGER NOT NULL,
    sample_count INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX idx_metrics_hourly_timestamp 
ON system_metrics_hourly(hour_timestamp);

-- Aggregation query
INSERT INTO system_metrics_hourly (
    hour_timestamp,
    avg_cpu_usage_percent,
    avg_cpu_temperature,
    avg_memory_usage_percent,
    avg_disk_usage_percent,
    total_network_bytes_sent,
    total_network_bytes_received,
    sample_count
)
SELECT 
    strftime('%s', datetime(timestamp, 'unixepoch', 'start of hour')) as hour_timestamp,
    AVG(cpu_usage_percent) as avg_cpu_usage_percent,
    AVG(cpu_temperature) as avg_cpu_temperature,
    AVG(memory_used_bytes * 100.0 / memory_total_bytes) as avg_memory_usage_percent,
    AVG(disk_used_bytes * 100.0 / disk_total_bytes) as avg_disk_usage_percent,
    SUM(network_bytes_sent) as total_network_bytes_sent,
    SUM(network_bytes_received) as total_network_bytes_received,
    COUNT(*) as sample_count
FROM system_metrics
WHERE timestamp >= strftime('%s', 'now', '-31 days')
AND timestamp < strftime('%s', 'now', '-30 days')
GROUP BY hour_timestamp;
```

---

## Backup and Migration

### Backup Strategy

```sql
-- Export critical data for backup
.mode csv
.output backup_settings.csv
SELECT * FROM settings;
.output backup_optimization_history.csv
SELECT * FROM optimization_history;
.output backup_startup_programs.csv
SELECT * FROM startup_programs;
.output stdout
```

### Migration Scripts

Version tracking table:

```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    description TEXT
);

INSERT INTO schema_version (version, description) 
VALUES (1, 'Initial schema');
```

---

## Performance Optimization

### Vacuum Schedule

Run VACUUM periodically to reclaim space:

```sql
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA incremental_vacuum(1000);
```

### Analyze Statistics

Update query planner statistics:

```sql
ANALYZE;
```

### Connection Settings

Recommended PRAGMA settings for the application:

```sql
PRAGMA journal_mode = WAL;           -- Write-Ahead Logging for better concurrency
PRAGMA synchronous = NORMAL;         -- Balance between safety and performance
PRAGMA cache_size = -64000;          -- 64MB cache
PRAGMA temp_store = MEMORY;          -- Store temp tables in memory
PRAGMA mmap_size = 268435456;        -- 256MB memory-mapped I/O
PRAGMA page_size = 4096;             -- 4KB page size
```

---

## Security Considerations

1. **API Keys**: Never store in database; use system keychain
2. **Encryption**: Consider encrypting sensitive fields
3. **Permissions**: Database file should have restricted permissions (600)
4. **SQL Injection**: Always use parameterized queries
5. **Backup**: Regular automated backups to secure location

---

## Testing Data

Sample data for development and testing:

```sql
-- Insert sample metrics
INSERT INTO system_metrics (timestamp, cpu_usage_percent, memory_total_bytes, memory_used_bytes, disk_total_bytes, disk_used_bytes, network_bytes_sent, network_bytes_received)
VALUES 
    (strftime('%s', 'now', '-1 hour'), 45.2, 17179869184, 8589934592, 512110190592, 256055095296, 1048576, 2097152),
    (strftime('%s', 'now', '-30 minutes'), 52.8, 17179869184, 9663676416, 512110190592, 256055095296, 2097152, 4194304);

-- Insert sample boot times
INSERT INTO boot_times (boot_timestamp, duration_ms, startup_programs_count, platform)
VALUES 
    (strftime('%s', 'now', '-1 day'), 45000, 12, 'macos'),
    (strftime('%s', 'now'), 38000, 10, 'macos');
```

---

## Database Size Estimates

Expected database sizes:

- **Minimal usage** (1 week): ~5-10 MB
- **Normal usage** (30 days): ~50-100 MB
- **Heavy usage** (30 days with all features): ~200-300 MB

With proper retention policies, database should stabilize around 100-200 MB.