import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import tauriApi from '../services/tauri';
import { formatBytes } from '../utils/format';
import type {
  HardwareHealthData,
  DiskHealthInfo,
  BatteryHealthInfo,
  HealthAlert,
} from '../types';

// ── Main Component ───────────────────────────────────────────────────────────

export function HardwareHealth() {
  const { hardwareHealth, setHardwareHealth } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setIsLoading(true);
      const data = await tauriApi.hardwareHealth.getHardwareHealth();
      setHardwareHealth(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch hardware health:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch hardware health data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Refresh every 60 seconds (hardware health changes slowly)
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !hardwareHealth) {
    return (
      <div className="hw-health-loading">
        <div className="hw-health-loading-spinner" />
        <p>Scanning hardware health...</p>
        <p className="hw-health-loading-sub">Reading S.M.A.R.T. data and battery sensors</p>
      </div>
    );
  }

  if (error && !hardwareHealth) {
    return (
      <div className="hw-health-error">
        <span className="hw-health-error-icon">⚠️</span>
        <h3>Unable to Read Hardware Health</h3>
        <p>{error}</p>
        <button onClick={fetchHealth} className="hw-health-retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!hardwareHealth) return null;

  return (
    <div className="hw-health-container animate-fade-in">
      {/* Alert Banner */}
      {hardwareHealth.alerts.length > 0 && (
        <AlertBanner alerts={hardwareHealth.alerts} />
      )}

      {/* Hero Section — Overall Health */}
      <OverallHealthHero data={hardwareHealth} />

      {/* Main Grid */}
      <div className={`hw-health-grid ${!hardwareHealth.is_laptop ? 'hw-health-grid-full' : ''}`}>
        {/* Disk Health */}
        <div className="hw-health-section">
          <h3 className="hw-health-section-title">
            <span className="hw-health-section-icon">💿</span>
            Disk Health
          </h3>
          {!hardwareHealth.smartctl_available ? (
            <SmartctlMissing />
          ) : (
            hardwareHealth.disks.map((disk, i) => (
              <DiskHealthCard key={`${disk.device}-${i}`} disk={disk} />
            ))
          )}
        </div>

        {/* Battery Health (laptop only) */}
        {hardwareHealth.is_laptop && hardwareHealth.battery && (
          <div className="hw-health-section">
            <h3 className="hw-health-section-title">
              <span className="hw-health-section-icon">🔋</span>
              Battery Health
            </h3>
            <BatteryHealthCard battery={hardwareHealth.battery} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({ alerts }: { alerts: HealthAlert[] }) {
  const criticals = alerts.filter((a) => a.severity === 'critical');
  const warnings = alerts.filter((a) => a.severity === 'warning');
  const [expanded, setExpanded] = useState(false);

  const topAlert = criticals[0] || warnings[0] || alerts[0];
  const isCritical = topAlert.severity === 'critical';

  return (
    <div className={`hw-alert-banner ${isCritical ? 'hw-alert-critical' : 'hw-alert-warning'}`}>
      <div className="hw-alert-banner-main" onClick={() => setExpanded(!expanded)}>
        <span className="hw-alert-icon">{isCritical ? '🚨' : '⚠️'}</span>
        <div className="hw-alert-content">
          <strong>{topAlert.component}</strong>
          <span>{topAlert.message}</span>
        </div>
        {alerts.length > 1 && (
          <span className="hw-alert-badge">
            +{alerts.length - 1} more
          </span>
        )}
        <span className={`hw-alert-chevron ${expanded ? 'hw-alert-chevron-open' : ''}`}>▾</span>
      </div>
      {expanded && (
        <div className="hw-alert-expanded">
          {alerts.slice(1).map((alert, i) => (
            <div key={i} className={`hw-alert-item hw-alert-item-${alert.severity}`}>
              <span>{alert.severity === 'critical' ? '🚨' : '⚠️'}</span>
              <strong>{alert.component}:</strong>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overall Health Hero ──────────────────────────────────────────────────────

function OverallHealthHero({ data }: { data: HardwareHealthData }) {
  const overallScore = useMemo(() => {
    const scores: number[] = [];
    data.disks.forEach((d) => {
      if (d.available) scores.push(d.health_score);
    });
    if (data.battery?.available) {
      scores.push(data.battery.health_percent);
    }
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [data]);

  const scoreColor = getHealthColor(overallScore ?? 100);
  const statusLabel = getHealthLabel(overallScore ?? 100);

  return (
    <div className="hw-hero glass-card">
      <div className="hw-hero-left">
        <h2 className="hw-hero-title">Hardware Health</h2>
        <p className="hw-hero-subtitle">
          Predictive monitoring of your system's physical components
        </p>
        <div className="hw-hero-badges">
          <span className="hw-hero-badge">
            💿 {data.disks.filter((d) => d.available).length} Drive{data.disks.filter((d) => d.available).length !== 1 ? 's' : ''}
          </span>
          {data.is_laptop && (
            <span className="hw-hero-badge">
              🔋 Battery {data.battery?.is_charging ? '(Charging)' : ''}
            </span>
          )}
          {data.alerts.length > 0 && (
            <span className="hw-hero-badge hw-hero-badge-alert">
              {data.alerts.filter((a) => a.severity === 'critical').length > 0 ? '🚨' : '⚠️'}{' '}
              {data.alerts.length} Alert{data.alerts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="hw-hero-right">
        {overallScore !== null ? (
          <HealthGauge score={overallScore} color={scoreColor} label={statusLabel} size={160} />
        ) : (
          <div className="hw-hero-no-data">
            <span>N/A</span>
            <span className="hw-hero-no-data-sub">No data available</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Health Gauge (SVG Circular Meter) ────────────────────────────────────────

function HealthGauge({
  score,
  color,
  label,
  size = 120,
  strokeWidth = 10,
}: {
  score: number;
  color: string;
  label: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="hw-gauge" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="hw-gauge-svg">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="hw-gauge-track"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="hw-gauge-fill"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="hw-gauge-content">
        <span className="hw-gauge-value" style={{ color }}>{score}%</span>
        <span className="hw-gauge-label">{label}</span>
      </div>
    </div>
  );
}

// ── Disk Health Card ─────────────────────────────────────────────────────────

function DiskHealthCard({ disk }: { disk: DiskHealthInfo }) {
  if (!disk.available && disk.requires_admin) {
    return (
      <div className="hw-card glass-card hw-card-dimmed">
        <div className="hw-card-header">
          <span className="hw-card-icon">🔒</span>
          <div>
            <h4 className="hw-card-title">{disk.device}</h4>
            <span className="hw-card-subtitle">Requires elevated permissions</span>
          </div>
        </div>
        <div className="hw-card-admin-notice">
          <p>Run System Optimizer with administrator privileges to read full S.M.A.R.T. data for this drive.</p>
        </div>
      </div>
    );
  }

  if (!disk.available) {
    return (
      <div className="hw-card glass-card hw-card-dimmed">
        <div className="hw-card-header">
          <span className="hw-card-icon">❓</span>
          <div>
            <h4 className="hw-card-title">{disk.device}</h4>
            <span className="hw-card-subtitle">Data unavailable</span>
          </div>
        </div>
      </div>
    );
  }

  const scoreColor = getHealthColor(disk.health_score);
  const scoreLabel = getHealthLabel(disk.health_score);

  return (
    <div className="hw-card glass-card">
      <div className="hw-card-header">
        <div className="hw-card-header-left">
          <span className="hw-card-icon">
            {disk.disk_type === 'NVMe' ? '⚡' : disk.disk_type === 'SSD' ? '💾' : '💿'}
          </span>
          <div>
            <h4 className="hw-card-title">{disk.model || disk.device}</h4>
            <span className="hw-card-subtitle">
              {disk.disk_type} • {disk.device}
              {disk.serial && ` • S/N: ${disk.serial.slice(-6)}`}
            </span>
          </div>
        </div>
        <HealthGauge score={disk.health_score} color={scoreColor} label={scoreLabel} size={80} strokeWidth={6} />
      </div>

      {/* S.M.A.R.T. Status */}
      <div className="hw-card-status-row">
        <span className={`hw-smart-badge hw-smart-badge-${disk.smart_status}`}>
          {disk.smart_status === 'passed' ? '✓ S.M.A.R.T. Passed' : disk.smart_status === 'failed' ? '✗ S.M.A.R.T. Failed' : '? Unknown'}
        </span>
        {disk.requires_admin && (
          <span className="hw-admin-badge">⚡ Partial data (no admin)</span>
        )}
      </div>

      {/* Attributes Grid */}
      <div className="hw-attr-grid">
        <AttributeTile
          icon="🌡️"
          label="Temperature"
          value={disk.temperature_celsius !== null ? `${disk.temperature_celsius}°C` : 'N/A'}
          status={disk.temperature_celsius !== null ? getTempStatus(disk.temperature_celsius) : 'neutral'}
        />
        <AttributeTile
          icon="⏱️"
          label="Power-On Hours"
          value={formatPowerOnHours(disk.power_on_hours)}
          status="neutral"
        />
        <AttributeTile
          icon="📝"
          label="Data Written"
          value={disk.total_bytes_written > 0 ? formatBytes(disk.total_bytes_written) : 'N/A'}
          status="neutral"
        />
        <AttributeTile
          icon="🔧"
          label="Reallocated Sectors"
          value={String(disk.reallocated_sectors)}
          status={disk.reallocated_sectors > 0 ? (disk.reallocated_sectors > 100 ? 'critical' : 'warning') : 'good'}
        />
      </div>

      {/* Predicted Lifespan */}
      {disk.predicted_remaining_days !== null && (
        <LifespanBar
          remainingDays={disk.predicted_remaining_days}
          healthScore={disk.health_score}
          component="Drive"
        />
      )}
    </div>
  );
}

// ── Battery Health Card ──────────────────────────────────────────────────────

function BatteryHealthCard({ battery }: { battery: BatteryHealthInfo }) {
  if (!battery.available) {
    return (
      <div className="hw-card glass-card hw-card-dimmed">
        <div className="hw-card-header">
          <span className="hw-card-icon">🔋</span>
          <div>
            <h4 className="hw-card-title">Battery</h4>
            <span className="hw-card-subtitle">Data unavailable</span>
          </div>
        </div>
      </div>
    );
  }

  const scoreColor = getHealthColor(battery.health_percent);
  const scoreLabel = getHealthLabel(battery.health_percent);
  const capacityLost = battery.design_capacity_mah - battery.current_max_capacity_mah;
  const cycleProgress = (battery.cycle_count / battery.rated_cycle_count) * 100;

  return (
    <div className="hw-card glass-card">
      <div className="hw-card-header">
        <div className="hw-card-header-left">
          <BatteryIcon healthPercent={battery.health_percent} isCharging={battery.is_charging} />
          <div>
            <h4 className="hw-card-title">Battery</h4>
            <span className="hw-card-subtitle">
              {battery.is_charging ? '⚡ Charging' : 'On Battery'} • {battery.cycle_count} cycles
            </span>
          </div>
        </div>
        <HealthGauge score={Math.round(battery.health_percent)} color={scoreColor} label={scoreLabel} size={80} strokeWidth={6} />
      </div>

      {/* Capacity Comparison */}
      <div className="hw-battery-capacity">
        <div className="hw-battery-capacity-header">
          <span>Capacity</span>
          <span>{battery.current_max_capacity_mah} / {battery.design_capacity_mah} mAh</span>
        </div>
        <div className="hw-battery-bar-track">
          <div
            className="hw-battery-bar-design"
            style={{ width: '100%' }}
          />
          <div
            className="hw-battery-bar-current"
            style={{
              width: `${(battery.current_max_capacity_mah / battery.design_capacity_mah) * 100}%`,
              backgroundColor: scoreColor,
            }}
          />
        </div>
        <div className="hw-battery-capacity-footer">
          <span className="hw-battery-capacity-lost">
            -{capacityLost} mAh lost ({(100 - battery.health_percent).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Attributes Grid */}
      <div className="hw-attr-grid">
        <AttributeTile
          icon="🔄"
          label="Charge Cycles"
          value={`${battery.cycle_count} / ${battery.rated_cycle_count}`}
          status={cycleProgress > 80 ? 'warning' : cycleProgress > 95 ? 'critical' : 'good'}
        />
        <AttributeTile
          icon="🌡️"
          label="Temperature"
          value={battery.temperature_celsius !== null ? `${battery.temperature_celsius.toFixed(1)}°C` : 'N/A'}
          status={battery.temperature_celsius !== null ? getBatteryTempStatus(battery.temperature_celsius) : 'neutral'}
        />
      </div>

      {/* Cycle Progress Ring */}
      <div className="hw-battery-cycle-section">
        <div className="hw-battery-cycle-ring-container">
          <CycleProgressRing current={battery.cycle_count} max={battery.rated_cycle_count} />
        </div>
        <div className="hw-battery-cycle-info">
          <span className="hw-battery-cycle-title">Cycle Usage</span>
          <span className="hw-battery-cycle-desc">
            {battery.rated_cycle_count - battery.cycle_count} cycles remaining of {battery.rated_cycle_count} rated
          </span>
        </div>
      </div>

      {/* Predicted Lifespan */}
      {battery.predicted_replacement_days !== null && (
        <LifespanBar
          remainingDays={battery.predicted_replacement_days}
          healthScore={battery.health_percent}
          component="Battery"
        />
      )}
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function AttributeTile({
  icon,
  label,
  value,
  status,
}: {
  icon: string;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}) {
  return (
    <div className={`hw-attr-tile hw-attr-${status}`}>
      <span className="hw-attr-icon">{icon}</span>
      <span className="hw-attr-value">{value}</span>
      <span className="hw-attr-label">{label}</span>
    </div>
  );
}

function LifespanBar({
  remainingDays,
  healthScore,
  component,
}: {
  remainingDays: number;
  healthScore: number;
  component: string;
}) {
  const color = getHealthColor(healthScore);
  const timeStr = formatRemainingTime(remainingDays);
  const urgency =
    remainingDays < 30 ? 'critical' : remainingDays < 180 ? 'warning' : 'ok';

  return (
    <div className={`hw-lifespan hw-lifespan-${urgency}`}>
      <div className="hw-lifespan-header">
        <span className="hw-lifespan-icon">
          {urgency === 'critical' ? '🚨' : urgency === 'warning' ? '⏰' : '✨'}
        </span>
        <span className="hw-lifespan-title">Predicted {component} Lifespan</span>
      </div>
      <div className="hw-lifespan-bar-track">
        <div
          className="hw-lifespan-bar-fill"
          style={{
            width: `${Math.min(healthScore, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="hw-lifespan-footer">
        <span className="hw-lifespan-time">{timeStr}</span>
        {urgency === 'critical' && (
          <span className="hw-lifespan-action">Replace soon!</span>
        )}
        {urgency === 'warning' && (
          <span className="hw-lifespan-action">Plan replacement</span>
        )}
      </div>
    </div>
  );
}

function BatteryIcon({
  healthPercent,
  isCharging,
}: {
  healthPercent: number;
  isCharging: boolean;
}) {
  const fillColor = getHealthColor(healthPercent);
  const fillHeight = Math.max(healthPercent, 5);

  return (
    <div className="hw-battery-icon-wrapper">
      <svg viewBox="0 0 32 48" width="32" height="48" className="hw-battery-icon-svg">
        {/* Battery cap */}
        <rect x="10" y="0" width="12" height="4" rx="1" fill="currentColor" opacity="0.4" />
        {/* Battery body */}
        <rect x="4" y="4" width="24" height="40" rx="3" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        {/* Fill level */}
        <rect
          x="6"
          y={6 + (36 * (1 - fillHeight / 100))}
          width="20"
          height={36 * (fillHeight / 100)}
          rx="1"
          fill={fillColor}
          className="hw-battery-fill-anim"
        />
        {/* Charging bolt */}
        {isCharging && (
          <path
            d="M18 14 L14 24 L18 24 L14 36"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hw-charging-bolt"
          />
        )}
      </svg>
    </div>
  );
}

function CycleProgressRing({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const size = 64;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / max, 1);
  const dashOffset = circumference * (1 - progress);
  const color = getHealthColor(100 - progress * 100);

  return (
    <div className="hw-cycle-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="hw-gauge-track"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="hw-gauge-fill"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="hw-cycle-ring-text">
        <span>{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
}

function SmartctlMissing() {
  return (
    <div className="hw-card glass-card hw-smartctl-missing">
      <div className="hw-smartctl-missing-icon">🔍</div>
      <h4>S.M.A.R.T. Data Unavailable</h4>
      <p>
        <code>smartmontools</code> is required to read disk health data.
      </p>
      <div className="hw-smartctl-install">
        <strong>Install on macOS:</strong>
        <code className="hw-smartctl-cmd">brew install smartmontools</code>
        <strong>Install on Linux:</strong>
        <code className="hw-smartctl-cmd">sudo apt install smartmontools</code>
        <strong>Install on Windows:</strong>
        <code className="hw-smartctl-cmd">winget install smartmontools</code>
      </div>
      <p className="hw-smartctl-note">
        After installing, restart System Optimizer to see disk health data.
      </p>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHealthColor(score: number): string {
  if (score >= 80) return '#22c55e';       // green
  if (score >= 60) return '#84cc16';       // lime
  if (score >= 40) return '#eab308';       // amber
  if (score >= 20) return '#f97316';       // orange
  return '#ef4444';                         // red
}

function getHealthLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Degraded';
  if (score >= 10) return 'Poor';
  return 'Critical';
}

function getTempStatus(temp: number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (temp > 70) return 'critical';
  if (temp > 55) return 'warning';
  if (temp > 0) return 'good';
  return 'neutral';
}

function getBatteryTempStatus(temp: number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (temp > 45) return 'critical';
  if (temp > 35) return 'warning';
  if (temp > 0) return 'good';
  return 'neutral';
}

function formatPowerOnHours(hours: number): string {
  if (hours === 0) return 'N/A';
  const days = Math.floor(hours / 24);
  const years = Math.floor(days / 365);
  const remainDays = days % 365;
  if (years > 0) return `${years}y ${remainDays}d`;
  if (days > 0) return `${days}d`;
  return `${hours}h`;
}

function formatRemainingTime(days: number): string {
  if (days > 365 * 2) return `~${Math.round(days / 365)} years remaining`;
  if (days > 365) return `~${Math.round(days / 30)} months remaining`;
  if (days > 60) return `~${Math.round(days / 30)} months remaining`;
  if (days > 1) return `~${days} days remaining`;
  return 'Imminent failure';
}
