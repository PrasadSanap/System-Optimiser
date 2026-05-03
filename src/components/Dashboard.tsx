import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import tauriApi from '../services/tauri';
import { formatBytes, formatPercent } from '../utils/format';

export function Dashboard() {
  const { systemMetrics, setSystemMetrics } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const metrics = await tauriApi.system.getMetrics();
      setSystemMetrics(metrics);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-red-100 dark:bg-red-900/20 rounded-lg max-w-md">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Error</p>
          <p className="text-foreground mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!systemMetrics) return null;

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="CPU Usage"
          value={formatPercent(systemMetrics.cpu.usage_percent)}
          subtitle={`${systemMetrics.cpu.cores} cores @ ${(systemMetrics.cpu.frequency_mhz / 1000).toFixed(2)} GHz`}
          percentage={systemMetrics.cpu.usage_percent}
          icon="🖥️"
        />

        <MetricCard
          title="Memory"
          value={formatPercent(systemMetrics.memory.usage_percent)}
          subtitle={`${formatBytes(systemMetrics.memory.used_bytes)} / ${formatBytes(systemMetrics.memory.total_bytes)}`}
          percentage={systemMetrics.memory.usage_percent}
          icon="💾"
        />

        <MetricCard
          title="Disk Space"
          value={formatPercent(systemMetrics.disk.usage_percent)}
          subtitle={`${formatBytes(systemMetrics.disk.used_bytes)} / ${formatBytes(systemMetrics.disk.total_bytes)}`}
          percentage={systemMetrics.disk.usage_percent}
          icon="💿"
        />

        <MetricCard
          title="Network"
          value={formatBytes(systemMetrics.network.bytes_sent + systemMetrics.network.bytes_received)}
          subtitle={`↑ ${formatBytes(systemMetrics.network.bytes_sent)} ↓ ${formatBytes(systemMetrics.network.bytes_received)}`}
          icon="🌐"
        />
      </div>

      {/* System Health Overview */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">System Health Overview</h2>
        <div className="space-y-4">
          <HealthItem
            label="CPU Performance"
            status={systemMetrics.cpu.usage_percent < 70 ? 'good' : systemMetrics.cpu.usage_percent < 90 ? 'warning' : 'critical'}
            value={formatPercent(systemMetrics.cpu.usage_percent)}
          />
          <HealthItem
            label="Memory Usage"
            status={systemMetrics.memory.usage_percent < 70 ? 'good' : systemMetrics.memory.usage_percent < 90 ? 'warning' : 'critical'}
            value={formatPercent(systemMetrics.memory.usage_percent)}
          />
          <HealthItem
            label="Disk Space"
            status={systemMetrics.disk.usage_percent < 70 ? 'good' : systemMetrics.disk.usage_percent < 90 ? 'warning' : 'critical'}
            value={formatPercent(systemMetrics.disk.usage_percent)}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionButton
            icon="🔍"
            label="Analyze System"
            description="Run full system analysis"
            onClick={() => console.log('Analyze')}
          />
          <ActionButton
            icon="🧹"
            label="Clean Temp Files"
            description="Free up disk space"
            onClick={() => console.log('Clean')}
          />
          <ActionButton
            icon="⚡"
            label="Optimize Now"
            description="Apply safe optimizations"
            onClick={() => console.log('Optimize')}
          />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  percentage?: number;
  icon: string;
}

function MetricCard({ title, value, subtitle, percentage, icon }: MetricCardProps) {
  const getColor = (pct?: number) => {
    if (!pct) return 'bg-blue-500';
    if (pct < 60) return 'bg-green-500';
    if (pct < 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{subtitle}</p>
      {percentage !== undefined && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface HealthItemProps {
  label: string;
  status: 'good' | 'warning' | 'critical';
  value: string;
}

function HealthItem({ label, status, value }: HealthItemProps) {
  const statusConfig = {
    good: { icon: '✓', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20' },
    warning: { icon: '⚠', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    critical: { icon: '✕', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center ${config.color} font-bold`}>
          {config.icon}
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-gray-600 dark:text-gray-400">{value}</span>
    </div>
  );
}

interface ActionButtonProps {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}

function ActionButton({ icon, label, description, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-background border border-border rounded-lg hover:border-primary transition-colors text-left"
    >
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold mb-1">{label}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  );
}

// Made with Bob
