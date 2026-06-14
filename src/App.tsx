import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import tauriApi from './services/tauri';
import { formatBytes } from './utils/format';
import { AISuggestions } from './components/AISuggestions';
import { HardwareHealth } from './components/HardwareHealth';
import { FocusModeSettingsModal } from './components/FocusModeSettingsModal';
import { MaintenanceSettingsModal } from './components/MaintenanceSettingsModal';
import DeepSleep from './components/DeepSleep';


function App() {
  const { 
    darkMode, toggleDarkMode, systemMetrics, setSystemMetrics, 
    focusModeStatus, setFocusModeStatus, focusModeSettings, setFocusModeSettings,
    maintenanceConfig, setMaintenanceConfig, maintenanceLogs, setMaintenanceLogs
  } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'ai' | 'deep_sleep' | 'boot' | 'optimizations' | 'performance' | 'settings'>('dashboard');
  const [currentView, setCurrentView] = useState<'dashboard' | 'ai' | 'hardware_health'>('dashboard');
  const [isFocusModeSettingsOpen, setIsFocusModeSettingsOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);

  useEffect(() => {
    // Fetch initial metrics
    fetchMetrics();
    fetchFocusModeState();
    fetchMaintenanceState();

    // Set up interval to fetch metrics every 5 seconds
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
      setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to fetch metrics'));
      setIsLoading(false);
    }
  };

  const fetchFocusModeState = async () => {
    try {
      const [status, settings] = await Promise.all([
        tauriApi.system.getFocusModeStatus(),
        tauriApi.system.getFocusModeSettings(),
      ]);
      setFocusModeStatus(status);
      setFocusModeSettings(settings);
    } catch (err) {
      console.error('Failed to fetch focus mode state:', err);
    }
  };

  const fetchMaintenanceState = async () => {
    try {
      const [config, logs] = await Promise.all([
        tauriApi.system.getMaintenanceConfig(),
        tauriApi.system.getMaintenanceLogs(),
      ]);
      setMaintenanceConfig(config);
      setMaintenanceLogs(logs);
    } catch (err) {
      console.error('Failed to fetch maintenance state:', err);
    }
  };

  const handleToggleFocusMode = async () => {
    if (!focusModeStatus) return;
    try {
      const newEnabledState = !focusModeStatus.is_enabled;
      await tauriApi.system.toggleFocusMode(newEnabledState);
      fetchFocusModeState();
    } catch (err) {
      console.error('Failed to toggle focus mode:', err);
      alert(
        "Focus Mode is not supported on this operating system. " +
        "Please check the documentation for alternatives."
      );
    }
  };

  const handleSaveFocusModeSettings = async (settings: any) => {
    try {
      await tauriApi.system.updateFocusModeSettings(settings);
      fetchFocusModeState();
      setIsFocusModeSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save focus mode settings:', err);
    }
  };

  const handleSaveMaintenanceConfig = async (config: any) => {
    try {
      await tauriApi.system.updateMaintenanceConfig(config);
      fetchMaintenanceState();
      setIsMaintenanceModalOpen(false);
    } catch (err) {
      console.error('Failed to save maintenance config:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-foreground">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-red-100 p-8 text-center dark:bg-red-900/20">
          <p className="mb-2 font-semibold text-red-600 dark:text-red-400">Error</p>
          <p className="text-foreground">{error}</p>
          <button
            onClick={fetchMetrics}
            className="bg-primary hover:bg-primary-hover mt-4 rounded px-4 py-2 text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Header */}
      <header className="border-border bg-card border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <span className="text-xl font-bold text-white">SO</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">System Optimizer</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-Powered Performance Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Navigation */}
            <nav className="flex space-x-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`rounded-lg px-4 py-2 transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setCurrentView('ai')}
                className={`rounded-lg px-4 py-2 transition-colors ${
                  currentView === 'ai'
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                🤖 AI Assistant
              </button>
              <button
                onClick={() => setCurrentView('deep_sleep')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'deep_sleep'
                onClick={() => setCurrentView('hardware_health')}
                className={`rounded-lg px-4 py-2 transition-colors ${
                  currentView === 'hardware_health'
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                ❄️ Deep Sleep
                🏥 Hardware Health
              </button>
            </nav>
            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {currentView === 'dashboard' && (
          <>
            <div className="mb-8 flex flex-col justify-between md:flex-row md:items-center">
              <div>
                <h2 className="mb-2 text-2xl font-bold">System Metrics</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Real-time monitoring of your system's performance
                </p>
              </div>
              <div className="mt-4 flex items-center space-x-4 md:mt-0">
                <button
                  onClick={handleToggleFocusMode}
                  className={`flex transform items-center space-x-2 rounded-full px-6 py-3 font-bold shadow-lg transition-all hover:scale-105 ${
                    focusModeStatus?.is_enabled
                      ? 'animate-pulse bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <span className="text-xl">🎮</span>
                  <span>
                    {focusModeStatus?.is_enabled ? 'Focus Mode Active' : 'Enable Focus Mode'}
                  </span>
                </button>
                <button
                  onClick={() => setIsFocusModeSettingsOpen(true)}
                  className="bg-card border-border rounded-full border p-3 shadow transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Focus Mode Settings"
                >
                  ⚙️
                </button>
              </div>
            </div>

            {systemMetrics && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* CPU Card */}
            <MetricCard
              title="CPU Usage"
              value={formatPercent(systemMetrics.cpu.usage_percent)}
              subtitle={`${systemMetrics.cpu.cores} cores @ ${(systemMetrics.cpu.frequency_mhz / 1000).toFixed(2)} GHz`}
              percentage={systemMetrics.cpu.usage_percent}
              icon="🖥️"
            />

            {/* Memory Card */}
            <MetricCard
              title="Memory"
              value={formatPercent(systemMetrics.memory.usage_percent)}
              subtitle={`${formatBytes(systemMetrics.memory.used_bytes)} / ${formatBytes(systemMetrics.memory.total_bytes)}`}
              percentage={systemMetrics.memory.usage_percent}
              icon="💾"
            />

            {/* Disk Card */}
            <MetricCard
              title="Disk Space"
              value={formatPercent(systemMetrics.disk.usage_percent)}
              subtitle={`${formatBytes(systemMetrics.disk.used_bytes)} / ${formatBytes(systemMetrics.disk.total_bytes)}`}
              percentage={systemMetrics.disk.usage_percent}
              icon="💿"
            />

            {/* Network Card */}
            <MetricCard
              title="Network"
              value={formatBytes(systemMetrics.network.bytes_sent + systemMetrics.network.bytes_received)}
              subtitle={`↑ ${formatBytes(systemMetrics.network.bytes_sent)} ↓ ${formatBytes(systemMetrics.network.bytes_received)}`}
              icon="🌐"
            />
          </div>
            )}

            {/* Coming Soon Section */}
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              <FeatureCard
                title="Startup Optimizer"
                description="Manage startup programs & speed up boot time"
                icon="🚀"
                status="Active"
                onClick={() => setCurrentView('boot')}
              />
              <FeatureCard
                title="AI Recommendation Engine"
                description="Get smart optimization suggestions"
                icon="🧠"
                status="Active"
                onClick={() => setCurrentView('ai')}
              />
              <FeatureCard
                title="Automated Maintenance"
                description="Configure silent background tasks"
                icon="🧹"
                status={maintenanceConfig?.enabled ? "Active" : "Disabled"}
                onClick={() => setIsMaintenanceModalOpen(true)}
              />
            </div>
          </>
        ) : currentView === 'hardware_health' ? (
          <HardwareHealth />
        ) : (
          <AISuggestions />
        )}
        {currentView === 'ai' && <AISuggestions />}
        {currentView === 'deep_sleep' && <DeepSleep />}
      </main>

      {/* Footer */}
      <footer className="border-border mt-12 border-t py-6">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>System Optimizer v1.0.0 - Built with Tauri + React</p>
        </div>
      </footer>

      {isFocusModeSettingsOpen && focusModeSettings && (
        <FocusModeSettingsModal
          initialSettings={focusModeSettings}
          onSave={handleSaveFocusModeSettings}
          onClose={() => setIsFocusModeSettingsOpen(false)}
        />
      )}

      {isMaintenanceModalOpen && maintenanceConfig && (
        <MaintenanceSettingsModal
          initialConfig={maintenanceConfig}
          logs={maintenanceLogs}
          onSave={handleSaveMaintenanceConfig}
          onClose={() => setIsMaintenanceModalOpen(false)}
        />
      )}
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
    <div className="bg-card border-border rounded-lg border p-6 transition-shadow hover:shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-3xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      {percentage !== undefined && (
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  status?: string;
  onClick?: () => void;
}

function FeatureCard({ title, description, icon, status, onClick }: FeatureCardProps) {
  return (
    <div 
      className={`bg-card border-border rounded-lg border p-6 ${onClick ? 'hover:border-primary cursor-pointer transition-shadow hover:shadow-lg' : 'opacity-60'}`}
      onClick={onClick}
    >
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {status && (
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-700'}`}>
          {status}
        </span>
      )}
    </div>
  );
}

export default App;

// Made with Bob
